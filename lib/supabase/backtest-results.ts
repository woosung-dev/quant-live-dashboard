/**
 * Backtest Results Storage
 * Functions to save and retrieve backtest results from Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Types
export interface BacktestResultData {
    userId?: string;
    strategyName: string;
    strategyCode?: string;
    symbol: string;
    timeframe: string;
    startDate: Date;
    endDate: Date;
    initialCapital: number;
    metrics: {
        netProfit: number;
        netProfitPercent: number;
        totalTrades: number;
        winningTrades: number;
        losingTrades: number;
        winRate: number;
        profitFactor: number;
        maxDrawdown: number;
        maxDrawdownPercent: number;
        sharpeRatio?: number;
        averageWin?: number;
        averageLoss?: number;
    };
    trades: Array<{
        entryTime: number;
        exitTime: number;
        type: 'long' | 'short';
        entryPrice: number;
        exitPrice: number;
        pnl: number;
        pnlPercent: number;
    }>;
}

export interface SavedBacktestResult extends BacktestResultData {
    id: string;
    createdAt: Date;
}

/**
 * Save a backtest result to Supabase
 */
export async function saveBacktestResult(
    supabase: ReturnType<typeof createClient>,
    data: BacktestResultData
): Promise<{ id: string } | { error: string }> {
    try {
        const { data: result, error } = await supabase
            .from('backtest_results')
            .insert({
                user_id: data.userId,
                strategy_name: data.strategyName,
                strategy_code: data.strategyCode,
                symbol: data.symbol,
                timeframe: data.timeframe,
                start_date: data.startDate.toISOString(),
                end_date: data.endDate.toISOString(),
                initial_capital: data.initialCapital,
                metrics: data.metrics,
                trades: data.trades,
            } as any)
            .select('id')
            .single();

        if (error) {
            console.error('[BacktestStorage] Save error:', error);
            return { error: error.message };
        }

        return { id: (result as any).id };
    } catch (e) {
        console.error('[BacktestStorage] Unexpected error:', e);
        return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

/**
 * Get backtest history for a user
 */
export async function getBacktestHistory(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    options?: {
        limit?: number;
        offset?: number;
        symbol?: string;
        strategyName?: string;
    }
): Promise<SavedBacktestResult[] | { error: string }> {
    try {
        let query = supabase
            .from('backtest_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (options?.symbol) {
            query = query.eq('symbol', options.symbol);
        }
        if (options?.strategyName) {
            query = query.eq('strategy_name', options.strategyName);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[BacktestStorage] Fetch error:', error);
            return { error: error.message };
        }

        return data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            strategyName: row.strategy_name,
            strategyCode: row.strategy_code,
            symbol: row.symbol,
            timeframe: row.timeframe,
            startDate: new Date(row.start_date),
            endDate: new Date(row.end_date),
            initialCapital: row.initial_capital,
            metrics: row.metrics,
            trades: row.trades,
            createdAt: new Date(row.created_at),
        }));
    } catch (e) {
        console.error('[BacktestStorage] Unexpected error:', e);
        return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

/**
 * Get a single backtest result by ID
 */
export async function getBacktestResult(
    supabase: ReturnType<typeof createClient>,
    id: string
): Promise<SavedBacktestResult | { error: string }> {
    try {
        const { data, error } = await supabase
            .from('backtest_results')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return { error: error.message };
        }

        return {
            id: (data as any).id,
            userId: (data as any).user_id,
            strategyName: (data as any).strategy_name,
            strategyCode: (data as any).strategy_code,
            symbol: (data as any).symbol,
            timeframe: (data as any).timeframe,
            startDate: new Date((data as any).start_date),
            endDate: new Date((data as any).end_date),
            initialCapital: (data as any).initial_capital,
            metrics: (data as any).metrics,
            trades: (data as any).trades,
            createdAt: new Date((data as any).created_at),
        };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

/**
 * Delete a backtest result
 */
export async function deleteBacktestResult(
    supabase: ReturnType<typeof createClient>,
    id: string,
    userId: string
): Promise<{ success: boolean } | { error: string }> {
    try {
        const { error } = await supabase
            .from('backtest_results')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            return { error: error.message };
        }

        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
}
