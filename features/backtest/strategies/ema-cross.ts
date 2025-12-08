/**
 * EMA Cross 전략
 * @description 이동평균선 골든크로스/데드크로스 기반 매매 전략
 */

import { Candle, Signal, Strategy, ParameterDefinition } from '@/types';
import { calculateEMA, detectCrossover } from '../lib/indicators';
import { getClosePrices } from '../lib/engine';

/** EMA Cross 전략 파라미터 */
export interface EMACrossParams {
    fastPeriod: number;
    slowPeriod: number;
}

/** 기본 파라미터 */
const DEFAULT_PARAMS: EMACrossParams = {
    fastPeriod: 9,
    slowPeriod: 21,
};

/** 파라미터 정의 (UI용) */
const parameterDefinitions: ParameterDefinition[] = [
    {
        name: 'fastPeriod',
        label: '빠른 EMA 기간',
        type: 'number',
        defaultValue: 9,
        min: 2,
        max: 50,
        step: 1,
    },
    {
        name: 'slowPeriod',
        label: '느린 EMA 기간',
        type: 'number',
        defaultValue: 21,
        min: 5,
        max: 200,
        step: 1,
    },
];

/**
 * EMA Cross 시그널 생성
 * - 골든 크로스 (빠른 EMA > 느린 EMA) → 매수
 * - 데드 크로스 (빠른 EMA < 느린 EMA) → 매도
 */
function execute(candles: Candle[], params: Record<string, unknown>): Signal[] {
    const { fastPeriod, slowPeriod } = {
        ...DEFAULT_PARAMS,
        ...params,
    } as EMACrossParams;

    // 파라미터 검증
    if (fastPeriod >= slowPeriod) {
        console.warn('빠른 EMA 기간이 느린 EMA 기간보다 작아야 합니다.');
        return [];
    }

    const signals: Signal[] = [];
    const closePrices = getClosePrices(candles);

    const fastEMA = calculateEMA(closePrices, fastPeriod);
    const slowEMA = calculateEMA(closePrices, slowPeriod);
    const crossovers = detectCrossover(fastEMA, slowEMA);

    for (let i = 0; i < candles.length; i++) {
        const crossover = crossovers[i];

        if (crossover === 1) {
            // 골든 크로스 - 매수
            signals.push({
                time: candles[i].time,
                type: 'buy',
                price: candles[i].close,
                reason: `골든 크로스: EMA(${fastPeriod})이 EMA(${slowPeriod})를 상향 돌파`,
            });
        } else if (crossover === -1) {
            // 데드 크로스 - 매도
            signals.push({
                time: candles[i].time,
                type: 'sell',
                price: candles[i].close,
                reason: `데드 크로스: EMA(${fastPeriod})이 EMA(${slowPeriod})를 하향 돌파`,
            });
        }
    }

    return signals;
}

/** EMA Cross 전략 객체 */
export const emaCrossStrategy: Strategy = {
    id: 'ema-cross',
    name: 'EMA Cross',
    description: '지수이동평균선(EMA) 크로스오버를 활용한 추세추종 전략. 빠른 EMA가 느린 EMA를 상향 돌파하면 매수, 하향 돌파하면 매도합니다.',
    parameters: parameterDefinitions,
    execute,
};

export default emaCrossStrategy;
