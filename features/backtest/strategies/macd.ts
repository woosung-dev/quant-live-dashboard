/**
 * MACD 전략
 * @description MACD 시그널 크로스 기반 매매 전략
 */

import { Candle, Signal, Strategy, ParameterDefinition } from '@/types';
import { calculateMACD } from '../lib/indicators';
import { getClosePrices } from '../lib/engine';

/** MACD 전략 파라미터 */
export interface MACDStrategyParams {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
}

/** 기본 파라미터 */
const DEFAULT_PARAMS: MACDStrategyParams = {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
};

/** 파라미터 정의 (UI용) */
const parameterDefinitions: ParameterDefinition[] = [
    {
        name: 'fastPeriod',
        label: 'Fast EMA 기간',
        type: 'number',
        defaultValue: 12,
        min: 2,
        max: 50,
        step: 1,
    },
    {
        name: 'slowPeriod',
        label: 'Slow EMA 기간',
        type: 'number',
        defaultValue: 26,
        min: 10,
        max: 100,
        step: 1,
    },
    {
        name: 'signalPeriod',
        label: 'Signal 기간',
        type: 'number',
        defaultValue: 9,
        min: 2,
        max: 50,
        step: 1,
    },
];

/**
 * MACD 시그널 생성
 * - MACD 라인이 시그널 라인을 상향 돌파 → 매수
 * - MACD 라인이 시그널 라인을 하향 돌파 → 매도
 */
function execute(candles: Candle[], params: Record<string, unknown>): Signal[] {
    const { fastPeriod, slowPeriod, signalPeriod } = {
        ...DEFAULT_PARAMS,
        ...params,
    } as MACDStrategyParams;

    // 파라미터 검증
    if (fastPeriod >= slowPeriod) {
        console.warn('Fast 기간이 Slow 기간보다 작아야 합니다.');
        return [];
    }

    const signals: Signal[] = [];
    const closePrices = getClosePrices(candles);
    const macdValues = calculateMACD(closePrices, fastPeriod, slowPeriod, signalPeriod);

    for (let i = 1; i < candles.length; i++) {
        const prevMACD = macdValues[i - 1];
        const currMACD = macdValues[i];

        // MACD 값이 없으면 스킵
        if (
            prevMACD?.MACD === undefined ||
            prevMACD?.signal === undefined ||
            currMACD?.MACD === undefined ||
            currMACD?.signal === undefined
        ) {
            continue;
        }

        const prevDiff = prevMACD.MACD - prevMACD.signal;
        const currDiff = currMACD.MACD - currMACD.signal;

        // MACD가 시그널을 상향 돌파 (매수)
        if (prevDiff <= 0 && currDiff > 0) {
            signals.push({
                time: candles[i].time,
                type: 'buy',
                price: candles[i].close,
                reason: `MACD 상향 돌파: MACD(${currMACD.MACD.toFixed(2)}) > Signal(${currMACD.signal.toFixed(2)})`,
            });
        }
        // MACD가 시그널을 하향 돌파 (매도)
        else if (prevDiff >= 0 && currDiff < 0) {
            signals.push({
                time: candles[i].time,
                type: 'sell',
                price: candles[i].close,
                reason: `MACD 하향 돌파: MACD(${currMACD.MACD.toFixed(2)}) < Signal(${currMACD.signal.toFixed(2)})`,
            });
        }
    }

    return signals;
}

/** MACD 전략 객체 */
export const macdStrategy: Strategy = {
    id: 'macd',
    name: 'MACD',
    description: 'MACD(Moving Average Convergence Divergence) 시그널 크로스 전략. MACD 라인이 시그널 라인을 상향 돌파하면 매수, 하향 돌파하면 매도합니다.',
    parameters: parameterDefinitions,
    execute,
};

export default macdStrategy;
