/**
 * 기술적 지표 유틸리티
 * @description technicalindicators 라이브러리를 래핑하여 간편한 인터페이스 제공
 */

import { RSI, EMA, SMA, MACD, BollingerBands, Stochastic, } from 'technicalindicators';

export interface IndicatorInput {
    values: number[];
    period?: number;
}

export interface MACDInput {
    values: number[];
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
}

export interface MACDOutput {
    MACD?: number;
    signal?: number;
    histogram?: number;
}

export interface BollingerBandsOutput {
    upper: number;
    middle: number;
    lower: number;
    pb: number; // Percent B
}

export interface StochasticInput {
    high: number[];
    low: number[];
    close: number[];
    period?: number;
    signalPeriod?: number;
}

export interface StochasticOutput {
    k: number | undefined;
    d: number | undefined;
}

/**
 * RSI (Relative Strength Index) 계산
 * @param values - 종가 배열
 * @param period - RSI 기간 (기본: 14)
 */
export function calculateRSI(values: number[], period: number = 14): number[] {
    const result = RSI.calculate({
        values,
        period,
    });

    // 앞부분에 undefined 채우기 (period 만큼)
    const padding = new Array(values.length - result.length).fill(undefined);
    return [...padding, ...result];
}

/**
 * EMA (Exponential Moving Average) 계산
 * @param values - 종가 배열  
 * @param period - EMA 기간
 */
export function calculateEMA(values: number[], period: number): number[] {
    const result = EMA.calculate({
        values,
        period,
    });

    const padding = new Array(values.length - result.length).fill(undefined);
    return [...padding, ...result];
}

/**
 * SMA (Simple Moving Average) 계산
 * @param values - 종가 배열
 * @param period - SMA 기간
 */
export function calculateSMA(values: number[], period: number): number[] {
    const result = SMA.calculate({
        values,
        period,
    });

    const padding = new Array(values.length - result.length).fill(undefined);
    return [...padding, ...result];
}

/**
 * MACD (Moving Average Convergence Divergence) 계산
 * @param values - 종가 배열
 * @param fastPeriod - 빠른 EMA 기간 (기본: 12)
 * @param slowPeriod - 느린 EMA 기간 (기본: 26)
 * @param signalPeriod - 시그널 기간 (기본: 9)
 */
export function calculateMACD(
    values: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): MACDOutput[] {
    const result = MACD.calculate({
        values,
        fastPeriod,
        slowPeriod,
        signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });

    const padding: MACDOutput[] = new Array(values.length - result.length).fill({
        MACD: undefined,
        signal: undefined,
        histogram: undefined,
    });

    return [...padding, ...result];
}

/**
 * Bollinger Bands 계산
 * @param values - 종가 배열
 * @param period - 기간 (기본: 20)
 * @param stdDev - 표준편차 배수 (기본: 2)
 */
export function calculateBollingerBands(
    values: number[],
    period: number = 20,
    stdDev: number = 2
): BollingerBandsOutput[] {
    const result = BollingerBands.calculate({
        values,
        period,
        stdDev,
    });

    const padding: BollingerBandsOutput[] = new Array(values.length - result.length).fill({
        upper: 0,
        middle: 0,
        lower: 0,
        pb: 0,
    });

    return [...padding, ...result];
}

/**
 * Stochastic Oscillator 계산
 * @param high - 고가 배열
 * @param low - 저가 배열
 * @param close - 종가 배열
 * @param period - %K 기간 (기본: 14)
 * @param signalPeriod - %D 기간 (기본: 3)
 */
export function calculateStochastic(
    high: number[],
    low: number[],
    close: number[],
    period: number = 14,
    signalPeriod: number = 3
): StochasticOutput[] {
    const result = Stochastic.calculate({
        high,
        low,
        close,
        period,
        signalPeriod,
    });

    const padding: StochasticOutput[] = new Array(close.length - result.length).fill({
        k: undefined,
        d: undefined,
    });

    return [...padding, ...result];
}

/**
 * 골든 크로스 / 데드 크로스 감지
 * @param fastMA - 빠른 이동평균 배열
 * @param slowMA - 느린 이동평균 배열
 * @returns 크로스 포인트 배열 (1: 골든크로스, -1: 데드크로스, 0: 없음)
 */
export function detectCrossover(
    fastMA: (number | undefined)[],
    slowMA: (number | undefined)[]
): number[] {
    const result: number[] = [];

    for (let i = 0; i < fastMA.length; i++) {
        if (i === 0 || fastMA[i] === undefined || slowMA[i] === undefined ||
            fastMA[i - 1] === undefined || slowMA[i - 1] === undefined) {
            result.push(0);
            continue;
        }

        const prevFast = fastMA[i - 1] as number;
        const prevSlow = slowMA[i - 1] as number;
        const currFast = fastMA[i] as number;
        const currSlow = slowMA[i] as number;

        // 골든 크로스: 빠른 MA가 느린 MA를 상향 돌파
        if (prevFast <= prevSlow && currFast > currSlow) {
            result.push(1);
        }
        // 데드 크로스: 빠른 MA가 느린 MA를 하향 돌파
        else if (prevFast >= prevSlow && currFast < currSlow) {
            result.push(-1);
        }
        else {
            result.push(0);
        }
    }

    return result;
}

/**
 * RSI 과매수/과매도 신호 감지
 * @param rsi - RSI 값 배열
 * @param overbought - 과매수 기준 (기본: 70)
 * @param oversold - 과매도 기준 (기본: 30)
 * @returns 신호 배열 (1: 과매도→매수 가능, -1: 과매수→매도 가능, 0: 중립)
 */
export function detectRSISignals(
    rsi: (number | undefined)[],
    overbought: number = 70,
    oversold: number = 30
): number[] {
    const result: number[] = [];

    for (let i = 0; i < rsi.length; i++) {
        if (i === 0 || rsi[i] === undefined || rsi[i - 1] === undefined) {
            result.push(0);
            continue;
        }

        const prevRSI = rsi[i - 1] as number;
        const currRSI = rsi[i] as number;

        // 과매도에서 상승 (매수 신호)
        if (prevRSI < oversold && currRSI >= oversold) {
            result.push(1);
        }
        // 과매수에서 하락 (매도 신호)
        else if (prevRSI > overbought && currRSI <= overbought) {
            result.push(-1);
        }
        else {
            result.push(0);
        }
    }

    return result;
}
