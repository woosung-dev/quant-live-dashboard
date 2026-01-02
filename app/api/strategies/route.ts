import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/strategies
 * 현재 사용자의 전략 목록 조회
 */
export async function GET(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ strategies: data || [] });
}

/**
 * POST /api/strategies
 * 새 전략 생성
 */
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, description, type, code, builder_config, parameters } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('strategies')
            .insert({
                user_id: user.id,
                name,
                description: description || '',
                type: type || 'CUSTOM',
                code: code || '',
                builder_config,
                parameters: parameters || {}
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ strategy: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
