import { Strategy, Candle, Signal, ParameterDefinition, StrategyResult } from '@/types';
import { calculateEMA, detectCrossover } from '../lib/indicators';
import { getClosePrices } from '../lib/engine';

const parameters: ParameterDefinition[] = [
    {
        name: 'fastPeriod',
        label: 'Fast Period',
        type: 'number',
        defaultValue: 9,
        min: 2,
        max: 50
    },
    {
        name: 'slowPeriod',
        label: 'Slow Period',
        type: 'number',
        defaultValue: 21,
        min: 5,
        max: 200
    }
];

function execute(candles: Candle[], params: Record<string, any>): StrategyResult {
    const prices = getClosePrices(candles);
    const fastPeriod = Number(params.fastPeriod) || 9;
    const slowPeriod = Number(params.slowPeriod) || 21;

    // Calculate EMAs
    const fastMA = calculateEMA(prices, fastPeriod);
    const slowMA = calculateEMA(prices, slowPeriod);

    // Detect Crossovers
    const crossovers = detectCrossover(fastMA, slowMA);

    const signals: Signal[] = [];

    // Skip initial period where MA is undefined
    const startIndex = Math.max(fastPeriod, slowPeriod);

    for (let i = startIndex; i < candles.length; i++) {
        const cross = crossovers[i];

        if (cross === 1) {
            signals.push({
                time: candles[i].time,
                type: 'buy',
                price: candles[i].close,
                reason: `Golden Cross (${fastPeriod}/${slowPeriod})`
            });
        } else if (cross === -1) {
            signals.push({
                time: candles[i].time,
                type: 'sell',
                price: candles[i].close,
                reason: `Death Cross (${fastPeriod}/${slowPeriod})`
            });
        }
    }

    return {
        signals,
        indicators: {
            fastMA,
            slowMA
        }
    };
}

export const emaCrossStrategy: Strategy = {
    id: 'ema-cross',
    name: 'EMA Cross',
    description: 'Exponential Moving Average Crossover Strategy',
    parameters,
    execute
};
