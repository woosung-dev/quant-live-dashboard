import { TradeData, SimulationResult } from '@/types';

// Simple Moving Average Strategy Simulation
export function calculateSimulation(
    prices: number[],
    fastPeriod: number = 9,
    slowPeriod: number = 21
): SimulationResult {
    let balance = 10000; // Initial Capital
    let position = 0; // 0: None, 1: Long, -1: Short
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    const equityCurve = [];

    // Need enough data to calculate SMA
    if (prices.length < slowPeriod) {
        return { totalPnL: 0, winRate: 0, trades: 0, equityCurve: [] };
    }

    for (let i = slowPeriod; i < prices.length; i++) {
        const currentPrice = prices[i];

        // Calculate SMAs
        const fastSMA = calculateSMA(prices.slice(i - fastPeriod, i), fastPeriod);
        const slowSMA = calculateSMA(prices.slice(i - slowPeriod, i), slowPeriod);
        const prevFastSMA = calculateSMA(prices.slice(i - fastPeriod - 1, i - 1), fastPeriod);
        const prevSlowSMA = calculateSMA(prices.slice(i - slowPeriod - 1, i - 1), slowPeriod);

        // Crossover Logic
        if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) {
            // Golden Cross (Buy)
            if (position === -1) {
                // Close Short
                const pnl = (entryPrice - currentPrice) / entryPrice * balance;
                balance += pnl;
                if (pnl > 0) wins++;
                trades++;
            }
            position = 1;
            entryPrice = currentPrice;
        } else if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) {
            // Death Cross (Sell)
            if (position === 1) {
                // Close Long
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

function calculateSMA(data: number[], period: number): number {
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / period;
}
