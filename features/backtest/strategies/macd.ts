import { Strategy, Candle, Signal, ParameterDefinition, StrategyResult } from '@/types';
import { calculateMACD } from '../lib/indicators';
import { getClosePrices } from '../lib/engine';

const parameters: ParameterDefinition[] = [
    {
        name: 'fastPeriod',
        label: 'Fast Period',
        type: 'number',
        defaultValue: 12,
        min: 2,
        max: 50
    },
    {
        name: 'slowPeriod',
        label: 'Slow Period',
        type: 'number',
        defaultValue: 26,
        min: 5,
        max: 200
    },
    {
        name: 'signalPeriod',
        label: 'Signal Period',
        type: 'number',
        defaultValue: 9,
        min: 2,
        max: 50
    }
];

function execute(candles: Candle[], params: Record<string, any>): StrategyResult {
    const prices = getClosePrices(candles);
    const fastPeriod = Number(params.fastPeriod) || 12;
    const slowPeriod = Number(params.slowPeriod) || 26;
    const signalPeriod = Number(params.signalPeriod) || 9;

    // Calculate MACD
    const macdResults = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);

    const signals: Signal[] = [];
    const startIndex = Math.max(fastPeriod, slowPeriod) + signalPeriod;

    for (let i = startIndex; i < candles.length; i++) {
        // Current values
        const currMACD = macdResults[i].MACD;
        const currSignal = macdResults[i].signal;

        // Previous values
        const prevMACD = macdResults[i - 1].MACD;
        const prevSignal = macdResults[i - 1].signal;

        if (currMACD === undefined || currSignal === undefined ||
            prevMACD === undefined || prevSignal === undefined) {
            continue;
        }

        // MACD Crosses Signal Up (Bullish)
        if (prevMACD <= prevSignal && currMACD > currSignal) {
            signals.push({
                time: candles[i].time,
                type: 'buy',
                price: candles[i].close,
                reason: `MACD > Signal`
            });
        }
        // MACD Crosses Signal Down (Bearish)
        else if (prevMACD >= prevSignal && currMACD < currSignal) {
            signals.push({
                time: candles[i].time,
                type: 'sell',
                price: candles[i].close,
                reason: `MACD < Signal`
            });
        }
    }

    return {
        signals,
        indicators: {
            macdLine: macdResults.map(m => m.MACD || 0),
            signalLine: macdResults.map(m => m.signal || 0),
            histogram: macdResults.map(m => m.histogram || 0)
        }
    };
}

export const macdStrategy: Strategy = {
    id: 'macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence Strategy',
    parameters,
    execute
};
