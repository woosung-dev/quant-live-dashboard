import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard
 * 전략 순위 목록 조회 (평점, 수익률 기준)
 */
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'rating'; // rating, profit, trades
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        // 평균 평점 계산을 위한 서브쿼리
        const { data, error } = await supabase
            .from('public_strategies')
            .select(`
                id,
                strategy_id,
                name,
                description,
                author:profiles!public_strategies_user_id_fkey(id, full_name, email),
                performance_win_rate,
                performance_mdd,
                performance_cagr,
                performance_profit_factor,
                performance_trades,
                download_count,
                created_at,
                ratings:strategy_ratings(rating)
            `)
            .limit(limit);

        if (error) throw error;

        // 평균 평점 계산 및 정렬
        const ranked = (data || []).map(s => {
            const ratings = s.ratings || [];
            const avgRating = ratings.length > 0 
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
                : 0;
            return {
                ...s,
                avgRating: Math.round(avgRating * 10) / 10,
                ratingCount: ratings.length,
                ratings: undefined // 상세 데이터 제거
            };
        });

        // 정렬
        if (sortBy === 'rating') {
            ranked.sort((a, b) => b.avgRating - a.avgRating);
        } else if (sortBy === 'profit') {
            ranked.sort((a, b) => (b.performance_cagr || 0) - (a.performance_cagr || 0));
        } else if (sortBy === 'trades') {
            ranked.sort((a, b) => (b.performance_trades || 0) - (a.performance_trades || 0));
        } else if (sortBy === 'downloads') {
            ranked.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
        }

        return NextResponse.json({ strategies: ranked });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
