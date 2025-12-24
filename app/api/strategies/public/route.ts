import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/strategies/public
 * 공개 전략 목록 조회
 * Query params: sort (rating|downloads|latest), tags, limit, offset
 */
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;

    const sort = searchParams.get('sort') || 'rating'; // rating, downloads, latest
    const tags = searchParams.get('tags'); // comma-separated
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query - removed author join to avoid FK error
    let query = supabase
        .from('public_strategies')
        .select(`
            *,
            strategy:strategies(id, name, type, code, parameters)
        `, { count: 'exact' });

    // Tag filtering
    if (tags) {
        const tagArray = tags.split(',').map(t => t.trim());
        query = query.contains('tags', tagArray);
    }

    // Sorting
    if (sort === 'downloads') {
        query = query.order('downloads', { ascending: false });
    } else if (sort === 'latest') {
        query = query.order('published_at', { ascending: false });
    } else {
        // Default: rating
        query = query.order('avg_rating', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error('[API] public_strategies query error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch author profiles separately
    if (data && data.length > 0) {
        const userIds = [...new Set(data.map(item => item.user_id))];

        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

        if (profileError) {
            console.error('[API] Error fetching profiles:', profileError);
        }

        console.log('[API] Fetched profiles:', profiles);

        // Create a map for quick lookup
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Attach author info to each strategy with fallback
        data.forEach(item => {
            const profile = profileMap.get(item.user_id);
            item.author = profile ? {
                id: profile.id,
                full_name: profile.full_name || 'Unknown User',
                email: profile.email || ''
            } : {
                id: item.user_id,
                full_name: 'Unknown User',
                email: ''
            };
        });
    }

    return NextResponse.json({
        strategies: data || [],
        total: count || 0,
        limit,
        offset
    });
}
