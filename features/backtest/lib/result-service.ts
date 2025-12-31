/**
 * 백테스트 결과 저장/조회 서비스
 */

import { BacktestResult } from '../types';

// DB에 저장된 백테스트 결과 타입
export interface SavedBacktestResult {
  id: string;
  user_id: string;
  strategy_name: string;
  strategy_code: string | null;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  metrics: Record<string, unknown>;
  trades: unknown[];
  created_at: string;
  updated_at: string;
}

// 저장 요청 타입
export interface SaveBacktestRequest {
  strategyName: string;
  strategyCode?: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  metrics: Record<string, unknown>;
  trades: unknown[];
}

// 목록 응답 타입
export interface BacktestResultsResponse {
  results: SavedBacktestResult[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * 백테스트 결과 저장
 */
export async function saveBacktestResult(result: BacktestResult): Promise<SavedBacktestResult | null> {
  try {
    const startDate = result.candles.length > 0
      ? new Date(result.candles[0].time * 1000).toISOString()
      : new Date().toISOString();
    
    const endDate = result.candles.length > 0
      ? new Date(result.candles[result.candles.length - 1].time * 1000).toISOString()
      : new Date().toISOString();

    const payload: SaveBacktestRequest = {
      strategyName: result.strategy.name,
      strategyCode: result.strategy.code,
      symbol: result.config.symbol,
      timeframe: result.config.timeframe,
      startDate,
      endDate,
      initialCapital: result.config.initialCapital,
      metrics: result.metrics as unknown as Record<string, unknown>,
      trades: result.trades,
    };

    const response = await fetch('/api/backtest-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to save backtest result:', error);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error saving backtest result:', error);
    return null;
  }
}

/**
 * 백테스트 결과 목록 조회
 */
export async function getBacktestResults(options?: {
  limit?: number;
  offset?: number;
  symbol?: string;
  strategyName?: string;
}): Promise<BacktestResultsResponse | null> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.symbol) params.set('symbol', options.symbol);
    if (options?.strategyName) params.set('strategyName', options.strategyName);

    const response = await fetch(`/api/backtest-results?${params.toString()}`);

    if (!response.ok) {
      console.error('Failed to fetch backtest results');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching backtest results:', error);
    return null;
  }
}

/**
 * 특정 백테스트 결과 조회
 */
export async function getBacktestResultById(id: string): Promise<SavedBacktestResult | null> {
  try {
    const response = await fetch(`/api/backtest-results/${id}`);

    if (!response.ok) {
      console.error('Failed to fetch backtest result');
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error fetching backtest result:', error);
    return null;
  }
}

/**
 * 백테스트 결과 삭제
 */
export async function deleteBacktestResult(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/backtest-results/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.error('Failed to delete backtest result');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting backtest result:', error);
    return false;
  }
}
