import { supabase } from "@/lib/supabase";
import { Strategy } from "@/features/backtest/types";

/**
 * Fetch public strategies for the Explorer feed
 */
export async function getPublicStrategies(
    sortBy: 'popular' | 'recent' | 'return' = 'recent',
    limit: number = 20
): Promise<Strategy[]> {
    try {
        let query = supabase
            .from('strategies')
            .select(`
                *,
                author:user_id (email)
            `)
            .eq('is_public', true);

        // Sorting logic
        switch (sortBy) {
            case 'popular':
                query = query.order('like_count', { ascending: false });
                break;
            case 'return':
                query = query.order('performance_cagr', { ascending: false }); // Requires the column we added
                break;
            case 'recent':
            default:
                query = query.order('created_at', { ascending: false });
                break;
        }

        const { data, error } = await query.limit(limit);

        if (error) throw error;

        // Map DB rows to Strategy type
        return data.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description || `Public strategy (${row.type})`,
            type: row.type,
            code: row.code,
            parameters: row.parameters,
            authorId: row.user_id,
            authorName: row.author?.email?.split('@')[0] || 'Anonymous', // Simple display name from email
            isPublic: row.is_public,
            tags: row.tags || [],
            forkCount: row.fork_count || 0,
            likeCount: row.like_count || 0,
            createdAt: row.created_at,
            performance: {
                cagr: row.performance_cagr || 0,
                mdd: row.performance_mdd || 0,
                winRate: row.performance_win_rate || 0,
                totalTrades: row.performance_trades || 0
            }
        })) as Strategy[];

    } catch (e) {
        console.error("Failed to fetch public strategies:", e);
        return [];
    }
}

/**
 * Fork (Clone) a strategy
 */
export async function forkStrategy(strategyId: string): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to fork");

        // 1. Fetch original
        const { data: original, error: fetchError } = await supabase
            .from('strategies')
            .select('*')
            .eq('id', strategyId)
            .single();

        if (fetchError || !original) throw new Error("Strategy not found");

        // 2. Insert copy
        const { data: newStrategy, error: insertError } = await supabase
            .from('strategies')
            .insert([{
                user_id: user.id,
                name: `${original.name} (Forked)`,
                description: `Forked from ${original.id}.\n${original.description || ''}`,
                type: original.type,
                code: original.code,
                parameters: original.parameters,
                tags: original.tags,
                parent_strategy_id: original.id,
                is_public: false, // Default to private
                // Don't copy performance stats as it's a new instance content-wise
            }])
            .select('id')
            .single();

        if (insertError) throw insertError;

        // 3. Increment fork count on original (Fire and forget, or await)
        await supabase.rpc('increment_fork_count', { row_id: strategyId });

        return newStrategy.id;

    } catch (e) {
        console.error("Fork failed:", e);
        return null;
    }
}

/**
 * Toggle Like
 */
export async function toggleLike(strategyId: string): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Check if Liked
        const { data: existingLike } = await supabase
            .from('strategy_likes')
            .select('*')
            .eq('user_id', user.id)
            .eq('strategy_id', strategyId)
            .single();

        if (existingLike) {
            // Unlike
            await supabase.from('strategy_likes').delete().eq('user_id', user.id).eq('strategy_id', strategyId);
            await supabase.rpc('decrement_like_count', { row_id: strategyId });
            return false;
        } else {
            // Like
            await supabase.from('strategy_likes').insert([{ user_id: user.id, strategy_id: strategyId }]);
            await supabase.rpc('increment_like_count', { row_id: strategyId });
            return true;
        }
    } catch (e) {
        console.error("Like failed:", e);
        return false;
    }
}

/**
 * Update strategy visibility and details
 */
export async function updateStrategyVisibility(
    id: string,
    isPublic: boolean,
    description: string,
    tags: string[]
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('strategies')
            .update({
                is_public: isPublic,
                description: description,
                tags: tags,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Failed to update visibility:", e);
        return false;
    }
}
