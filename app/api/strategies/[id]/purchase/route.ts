import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/strategies/[id]/purchase
 * 유료 전략 구매 (Mock)
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params; // strategy_id
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Find public strategy
        const { data: publicStrategy, error: psError } = await supabase
            .from('public_strategies')
            .select('id, price, is_premium, title')
            .eq('strategy_id', id)
            .single();

        if (psError || !publicStrategy) {
            return NextResponse.json({ error: 'Public strategy not found' }, { status: 404 });
        }

        if (!publicStrategy.is_premium) {
            return NextResponse.json({ error: 'This strategy is free' }, { status: 400 });
        }

        // 2. Check if already purchased
        const { data: existing } = await supabase
            .from('strategy_purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('public_strategy_id', publicStrategy.id)
            .single();

        if (existing) {
            return NextResponse.json({ message: 'Already purchased', purchase: existing });
        }

        // 3. Process Payment (Mock)
        // TODO: Integrate Stripe/Toss here
        console.log(`[Mock Payment] User ${user.id} paid ${publicStrategy.price} for strategy ${publicStrategy.id}`);

        // 4. Record Purchase
        const { data, error } = await supabase
            .from('strategy_purchases')
            .insert({
                user_id: user.id,
                public_strategy_id: publicStrategy.id,
                amount: publicStrategy.price
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, purchase: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
