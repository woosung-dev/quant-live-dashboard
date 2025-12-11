import { runPineScript } from '../features/backtest/lib/pine/runner';
import { Candle } from '../types';

// Mock Candles
const candles: Candle[] = Array.from({ length: 100 }, (_, i) => ({
    time: 1000 + i * 60,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 102 + i + (Math.sin(i / 5) * 10), // Fluctuate close price
    volume: 1000
}));

console.log("🚀 Testing Pine Script Parser & Runner...");

// Test 1: Simple RSI Strategy
const script1 = `
rsi = ta.rsi(close, 14)
if (rsi < 30)
    strategy.entry("Long", strategy.long)
if (rsi > 70)
    strategy.entry("Short", strategy.short) // Should map to logic
`;

try {
    console.log("\n1. Testing RSI Strategy...");
    const result = runPineScript(script1, candles);
    console.log("✅ Compiled Successfully.");
    console.log(`Signals Generated: ${result.signals.length}`);
    console.log(`Indicators: ${Object.keys(result.indicators).join(', ')}`);

    if (result.signals.length > 0) {
        console.log("First Signal:", result.signals[0]);
    }
} catch (e) {
    console.error("❌ RSI Strategy Failed:", e);
}

// Test 2: EMA Cross
const script2 = `
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
if (ta.crossover(fast, slow))
    strategy.entry("Buy", strategy.long)
if (ta.crossunder(fast, slow))
    strategy.entry("Sell", strategy.short)
`;

try {
    console.log("\n2. Testing EMA Cross Strategy...");
    const result = runPineScript(script2, candles);
    console.log("✅ Compiled Successfully.");
    console.log(`Signals Generated: ${result.signals.length}`);
    console.log(`Indicators: ${Object.keys(result.indicators).join(', ')}`);
} catch (e) {
    console.error("❌ EMA Cross Failed:", e);
}

// Test 3: MACD Destructuring
const script3 = `
[macd, sig, hist] = ta.macd(close, 12, 26, 9)
if (macd > sig)
   strategy.entry("Momentum", strategy.long)
`;

try {
    console.log("\n3. Testing MACD Strategy...");
    const result = runPineScript(script3, candles);
    console.log("✅ Compiled Successfully.");
    console.log(`Signals Generated: ${result.signals.length}`);
    // Check if macd, sig, hist indicator arrays were extracted
    // Note: Our runner saves destructuring logic differently, let's verify console output structure logic
} catch (e) {
    console.error("❌ MACD Strategy Failed:", e);
}
