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
    // Pivot Helpers - Support both (left, right) and (source, left, right) patterns
    // When source is omitted, use low for pivotlow and high for pivothigh
    'ta.pivotlow': (...args: any[]) => {
        let source: number[];
        let left: number;
        let right: number;

        if (args.length === 2 && typeof args[0] === 'number' && typeof args[1] === 'number') {
            // ta.pivotlow(left, right) - source will be injected by runner
            // For now return empty array - runner handles this case
            return { needsSource: 'low', left: args[0], right: args[1] };
        } else {
            source = args[0] as number[];
            left = args[1] as number;
            right = args[2] as number;
        }

        if (!Array.isArray(source)) {
            console.warn('ta.pivotlow: source is not an array', typeof source);
            return [];
        }

        return source.map((val, i) => {
            if (i < left || i >= source.length - right) return NaN;
            for (let k = 1; k <= left; k++) if (source[i - k] <= val) return NaN;
            for (let k = 1; k <= right; k++) if (source[i + k] <= val) return NaN;
            return val;
        });
    },
    'ta.pivothigh': (...args: any[]) => {
        let source: number[];
        let left: number;
        let right: number;

        if (args.length === 2 && typeof args[0] === 'number' && typeof args[1] === 'number') {
            // ta.pivothigh(left, right) - source will be injected by runner
            return { needsSource: 'high', left: args[0], right: args[1] };
        } else {
            source = args[0] as number[];
            left = args[1] as number;
            right = args[2] as number;
        }

        if (!Array.isArray(source)) {
            console.warn('ta.pivothigh: source is not an array', typeof source);
            return [];
        }

        return source.map((val, i) => {
            if (i < left || i >= source.length - right) return NaN;
            for (let k = 1; k <= left; k++) if (source[i - k] >= val) return NaN;
            for (let k = 1; k <= right; k++) if (source[i + k] >= val) return NaN;
            return val;
        });
    }
};

export type PineIndicatorName = keyof typeof PINE_INDICATORS;
