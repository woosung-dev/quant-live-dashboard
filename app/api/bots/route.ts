import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Join with bot_state to get performance info
    // Supabase join syntax: select(*, bot_state(*))
    const { data, error } = await supabase
        .from('bot_instances')
        .select(`
            *,
            strategy:strategies(name),
            bot_state(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bots: data });
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { strategyId, config, name } = body;

        if (!strategyId || !config) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('bot_instances')
            .insert({
                user_id: user.id,
                strategy_id: strategyId,
                config,
                name: name || 'Cloud Bot',
                status: 'PAUSED'
            })
            .select()
            .single();

        if (error) throw error;

        // Initialize state
        await supabase.from('bot_state').insert({
            bot_id: data.id,
            position: 'NONE',
            pnl: 0
        });

        return NextResponse.json({ bot: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
