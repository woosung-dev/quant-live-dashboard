import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/strategies/[id]/publish
 * 전략을 마켓플레이스에 공개
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
        const { title, description, tags } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Verify strategy ownership
        const { data: strategy, error: strategyError } = await supabase
            .from('strategies')
            .select('id, user_id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (strategyError || !strategy) {
            return NextResponse.json({ error: 'Strategy not found or unauthorized' }, { status: 404 });
        }

        // Check if already published
        const { data: existing } = await supabase
            .from('public_strategies')
            .select('id')
            .eq('strategy_id', id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Strategy already published' }, { status: 409 });
        }

        // Publish strategy
        const { data, error } = await supabase
            .from('public_strategies')
            .insert({
                strategy_id: id,
                user_id: user.id,
                title,
                description: description || '',
                tags: tags || []
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ publicStrategy: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

/**
 * DELETE /api/strategies/[id]/publish
 * 공개된 전략을 비공개로 전환
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
        .from('public_strategies')
        .delete()
        .eq('strategy_id', id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
