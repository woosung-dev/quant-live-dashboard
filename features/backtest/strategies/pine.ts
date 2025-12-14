import { Strategy, Candle, ParameterDefinition, StrategyResult } from '@/types';
import { runPineScript } from '../lib/pine/runner';

// Initial default script
const DEFAULT_SCRIPT = `
//@version=4
strategy("Backtest single EMA cross", overlay=true)

qty = input(100000, "Buy quantity")

testStartYear = input(2019, "Backtest Start Year")
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
testPeriodBackgroundColor = testPeriodBackground and time >= testPeriodStart and time <= testPeriodStop ? 
   #00FF00 : na
testPeriod() =>
    time >= testPeriodStart and time <= testPeriodStop ? true : false


ema1 = input(10, title="Select EMA 1")
ema2 = input(20, title="Select EMA 2")

expo = ema(close, ema1)
ma = ema(close, ema2)

avg_1 = avg(expo, ma)
s2 = cross(expo, ma) ? avg_1 : na
//plot(s2, style=plot.style_line, linewidth=3, color=color.red, transp=0)

p1 = plot(expo, color=#00FFFF, linewidth=2, transp=0)
p2 = plot(ma, color=color.orange, linewidth=2, transp=0)
fill(p1, p2, color=color.white, transp=80)

longCondition = crossover(expo, ma)

shortCondition = crossunder(expo, ma)


if testPeriod()
    strategy.entry("Long", strategy.long, when=longCondition)
    strategy.entry("Short", strategy.short, when=shortCondition)

plotshape(longCondition, title = "Buy Signal", text ="BUY", textcolor =#FFFFFF , style=shape.labelup, size = size.normal, location=location.belowbar, color = #1B8112, transp = 0)
plotshape(shortCondition, title = "Sell Signal", text ="SELL", textcolor = #FFFFFF, style=shape.labeldown, size = size.normal, location=location.abovebar, color = #FF5733, transp = 0)
`;

const parameters: ParameterDefinition[] = [
    {
        name: 'code',
        label: 'Pine Script',
        type: 'select', // Using 'select' type as placeholder, but UI will render Editor
        defaultValue: DEFAULT_SCRIPT,
        options: [] // Hidden in UI custom renderer
    }
];

function execute(candles: Candle[], params: Record<string, any>): StrategyResult {
    const code = params.code as string || DEFAULT_SCRIPT;
    return runPineScript(code, candles);
}

export const pineStrategy: Strategy = {
    id: 'pine-script',
    name: 'Custom Pine Script',
    description: 'Write your own strategy using Pine Script Lite syntax.',
    parameters,
    execute
};
