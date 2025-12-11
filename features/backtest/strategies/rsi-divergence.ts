/**
 * RSI Divergence 전략
 * @description RSI 과매수/과매도 기반 매매 전략
 */

import { Strategy, Candle, Signal, ParameterDefinition, StrategyResult } from '@/types';
import { calculateRSI } from '../lib/indicators';
import { getClosePrices } from '../lib/engine';

const parameters: ParameterDefinition[] = [
    {
        name: 'rsiPeriod',
        label: 'RSI Period',
        type: 'number',
        defaultValue: 14,
        min: 2,
        max: 100
    },
    {
        name: 'overbought',
        label: 'Overbought Level',
        type: 'number',
        defaultValue: 70,
        min: 50,
        max: 100
    },
    {
        name: 'oversold',
        label: 'Oversold Level',
        type: 'number',
        defaultValue: 30,
        min: 0,
        max: 50
    }
];

function execute(candles: Candle[], params: Record<string, any>): StrategyResult {
    const prices = getClosePrices(candles);
    const period = Number(params.rsiPeriod) || 14;
    const overbought = Number(params.overbought) || 70;
    const oversold = Number(params.oversold) || 30;

    const rsiValues = calculateRSI(prices, period);
    const signals: Signal[] = [];

    // Skip initial period
    for (let i = period; i < candles.length; i++) {
        const prevRsi = rsiValues[i - 1];
        const currRsi = rsiValues[i];

        if (prevRsi === undefined || currRsi === undefined) continue;

        // Oversold -> Buy
        if (prevRsi < oversold && currRsi >= oversold) {
            signals.push({
                time: candles[i].time,
                type: 'buy',
                price: candles[i].close,
                reason: `RSI Oversold (${currRsi.toFixed(2)})`
            });
        }
        // Overbought -> Sell
        else if (prevRsi > overbought && currRsi <= overbought) {
            signals.push({
                time: candles[i].time,
                type: 'sell',
                price: candles[i].close,
                reason: `RSI Overbought (${currRsi.toFixed(2)})`
            });
        }
    }

    return {
        signals,
        indicators: {
            rsi: rsiValues
        }
    };
}

export const rsiDivergenceStrategy: Strategy = {
    id: 'rsi-divergence',
    name: 'RSI Divergence',
    description: 'RSI 과매수/과매도 기반 매매 전략',
    parameters,
    execute
};
