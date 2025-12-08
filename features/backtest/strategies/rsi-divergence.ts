/**
 * RSI Divergence 전략
 * @description RSI 과매수/과매도 기반 매매 전략
 */

import { Candle, Signal, Strategy, ParameterDefinition } from '@/types';
import { calculateRSI } from '../lib/indicators';
import { getClosePrices } from '../lib/engine';

/** RSI 전략 파라미터 */
export interface RSIDivergenceParams {
    period: number;
    overbought: number;
    oversold: number;
}

/** 기본 파라미터 */
const DEFAULT_PARAMS: RSIDivergenceParams = {
    period: 14,
    overbought: 70,
    oversold: 30,
};

/** 파라미터 정의 (UI용) */
const parameterDefinitions: ParameterDefinition[] = [
    {
        name: 'period',
        label: 'RSI 기간',
        type: 'number',
        defaultValue: 14,
        min: 2,
        max: 50,
        step: 1,
    },
    {
        name: 'overbought',
        label: '과매수 레벨',
        type: 'number',
        defaultValue: 70,
        min: 50,
        max: 90,
        step: 5,
    },
    {
        name: 'oversold',
        label: '과매도 레벨',
        type: 'number',
        defaultValue: 30,
        min: 10,
        max: 50,
        step: 5,
    },
];

/**
 * RSI 시그널 생성
 * - RSI가 과매도 구간에서 상승 → 매수
 * - RSI가 과매수 구간에서 하락 → 매도
 */
function execute(candles: Candle[], params: Record<string, unknown>): Signal[] {
    const { period, overbought, oversold } = {
        ...DEFAULT_PARAMS,
        ...params,
    } as RSIDivergenceParams;

    const signals: Signal[] = [];
    const closePrices = getClosePrices(candles);
    const rsiValues = calculateRSI(closePrices, period);

    for (let i = 1; i < candles.length; i++) {
        const prevRSI = rsiValues[i - 1];
        const currRSI = rsiValues[i];

        // RSI 값이 없으면 스킵
        if (prevRSI === undefined || currRSI === undefined) {
            continue;
        }

        // 과매도에서 상승 (매수 신호)
        if (prevRSI < oversold && currRSI >= oversold) {
            signals.push({
                time: candles[i].time,
                type: 'buy',
                price: candles[i].close,
                reason: `RSI가 과매도(${oversold}) 구간에서 상승`,
            });
        }
        // 과매수에서 하락 (매도 신호)
        else if (prevRSI > overbought && currRSI <= overbought) {
            signals.push({
                time: candles[i].time,
                type: 'sell',
                price: candles[i].close,
                reason: `RSI가 과매수(${overbought}) 구간에서 하락`,
            });
        }
    }

    return signals;
}

/** RSI Divergence 전략 객체 */
export const rsiDivergenceStrategy: Strategy = {
    id: 'rsi-divergence',
    name: 'RSI Divergence',
    description: 'RSI 과매수/과매도 구간을 활용한 역추세 전략. RSI가 30 이하에서 상승하면 매수, 70 이상에서 하락하면 매도합니다.',
    parameters: parameterDefinitions,
    execute,
};

export default rsiDivergenceStrategy;
