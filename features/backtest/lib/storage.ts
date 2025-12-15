
import { supabase } from "@/lib/supabase";
import { Strategy } from "@/types";

export interface StrategyDTO {
    id?: string;
    name: string;
    type: string;
    code: string;
    parameters: any;
}

/**
 * Save a strategy to Supabase
 */
export async function saveStrategy(strategy: StrategyDTO): Promise<{ id: string } | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User must be logged in to save strategies");

        const payload = {
            user_id: user.id,
            name: strategy.name,
            type: strategy.type,
            code: strategy.code,
            parameters: strategy.parameters,
            updated_at: new Date().toISOString()
        };

        if (strategy.id) {
            // Update existing
            const { data, error } = await supabase
                .from('strategies')
                .update(payload)
                .eq('id', strategy.id)
                .select('id')
                .single();

            if (error) throw error;
            return data;
        } else {
            // Create new
            const { data, error } = await supabase
                .from('strategies')
                .insert([payload])
                .select('id')
                .single();

            if (error) throw error;
            return data;
        }
    } catch (e) {
        console.error("Failed to save strategy:", e);
        return null;
    }
}

/**
 * Load user's strategies
 */
export async function getUserStrategies(): Promise<Strategy[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('strategies')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return data.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: `Saved strategy (${row.type})`,
            type: row.type,
            code: row.code,
            parameters: row.parameters, // Assuming parameters match definition structure is handled elsewhere or this is raw replacement
        })) as unknown as Strategy[]; // Partial cast, might need adapter
    } catch (e) {
        console.error("Failed to load strategies:", e);
        return [];
    }
}
