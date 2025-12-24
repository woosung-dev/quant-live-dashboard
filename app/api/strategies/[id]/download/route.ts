import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/strategies/[id]/download
 * 다운로드 카운트 증가
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const supabase = await createClient();

    try {
        // Get public_strategy_id
        const { data: publicStrategy, error: psError } = await supabase
            .from('public_strategies')
            .select('id, downloads')
            .eq('strategy_id', id)
            .single();

        if (psError || !publicStrategy) {
            return NextResponse.json({ error: 'Public strategy not found' }, { status: 404 });
        }

        // Increment downloads
        const { error } = await supabase
            .from('public_strategies')
            .update({ downloads: publicStrategy.downloads + 1 })
            .eq('id', publicStrategy.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
