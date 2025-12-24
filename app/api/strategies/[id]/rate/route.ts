import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/strategies/[id]/rate
 * 전략에 평점 등록/수정
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { rating } = body;

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
        }

        // Get public_strategy_id from strategy_id
        const { data: publicStrategy, error: psError } = await supabase
            .from('public_strategies')
            .select('id')
            .eq('strategy_id', id)
            .single();

        if (psError || !publicStrategy) {
            return NextResponse.json({ error: 'Public strategy not found' }, { status: 404 });
        }

        // Upsert rating
        const { data, error } = await supabase
            .from('strategy_ratings')
            .upsert({
                public_strategy_id: publicStrategy.id,
                user_id: user.id,
                rating
            }, {
                onConflict: 'public_strategy_id,user_id'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ rating: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

/**
 * GET /api/strategies/[id]/rate
 * 현재 사용자의 평점 조회
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ rating: null });
    }

    // Get public_strategy_id
    const { data: publicStrategy } = await supabase
        .from('public_strategies')
        .select('id')
        .eq('strategy_id', id)
        .single();

    if (!publicStrategy) {
        return NextResponse.json({ rating: null });
    }

    const { data } = await supabase
        .from('strategy_ratings')
        .select('rating')
        .eq('public_strategy_id', publicStrategy.id)
        .eq('user_id', user.id)
        .single();

    return NextResponse.json({ rating: data?.rating || null });
}
