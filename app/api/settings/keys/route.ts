import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ServerSecurity } from '@/lib/security/server';

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { exchange, apiKey, secret } = body;

        if (!exchange || !apiKey || !secret) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // 2. Encrypt
        const encryptedKey = ServerSecurity.encrypt(apiKey);
        const encryptedSecret = ServerSecurity.encrypt(secret);

        // 3. Upsert to DB
        // Note: IVs might be different for key and secret. Schema has one `iv` column.
        // Uh oh. The schema `iv TEXT NOT NULL` implies one IV per row.
        // But I encrypt key and secret separately.
        // Sol 1: Store IVs with the value "iv:ciphertext" (similar to tag).
        // Sol 2: Use same IV? NO. Never reuse IV with same Key.
        // Sol 3: Create `iv_key` and `iv_secret` columns? The schema has only `iv`.

        // Let's adapt to Sol 1: Store IV + Tag + Ciphertext in the `encrypted` column.
        // And ignore the `iv` column? Or use `iv` column for one and stick the other inside?
        // Actually, the `iv` column in schema might be a mistake if I need two IVs.

        // Let's re-read the schema I just applied.
        // api_key_encrypted TEXT, secret_encrypted TEXT, iv TEXT.
        // This implies intended usage: One IV per row?
        // With GCM, IV uniqueness is critical.
        // If I use the same IV for key and secret (both encrypted with same Master Key), is it bad?
        // Yes, "IV reuse with same key is catastrophic in GCM".

        // So I MUST produce different IVs.
        // Strategy: Store the full pack (iv:tag:ciphertext) in the text column.
        // And maybe leave `iv` column null or store a dummy/primary one?
        // Or... I can fix the schema to have `iv_key` and `iv_secret`.
        // Since I just created it, I can ALTER it or just use the text column to hold everything.
        // Storing everything in the text column is cleaner for flexibility.

        // REVISED ENCRYPTION FORMAT in `ServerSecurity`:
        // Return string "iv:tag:ciphertext"
        // Update DB Schema to remove specific `iv` column? Or just ignore it for now?
        // I'll make the `iv` column store the IV of the *apiKey* just to satisfy "NOT NULL",
        // but `ServerSecurity` logic handles proper packaging.

        // Actually, let's just update `ServerSecurity` to handle single blob.
        // But wait, the previous tool wrote ServerSecurity to return { encrypted: "enc:tag", iv: "..." }.

        // Let's adjust `ServerSecurity` to return a self-contained string if possible, OR
        // stick to the schema I made.
        // Schema: `api_key_encrypted`, `secret_encrypted`, `iv`.
        // If I strictly follow schema:
        // I can generate ONE IV, use it for apiKey.
        // Generate ANOTHER IV for secret? But where to store?
        // Store `secret_encrypted` as "iv:tag:ciphertext".
        // Store `api_key_encrypted` as "tag:ciphertext" (using the row's IV).

        // This is getting messy. Cleanest is:
        // `api_key_encrypted` stores "iv:tag:ciphertext"
        // `secret_encrypted` stores "iv:tag:ciphertext"
        // `iv` column is redundant or can be removed.

        // Current constraint: `iv` col is NOT NULL.
        // I will fill `iv` with "unused" or the IV of the apiKey.

        // Let's proceed with storing self-contained tokens.

        const keyPackage = ServerSecurity.encrypt(apiKey); // returns { encrypted: "enc:tag", iv }
        const secretPackage = ServerSecurity.encrypt(secret);

        // Construct self-contained strings?
        // Let's store:
        // api_key_encrypted = keyPackage.iv + ':' + keyPackage.encrypted
        // secret_encrypted = secretPackage.iv + ':' + secretPackage.encrypted
        // iv = "bundled" (just to satisfy existing schema, or use one of them)

        // Wait, I can't easily change schema right now without another migration.
        // I'll satisfy the schema by putting the apiKey's IV in `iv` column
        // And for secret, I'll prepend the IV to the ciphertext.
        // Ideally I'd fix the schema but "bundled" is fine.

        const apiKeyFinal = `${keyPackage.iv}:${keyPackage.encrypted}`; // iv:enc:tag
        const secretFinal = `${secretPackage.iv}:${secretPackage.encrypted}`; // iv:enc:tag

        const { error } = await supabase
            .from('api_keys')
            .upsert({
                user_id: user.id,
                exchange,
                api_key_encrypted: apiKeyFinal,
                secret_encrypted: secretFinal,
                iv: 'bundled' // Placeholder value, as actual IVs are inside the Text
            }, { onConflict: 'user_id, exchange' });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('api_keys')
        .select('exchange')
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        keys: data?.map(row => ({ exchange: row.exchange, configured: true })) || []
    });
}

export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const exchange = searchParams.get('exchange');

    if (!exchange) return NextResponse.json({ error: 'Exchange required' }, { status: 400 });

    const { error } = await supabase
        .from('api_keys')
        .delete()
        .match({ user_id: user.id, exchange });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
