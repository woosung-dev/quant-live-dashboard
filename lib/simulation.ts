import { SimulationResult } from '@/types';

type StrategyType = 'SMA_CROSS' | 'RSI';

interface StrategyParams {
    fast?: number;
    slow?: number;
    rsiPeriod?: number;
    rsiOverbought?: number;
    rsiOversold?: number;
}

export function calculateSimulation(
    prices: number[],
    fastPeriod: number = 9,
    slowPeriod: number = 21
): SimulationResult {
    // Backward compatibility wrapper
    return runBacktest(prices, 'SMA_CROSS', { fast: fastPeriod, slow: slowPeriod });
}

export function runBacktest(
    prices: number[],
    type: StrategyType,
    params: StrategyParams
): SimulationResult {
    switch (type) {
        case 'SMA_CROSS':
            return runSmaCross(prices, params.fast || 9, params.slow || 21);
        case 'RSI':
            return runRsiStrategy(prices, params.rsiPeriod || 14, params.rsiOverbought || 70, params.rsiOversold || 30);
        default:
            return { totalPnL: 0, winRate: 0, trades: 0, equityCurve: [] };
    }
}

function runSmaCross(prices: number[], fastPeriod: number, slowPeriod: number): SimulationResult {
    let balance = 10000;
    let position = 0; // 0: None, 1: Long, -1: Short
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    const equityCurve = [];

    if (prices.length < slowPeriod) {
        return { totalPnL: 0, winRate: 0, trades: 0, equityCurve: [] };
    }

    for (let i = slowPeriod; i < prices.length; i++) {
        const currentPrice = prices[i];

        const fastSMA = calculateSMA(prices.slice(i - fastPeriod, i), fastPeriod);
        const slowSMA = calculateSMA(prices.slice(i - slowPeriod, i), slowPeriod);
        const prevFastSMA = calculateSMA(prices.slice(i - fastPeriod - 1, i - 1), fastPeriod);
        const prevSlowSMA = calculateSMA(prices.slice(i - slowPeriod - 1, i - 1), slowPeriod);

        // Golden Cross (Buy)
        if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) {
            if (position === -1) {
                const pnl = (entryPrice - currentPrice) / entryPrice * balance;
                balance += pnl;
                if (pnl > 0) wins++;
                trades++;
            }
            position = 1;
            entryPrice = currentPrice;
        }
        // Death Cross (Sell)
        else if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) {
            if (position === 1) {
                const pnl = (currentPrice - entryPrice) / entryPrice * balance;
                balance += pnl;
                if (pnl > 0) wins++;
                trades++;
            }
            position = -1;
            entryPrice = currentPrice;
        }

        equityCurve.push({ time: i, value: balance });
    }

    return {
        totalPnL: (balance - 10000) / 10000 * 100,
        winRate: trades > 0 ? (wins / trades) * 100 : 0,
        trades,
        equityCurve
    };
}

function runRsiStrategy(prices: number[], period: number, overbought: number, oversold: number): SimulationResult {
    // Placeholder for RSI logic
    // For now, return empty result or implement basic RSI
    return { totalPnL: 0, winRate: 0, trades: 0, equityCurve: [] };
}

function calculateSMA(data: number[], period: number): number {
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / period;
}
