
import { runPineScript } from './runner';
import { Candle } from '../../../../types';

// Mock Candles
const mockCandles: Candle[] = Array.from({ length: 20 }, (_, i) => {
    return {
        time: 1672531200000 + i * 86400000,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 1000
    };
});

const script = `//@version=4
strategy("Test Strat", overlay=true)

p1 = plot(close, color=#00FFFF)

if (true)
    strategy.entry("Long", strategy.long)
`;

try {
    const result = runPineScript(script, mockCandles);
    console.log("Success!");
    console.log("Signals:", result.signals.length);
    if (result.signals.length > 0) {
        console.log("First Signal:", result.signals[0]);
    } else {
        console.error("FAILED: No signals generated");
        process.exit(1);
    }
} catch (e) {
    console.error("Failed:", e);
    process.exit(1);
}
