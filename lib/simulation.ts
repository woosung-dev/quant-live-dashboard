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


export function runCustomStrategy(prices: number[], code: string): SimulationResult {
    let balance = 10000;
    let position = 0; // 0: None, 1: Long, -1: Short
    let entryPrice = 0;
    let trades = 0;
    let wins = 0;
    const equityCurve = [];

    // Create the strategy function from the code string
    // The user code should define a function named 'strategy' or return a value directly
    // For MVP, we assume the user writes a function body that has access to 'prices', 'index', 'balance', 'position'
    // and returns 'BUY', 'SELL', or nothing.

    // Example user code:
    // const fast = 9;
    // const slow = 21;
    // if (prices.length < slow) return;
    // const fastMA = prices.slice(-fast).reduce((a,b) => a+b) / fast;
    // const slowMA = prices.slice(-slow).reduce((a,b) => a+b) / slow;
    // if (fastMA > slowMA) return 'BUY';
    // if (fastMA < slowMA) return 'SELL';

    let strategyFn: Function;
    try {
        strategyFn = new Function('prices', 'portfolio', code);
    } catch (e) {
        console.error("Failed to parse strategy code", e);
        return { totalPnL: 0, winRate: 0, trades: 0, equityCurve: [] };
    }

    for (let i = 1; i < prices.length; i++) {
        const currentPrice = prices[i];
        const currentPrices = prices.slice(0, i + 1);
        const portfolio = { balance, position, entryPrice };

        let signal;
        try {
            signal = strategyFn(currentPrices, portfolio);
        } catch (e) {
            // Ignore runtime errors for now, or log them
            continue;
        }

        // Execute Signal
        if (signal === 'BUY' && position !== 1) {
            // Close Short if exists
            if (position === -1) {
                const pnl = (entryPrice - currentPrice) / entryPrice * balance;
                balance += pnl;
                if (pnl > 0) wins++;
                trades++;
            }
            // Open Long
            position = 1;
            entryPrice = currentPrice;
        } else if (signal === 'SELL' && position !== -1) {
            // Close Long if exists
            if (position === 1) {
                const pnl = (currentPrice - entryPrice) / entryPrice * balance;
                balance += pnl;
                if (pnl > 0) wins++;
                trades++;
            }
            // Open Short (or just exit? Let's assume SELL means go Short for now, or just Exit)
            // For simplicity in this MVP, SELL means "Exit Long" or "Go Short". 
            // Let's stick to: SELL = Exit Long. If we want Short, we need 'SHORT' signal.
            // But to keep it compatible with previous logic which had Long/Short:
            // Let's assume SELL means "Go Short" for symmetry with the SMA strategy.
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
