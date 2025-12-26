import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ServerBotRunner } from '@/features/trade/lib/server/bot-runner';

// Route Segment Config: Prevent static analysis during build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
    // 1. Authenticate Cron
    // Vercel Cron requests have a specific header usually.
    // For MVP, checking for a CRON_SECRET or just open (if strictly internal)
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    console.log('Cron Tick Started');

    try {
        const supabase = createAdminClient();
        const runner = new ServerBotRunner();

        // 2. Fetch Active Bots
        const { data: bots, error } = await supabase
            .from('bot_instances')
            .select('*')
            .eq('status', 'ACTIVE');

        if (error) {
            console.error('Failed to fetch bots:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`Found ${bots?.length || 0} active bots`);

        if (!bots || bots.length === 0) {
            return NextResponse.json({ message: 'No active bots' });
        }

        // 3. Run Validation/Execution for each bot
        const results = await Promise.allSettled(bots.map(async (bot: any) => {
            // Fetch state
            const { data: state } = await supabase
                .from('bot_state')
                .select('*')
                .eq('bot_id', bot.id)
                .single();

            // Execute
            await runner.executeTick(bot, state);
            return bot.id;
        }));

        return NextResponse.json({
            success: true,
            results: results.map((r: any) => r.status)
        });

    } catch (e: any) {
        console.error('Cron Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
