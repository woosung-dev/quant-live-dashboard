
import { runPineScript } from '../features/backtest/lib/pine/runner';
import { Candle } from '../types';

// Mock Candles (100 candles, price 100 -> 100)
const candles: Candle[] = Array.from({ length: 100 }, (_, i) => ({
    time: i * 60000,
    open: 100 + Math.sin(i / 10) * 10,
    high: 110 + Math.sin(i / 10) * 10,
    low: 90 + Math.sin(i / 10) * 10,
    close: 100 + Math.sin(i / 10) * 10, // Sine wave to trigger RSI
    volume: 1000
}));

// Test Script 1: Simple RSI Strategy with IF
const script1 = `
//@version=5
strategy("RSI Strategy", overlay=true)
len = input(14, title="Length")
rsiVal = ta.rsi(close, len)
// Buy when RSI < 30
if rsiVal < 30
    strategy.entry("Long", strategy.long)
`;

console.log("=== TEST 1: RSI Strategy with IF ===");
try {
    const result = runPineScript(script1, candles);
    console.log("Signals:", result.signals.length);
    result.signals.forEach(s => console.log(`[${s.time}] ${s.type} @ ${s.price}`));
} catch (e) {
    console.error("Test 1 Failed", e);
}

// Test Script 2: Single line IF (if such syntax is supported or flattened)
const script2 = `
if (close > 105) strategy.entry("High", strategy.long)
`;
console.log("\n=== TEST 2: Single Line IF ===");
try {
    const result = runPineScript(script2, candles);
    console.log("Signals:", result.signals.length);
    result.signals.slice(0, 5).forEach(s => console.log(`[${s.time}] ${s.type} @ ${s.price}`));
} catch (e) {
    console.error("Test 2 Failed", e);
}
