import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/strategies/[id]/comments
 * 전략 댓글 목록 조회
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get public_strategy_id
    const { data: publicStrategy, error: psError } = await supabase
        .from('public_strategies')
        .select('id')
        .eq('strategy_id', id)
        .single();

    if (psError || !publicStrategy) {
        return NextResponse.json({ error: 'Public strategy not found' }, { status: 404 });
    }

    const { data, error } = await supabase
        .from('strategy_comments')
        .select(`
            *,
            author:profiles!strategy_comments_user_id_fkey(id, full_name, email)
        `)
        .eq('public_strategy_id', publicStrategy.id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
}

/**
 * POST /api/strategies/[id]/comments
 * 댓글 작성
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
        const { content } = body;

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        // Get public_strategy_id
        const { data: publicStrategy, error: psError } = await supabase
            .from('public_strategies')
            .select('id')
            .eq('strategy_id', id)
            .single();

        if (psError || !publicStrategy) {
            return NextResponse.json({ error: 'Public strategy not found' }, { status: 404 });
        }

        // Insert comment
        const { data, error } = await supabase
            .from('strategy_comments')
            .insert({
                public_strategy_id: publicStrategy.id,
                user_id: user.id,
                content: content.trim()
            })
            .select(`
                *,
                author:profiles!strategy_comments_user_id_fkey(id, full_name, email)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ comment: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
