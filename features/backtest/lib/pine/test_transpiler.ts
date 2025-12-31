/**
 * Pine Script Transpiler Test
 * 사용자 제공 스크립트의 트랜스파일 테스트
 */

import { transpilePineScript } from './transpiler';

// 테스트 1: 기본 input.* 처리
const script1 = `
//@version=6
indicator('Test', overlay=true)

int vidya_length = input.int(10, 'VIDYA Length')
float band_distance = input.float(2, 'Distance factor', step=0.1)
bool shadow = input.bool(true, 'Shadow')
float source = input.source(close, 'Source')
color up_color = input.color(#17dfad, '+')

var float smoothed = na
var bool is_trend_up = false

if ta.crossover(source, 50)
    is_trend_up := true
`;

// 테스트 2: method 및 복잡한 구조 스킵
const script2 = `
//@version=6
indicator('Smart Money', overlay=true)
import TradingView/ta/10

var boxes = array.new_box()
var lines = array.new<line>(500)

method extend_lines(array<line> arr, float price) =>
    if arr.size() > 0
        for i = 0 to arr.size() - 1
            line l = arr.get(i)
            l.set_x2(bar_index)

overlap = input.bool(false, "Nested Channels")
length = input.int(14, "Box Detection Length")

if ta.crossover(close, ta.sma(close, length))
    signals.push({ time: candles[i].time, type: 'buy', price: candles[i].close })
`;

// 테스트 3: alertcondition 및 plotshape
const script3 = `
//@version=6
indicator('Signals Test')

rsi_val = ta.rsi(close, 14)

bullishBreakout = rsi_val < 30
bearishBreakout = rsi_val > 70

alertcondition(bullishBreakout, "Bullish Breakout", "Price broke out bullish")
alertcondition(bearishBreakout, "Bearish Breakout", "Price broke out bearish")

plotshape(bullishBreakout ? close : na, "Buy Signal", shape.labelup, location.belowbar, color=green)
`;

console.log('=== Test 1: input.* processing ===');
const result1 = transpilePineScript(script1);
console.log('Error:', result1.error || 'None');
console.log('Indicators:', result1.indicators.length);
console.log('JS Code (first 500 chars):');
console.log(result1.jsCode.substring(0, 500));
console.log('');

console.log('=== Test 2: method/array skip ===');
const result2 = transpilePineScript(script2);
console.log('Error:', result2.error || 'None');
console.log('Indicators:', result2.indicators.length);
console.log('JS Code (first 500 chars):');
console.log(result2.jsCode.substring(0, 500));
console.log('');

console.log('=== Test 3: alertcondition & plotshape ===');
const result3 = transpilePineScript(script3);
console.log('Error:', result3.error || 'None');
console.log('Indicators:', result3.indicators.length);
console.log('JS Code:');
console.log(result3.jsCode);
