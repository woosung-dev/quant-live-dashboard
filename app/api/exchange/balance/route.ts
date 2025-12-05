import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch API Keys
    const { data: keys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .ilike('exchange', 'Binance') // Case insensitive check
        .single();

    if (!keys) {
        return NextResponse.json({ balances: [] });
    }

    // Call Binance API
    const apiKey = keys.api_key;
    const apiSecret = keys.api_secret;
    const baseUrl = 'https://api.binance.com';
    const endpoint = '/api/v3/account';
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;

    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');

    try {
        const res = await fetch(`${baseUrl}${endpoint}?${queryString}&signature=${signature}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('Binance API Error:', error);
            return NextResponse.json({ error: error.msg || 'Binance API Error' }, { status: res.status });
        }

        const data = await res.json();
        // Filter non-zero balances and map to simpler format
        const balances = data.balances
            .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
            .map((b: any) => ({
                asset: b.asset,
                free: parseFloat(b.free),
                locked: parseFloat(b.locked),
                total: parseFloat(b.free) + parseFloat(b.locked)
            }));

        return NextResponse.json({ balances });
    } catch (e) {
        console.error('Internal Server Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
