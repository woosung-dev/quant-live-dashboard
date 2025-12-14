
import { runPineScript } from '../features/backtest/lib/pine/runner';
import { Candle } from '../types';

// Generate 200 candles with a clear Sine Wave pattern to force RSI swings
const candles: Candle[] = Array.from({ length: 200 }, (_, i) => {
    // Sine wave: period 40, amplitude 20, center 100
    // Swings from 80 to 120.
    // RSI(14) should swing aggressively.
    const price = 100 + Math.sin(i * (Math.PI / 20)) * 20;
    return {
        time: i * 60000,
        open: price,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: 1000
    };
});

const script = `
// RSI Strategy
rsi = ta.rsi(close, 14)
if (rsi < 30)
    strategy.entry("Long", strategy.long)
if (rsi > 70)
    strategy.entry("Short", strategy.short) 
`;

console.log("=== Testing User RSI Strategy ===");
try {
    const result = runPineScript(script, candles);
    console.log("Candles:", candles.length);
    console.log("Signals Generated:", result.signals.length);
    if (result.signals.length > 0) {
        console.log("First 5 Signals:");
        result.signals.slice(0, 5).forEach(s => console.log(s));
    } else {
        console.log("NO SIGNALS GENERATED.");
        // Debug Indicators?
        console.log("Indicators calculated:", Object.keys(result.indicators));
        const rsiValues = result.indicators['_ind_0']; // Likely RSI
        if (rsiValues) {
            console.log("RSI Sample (last 5):", rsiValues.slice(-5));
            console.log("RSI Sample (first 20):", rsiValues.slice(0, 20));
        }
    }
} catch (e) {
    console.error("Execution Error:", e);
}
