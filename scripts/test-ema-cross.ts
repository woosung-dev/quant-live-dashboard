import { PINE_INDICATORS } from '../features/backtest/lib/pine/indicators';
import { runPineScript } from '../features/backtest/lib/pine/runner';
import { Candle } from '../types';

// Generate 4H candles for a few months (approx 400 candles)
const candles: Candle[] = [];
let time = new Date('2024-01-01T00:00:00Z').getTime();
let price = 50000;

for (let i = 0; i < 500; i++) {
    // Random walk with trend
    const move = (Math.random() - 0.45) * 200;
    price += move;

    candles.push({
        time,
        open: price,
        high: price + Math.random() * 100,
        low: price - Math.random() * 100,
        close: price + (Math.random() - 0.5) * 50,
        volume: 1000 + Math.random() * 500
    });
    time += 4 * 60 * 60 * 1000; // 4 hours
}

console.log("\n2. Testing EMA Cross Script...");
const script = `
//@version=4
strategy("Backtest single EMA cross", overlay=true)

qty = input(100000, "Buy quantity")

testStartYear = input(2024, "Backtest Start Year")
testStartMonth = input(1, "Backtest Start Month")
testStartDay = input(1, "Backtest Start Day")
testStartHour = input(0, "Backtest Start Hour")
testStartMin = input(0, "Backtest Start Minute")
testPeriodStart = timestamp(testStartYear, testStartMonth, testStartDay, testStartHour, testStartMin)
testStopYear = input(2099, "Backtest Stop Year")
testStopMonth = input(1, "Backtest Stop Month")
testStopDay = input(30, "Backtest Stop Day")
testPeriodStop = timestamp(testStopYear, testStopMonth, testStopDay, 0, 0)
testPeriodBackground = input(title="Color Background?", type=input.bool, defval=true)

testPeriod() =>
    time >= testPeriodStart and time <= testPeriodStop ? true : false

ema1 = input(10, title="Select EMA 1")
ema2 = input(20, title="Select EMA 2")

expo = ema(close, ema1)
ma = ema(close, ema2)

avg_1 = avg(expo, ma)
s2 = cross(expo, ma) ? avg_1 : na

longCondition = crossover(expo, ma)
shortCondition = crossunder(expo, ma)

if testPeriod()
    strategy.entry("Long", strategy.long, when=longCondition)
    strategy.entry("Short", strategy.short, when=shortCondition)
`;

try {
    const runRes = runPineScript(script, candles);
    console.log("Run Success. Signals:", runRes.signals.length);
    console.log("Signals detail:", runRes.signals.slice(0, 5));
} catch (e) {
    console.error("Runner Failed:", e);
}
