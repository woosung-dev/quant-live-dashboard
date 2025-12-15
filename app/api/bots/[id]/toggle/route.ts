import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Next.js 15+ async params
) {
    const { id } = await context.params;
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get current status
    const { data: bot, error: fetchError } = await supabase
        .from('bot_instances')
        .select('status')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (fetchError || !bot) {
        return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // 3. Toggle
    const newStatus = bot.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    const { error: updateError } = await supabase
        .from('bot_instances')
        .update({ status: newStatus })
        .eq('id', id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: newStatus });
}
