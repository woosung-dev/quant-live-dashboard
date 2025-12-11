import { transpilePineScript } from '../features/backtest/lib/pine/transpiler';
import { runPineScript } from '../features/backtest/lib/pine/runner';
import { Candle } from '../features/backtest/types';

const script = `
//@version=4
strategy(title="RSI Divergence Indicator", overlay=false)

len = input(title="RSI Period", minval=1, defval=9)
src = input(title="RSI Source", defval=close)
lbR = input(title="Pivot Lookback Right", defval=3)
lbL = input(title="Pivot Lookback Left", defval=1)
takeProfitRSILevel = input(title="Take Profit at RSI Level", minval=70, defval=80)

rangeUpper = input(title="Max of Lookback Range", defval=60)
rangeLower = input(title="Min of Lookback Range", defval=5)
plotBull = input(title="Plot Bullish", defval=true)

osc = rsi(src, len)

plot(osc, title="RSI", linewidth=2, color=#8D1699)
hline(50, title="Middle Line", linestyle=hline.style_dotted)

plFound = na(pivotlow(osc, lbL, lbR)) ? false : true
phFound = na(pivothigh(osc, lbL, lbR)) ? false : true

_inRange(cond) =>
    bars = barssince(cond == true)
    rangeLower <= bars and bars <= rangeUpper

// Regular Bullish
// Osc: Higher Low
oscHL = osc[lbR] > valuewhen(plFound, osc[lbR], 1) and _inRange(plFound[1])

// Price: Lower Low
priceLL = low[lbR] < valuewhen(plFound, low[lbR], 1)

bullCond = plotBull and priceLL and oscHL and plFound

strategy.entry(id="RSIDivLE", long=true,  when=bullCond)
`;

const candles: Candle[] = Array.from({ length: 150 }, (_, i) => ({
    time: 1000 + i * 60,
    open: 100 + Math.sin(i / 10) * 10,
    high: 110 + Math.sin(i / 10) * 10,
    low: 90 + Math.sin(i / 10) * 10,
    close: 100 + Math.sin(i / 10) * 10 + (Math.random() - 0.5) * 2,
    volume: 1000
}));

console.log("Transpiling...");
try {
    const result = transpilePineScript(script);
    console.log("Transpiled JS:");
    console.log(result.jsCode);
    console.log("Indicators:", result.indicators);

    console.log("Running...");
    const res = runPineScript(result.jsCode, candles); // Note: runPineScript takes raw script usually, but here we test components
    // Wait, runPineScript calls transpile internally?
    // Let's check runner.ts
} catch (e) {
    console.error("Transpilation Failed:", e);
}

// Direct Run check
try {
    const runRes = runPineScript(script, candles);
    console.log("Run Success. Signals:", runRes.signals.length);
} catch (e) {
    console.error("Run Failed:", e);
}
