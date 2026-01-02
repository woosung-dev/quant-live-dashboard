import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/strategies/[id]/fork
 * 전략 복사 (Fork)
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params; // strategy_id (original)
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Find public strategy
        const { data: publicStrategy, error: psError } = await supabase
            .from('public_strategies')
            .select('*')
            .eq('strategy_id', id)
            .single();

        if (psError || !publicStrategy) {
            return NextResponse.json({ error: 'Public strategy not found' }, { status: 404 });
        }

        // 2. Check Permissions (If Premium)
        if (publicStrategy.is_premium) {
            // Check ownership (self-fork is free)
            if (publicStrategy.user_id !== user.id) {
                const { data: purchase } = await supabase
                    .from('strategy_purchases')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('public_strategy_id', publicStrategy.id)
                    .single();
                
                if (!purchase) {
                    return NextResponse.json({ error: 'Purchase required' }, { status: 403 });
                }
            }
        }

        // 3. Create Copy in strategies
        const { data: newStrategy, error: insertError } = await supabase
            .from('strategies')
            .insert({
                user_id: user.id,
                name: `${publicStrategy.title} (Forked)`,
                description: publicStrategy.description,
                type: publicStrategy.type || 'CUSTOM',
                code: publicStrategy.code || '',
                builder_config: publicStrategy.strategy_config, // Map jsonb
                parent_strategy_id: publicStrategy.strategy_id, // Link to original
                is_public: false
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 4. Increment Download Count
        await supabase.rpc('increment_downloads', { strategy_id_input: id });
        // RPC 없으면 직접 update (concurrency 이슈 있지만 MVP 수준허용)
        // 안전하게: 
        const { error: updateError } = await supabase
            .from('public_strategies')
            .update({ downloads: (publicStrategy.downloads || 0) + 1 })
            .eq('id', publicStrategy.id);

        return NextResponse.json({ success: true, strategy: newStrategy });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
