import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/strategies/public/[id]
 * 공개 전략 상세 조회
 * id: strategy_id (원본값)
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const supabase = await createClient();

    // 현재 사용자 확인 (구매 여부 체크용)
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const { data: strategy, error } = await supabase
            .from('public_strategies')
            .select(`
                *,
                author:profiles!public_strategies_user_id_fkey(id, full_name, email)
            `)
            .eq('strategy_id', id)
            .single();

        if (error || !strategy) {
            return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
        }

        // 구매 여부 확인
        let isPurchased = false;
        if (user) {
            if (strategy.user_id === user.id) {
                isPurchased = true; // Own strategy
            } else if (strategy.is_premium) {
                const { data: purchase } = await supabase
                    .from('strategy_purchases')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('public_strategy_id', strategy.id)
                    .single();
                
                if (purchase) isPurchased = true;
            } else {
                isPurchased = true; // Free strategy considered 'purchased/accessible'
            }
        }

        // Mask code and config if not purchased
        if (!isPurchased) {
            delete strategy.code;
            delete strategy.strategy_config; // Assuming this field exists and contains sensitive builder config
        }

        return NextResponse.json({ 
            strategy,
            isPurchased
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
