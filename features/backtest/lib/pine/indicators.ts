import {
    calculateRSI,
    calculateEMA,
    calculateSMA,
    calculateMACD,
    detectCrossover
} from '../indicators';

export const PINE_INDICATORS = {
    // Technical Analysis (ta.*)
    'ta.rsi': (prices: number[], length: number) => calculateRSI(prices, length),
    'ta.ema': (prices: number[], length: number) => calculateEMA(prices, length),
    'ta.sma': (prices: number[], length: number) => calculateSMA(prices, length),
    'ta.macd': (prices: number[], fast: number, slow: number, signal: number) => {
        // Pine Script ta.macd returns [macdLine, signalLine, hist]
        const res = calculateMACD(prices, fast, slow, signal);
        return {
            macdLine: res.map(r => r.MACD || 0),
            signalLine: res.map(r => r.signal || 0),
            hist: res.map(r => r.histogram || 0)
        };
    },
    'ta.crossover': (source1: number[], source2: number[]) => detectCrossover(source1, source2).map(v => v === 1),
    'ta.crossunder': (source1: number[], source2: number[]) => detectCrossover(source1, source2).map(v => v === -1),
    // Pivot Helpers (Mock implementation or basic logic)
    'ta.pivotlow': (source: number[], left: number, right: number) => {
        // Simple pivot low: val < neighbors in range
        return source.map((val, i) => {
            if (i < left || i >= source.length - right) return NaN;
            for (let k = 1; k <= left; k++) if (source[i - k] <= val) return NaN;
            for (let k = 1; k <= right; k++) if (source[i + k] <= val) return NaN;
            return val;
        });
    },
    'ta.pivothigh': (source: number[], left: number, right: number) => {
        return source.map((val, i) => {
            if (i < left || i >= source.length - right) return NaN;
            for (let k = 1; k <= left; k++) if (source[i - k] >= val) return NaN;
            for (let k = 1; k <= right; k++) if (source[i + k] >= val) return NaN;
            return val;
        });
    }
};

export type PineIndicatorName = keyof typeof PINE_INDICATORS;
