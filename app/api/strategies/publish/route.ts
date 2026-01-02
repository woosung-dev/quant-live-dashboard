import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/strategies/publish
 * 전략을 마켓플레이스에 게시
 */
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { 
            strategy_id, 
            title, 
            description, 
            tags,
            is_premium = false,
            price = 0,
            strategy_config // 비주얼 빌더 설정
        } = body;

        if (!strategy_id || !title) {
            return NextResponse.json({ error: 'strategy_id and title are required' }, { status: 400 });
        }

        // 기존 전략 소유권 확인
        const { data: strategy, error: strategyError } = await supabase
            .from('strategies')
            .select('id, user_id, builder_config, code, type')
            .eq('id', strategy_id)
            .single();

        if (strategyError || !strategy) {
            return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
        }

        if (strategy.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized to publish this strategy' }, { status: 403 });
        }

        // public_strategies에 게시
        const { data, error } = await supabase
            .from('public_strategies')
            .upsert({
                strategy_id,
                user_id: user.id,
                title,
                description: description || '',
                tags: tags || [],
                is_premium: is_premium,
                price: is_premium ? price : 0,
                strategy_config: strategy_config || strategy.builder_config,
                code: strategy.code,
                type: strategy.type,
                published_at: new Date().toISOString()
            }, {
                onConflict: 'strategy_id'
            })
            .select()
            .single();

        if (error) throw error;

        // strategies 테이블의 is_public도 업데이트
        await supabase
            .from('strategies')
            .update({ is_public: true })
            .eq('id', strategy_id);

        return NextResponse.json({ published: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

/**
 * DELETE /api/strategies/publish
 * 게시 취소 (비공개로 전환)
 */
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const strategy_id = searchParams.get('strategy_id');

        if (!strategy_id) {
            return NextResponse.json({ error: 'strategy_id is required' }, { status: 400 });
        }

        // 소유권 확인 후 삭제
        const { error } = await supabase
            .from('public_strategies')
            .delete()
            .eq('strategy_id', strategy_id)
            .eq('user_id', user.id);

        if (error) throw error;

        // strategies 테이블의 is_public도 업데이트
        await supabase
            .from('strategies')
            .update({ is_public: false })
            .eq('id', strategy_id)
            .eq('user_id', user.id);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
