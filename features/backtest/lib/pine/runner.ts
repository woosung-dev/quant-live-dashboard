import { Candle, Signal } from '@/types';
import { transpilePineScript } from './transpiler';
import { PINE_INDICATORS, PineIndicatorName } from './indicators';
import { getClosePrices } from '../../lib/engine';

interface PineRunnerResult {
    signals: Signal[];
    indicators: Record<string, number[]>;
}

export function runPineScript(script: string, candles: Candle[]): PineRunnerResult {
    // console.log("Run Pine Script:", script.substring(0, 50) + "...");
    if (!candles || candles.length === 0) {
        console.warn("Run Pine Script: No candles provided");
        return { signals: [], indicators: {} };
    }
    const prices = getClosePrices(candles);
    const { jsCode, indicators: indicatorDefs } = transpilePineScript(script);


    // 1. Parse Inputs (Simple regex extract)
    const inputMap = new Map<string, number>();
    const inputRegex = /^([a-zA-Z0-9_]+)\s*=\s*input\s*\((.*)\)/gm;
    let match;
    while ((match = inputRegex.exec(script)) !== null) {
        const varName = match[1];
        const argsStr = match[2];
        let val = NaN;
        const defValMatch = argsStr.match(/defval\s*=\s*([^,)]+)/);
        if (defValMatch) {
            val = parseFloat(defValMatch[1].trim());
        } else {
            // Heuristic: first arg
            const firstComma = argsStr.indexOf(',');
            const firstArg = firstComma === -1 ? argsStr.trim() : argsStr.substring(0, firstComma).trim();
            if (!firstArg.includes('=')) {
                val = parseFloat(firstArg);
            }
        }
        if (!isNaN(val)) inputMap.set(varName, val);
    }


    // 2. Pre-calculate Indicators
    const indicatorContext: Record<string, any> = {};
    const indicatorResults: Record<string, number[]> = {};

    // Debug available indicators
    // console.log("Available Indicators:", Object.keys(PINE_INDICATORS));

    for (const def of indicatorDefs) {
        const func = PINE_INDICATORS[def.name as PineIndicatorName];
        if (!func) {
            console.warn(`Indicator function not found for: ${def.name}. Available: ${Object.keys(PINE_INDICATORS).join(', ')}`);
            indicatorContext[def.id] = []; // Fallback to prevent crash
            continue;
        }

        // Resolve arguments (e.g. 'close', '14', 'ema1')
        const args = def.args.map(argRaw => {
            const arg = argRaw.trim();
            // Check if number
            const num = parseFloat(arg);
            if (!isNaN(num) && isFinite(num)) return num;
            // Check if input variable
            if (inputMap.has(arg)) return inputMap.get(arg);

            // Check if series
            if (arg === 'close' || arg === 'src') return candles.map(c => c.close);
            if (arg === 'open') return candles.map(c => c.open);
            if (arg === 'high') return candles.map(c => c.high);
            if (arg === 'low') return candles.map(c => c.low);
            if (arg === 'volume') return candles.map(c => c.volume);

            return arg;
        });

        // @ts-expect-error - dynamic args
        let result = func(...args);

        // Special handling for pivot indicators that need source injection
        // They return { needsSource: 'high'|'low', left, right } when called with just (left, right)
        if (result && typeof result === 'object' && 'needsSource' in result) {
            const { needsSource, left, right } = result as { needsSource: string, left: number, right: number };
            const source = needsSource === 'high'
                ? candles.map(c => c.high)
                : candles.map(c => c.low);

            // Calculate pivot using the injected source
            result = source.map((val, i) => {
                if (i < left || i >= source.length - right) return NaN;
                if (needsSource === 'high') {
                    for (let k = 1; k <= left; k++) if (source[i - k] >= val) return NaN;
                    for (let k = 1; k <= right; k++) if (source[i + k] >= val) return NaN;
                } else {
                    for (let k = 1; k <= left; k++) if (source[i - k] <= val) return NaN;
                    for (let k = 1; k <= right; k++) if (source[i + k] <= val) return NaN;
                }
                return val;
            });
        }

        // Always assign to context for execution
        indicatorContext[def.id] = result;

        // Save for chart visualization
        if (def.isObjectDestructure) {
            // result is { macdLine, signalLine ... }
            // For now, we don't visualize destructured outputs automatically on the main chart as simple lines
        } else {
            indicatorResults[def.assignTo || def.id] = result as number[];
        }
    }


    // console.log("Runner: Indicator[0] length:", indicatorContext['_ind_0']?.length);

    // 2. Create Function
    // We pass 'candles', 'currentIndex', 'indicatorContext'
    // But 'indicatorContext' keys are dynamic variables in the function scope (e.g. const _ind_0 = ...).
    // We can use 'new Function' with arguments.

    // Wrap code in a loop?
    // The transpiler output assumes it's INSIDE the loop or function body?
    // Current transpiler outputs: "const signals = []; const i = currentIndex; ... return signals;"
    // This is weird. The transpiler assumes 'currentIndex' exists.
    // Actually, usually Pine Script runs ONCE per candle.
    // So we should generate a function `execute(i)` and loop it outside.

    // Let's adjust approach: Transpiler generates BODY of the loop.
    // Runner wraps it in a for-loop.

    /* 
       Transpiler generated:
       const rsi = _ind_0[i];
       if (rsi < 30) ...
    */

    const loopBody = jsCode.replace('return signals;', ''); // Remove return at end if present from my previous mental model
    // Actually, my previous transpiler added 'const signals = [];' inside. That was wrong for "per candle" logic or needs to be accumulated.
    // Let's re-read transpiler output intention.
    // Transpiler: processedLines.push('const signals = [];'); ... return signals;
    // This implies the transpiled code RUNS THE WHOLE LOOP? No, the loop logic isn't in transpiler.
    // Wait, the transpiler DOES NOT generate the "for" loop.
    // So the generated code runs once? No, it uses 'i'.

    // REVISION: The generated code expects 'i' to be defined.
    // So we wrap it:

    const fnBody = `
        const signals = [];
        // Debug
        // console.log("Context Keys:", Object.keys(indicators)); 
        const keys = Object.keys(indicators);
        if (!keys) console.error("Keys undefined?!");
        const { ${Object.keys(indicatorContext).join(', ')} } = indicators;
        
        // Pine Helpers
        const na = (v) => v === undefined || v === null || isNaN(v);
        const nz = (v, r) => na(v) ? (r || 0) : v;
        const max = Math.max;
        const abs = Math.abs;
        // Implementation for Pine Script functions that track history
        const _conditionHistory = {}; // Track when conditions were true
        const _valueHistory = {}; // Track values at those times
        
        const barssince = (conditionName) => {
            // Returns number of bars since condition was last true
            const hist = _conditionHistory[conditionName];
            if (!hist || hist.length === 0) return 0;
            const lastTrueIndex = hist[hist.length - 1];
            return i - lastTrueIndex;
        };
        
        // valuewhen with proper tracking - stores value when condition is true at nth occurrence
        const _valuewhenCache = {};
        const valuewhen = (condition, source, occurrence) => {
            // Track this call with a unique key based on arguments
            const key = 'vw_' + (typeof condition) + '_' + (typeof source) + '_' + occurrence;
            if (!_valuewhenCache[key]) {
                _valuewhenCache[key] = { values: [], lastValue: NaN };
            }
            const cache = _valuewhenCache[key];
            
            // If condition is true, record the current source value
            if (condition) {
                cache.values.unshift(source); // newest first
                if (cache.values.length > 100) cache.values.pop(); // limit memory
            }
            
            // Return the value at the nth occurrence (0 = most recent)
            if (cache.values.length > occurrence) {
                return cache.values[occurrence];
            }
            return source; // fallback to current value if not enough history
        };
        
        const pivotlow = (osc, l, r) => NaN; // Need real indicator or helper
        const pivothigh = (osc, l, r) => NaN;
        
        // Strategy Specific Mocks (Auto-detected? No, hardcode for safety)
        const _inRange = (c) => true; 
        
        // Series History Helpers
        const _seriesHistory = {}; 
        const _setSeries = (n, v) => {
            if (!_seriesHistory[n]) _seriesHistory[n] = [];
            _seriesHistory[n].push(v);
        };
        const _getSeries = (n, idx) => {
             if (!_seriesHistory[n]) return NaN;
             // idx is absolute index (i - lbR)
             if (idx < 0 || idx >= _seriesHistory[n].length) return NaN;
             return _seriesHistory[n][idx];
        };

        // Helper for cross logic
        const _cross = (mode, n1, n2, idx) => {
             // mode: 1 = crossover, -1 = crossunder, 0 = cross (any)
             const arr1 = _seriesHistory[n1];
             const arr2 = _seriesHistory[n2];
             if (!arr1 || !arr2 || idx < 1) {
                 // console.warn("Cross: Series not found or index too low", n1, n2);
                 return false;
             }
             
             const curr1 = arr1[idx];
             const curr2 = arr2[idx];
             const prev1 = arr1[idx-1];
             const prev2 = arr2[idx-1];
             
             if (mode === 1) { // crossover: 1 crosses over 2 (1 > 2, prev 1 <= prev 2)
                 return (curr1 > curr2) && (prev1 <= prev2);
             } else if (mode === -1) { // crossunder: 1 crosses under 2 (1 < 2, prev 1 >= prev 2)
                 return (curr1 < curr2) && (prev1 >= prev2);
             } else { // cross
                 return (curr1 > curr2 && prev1 <= prev2) || (curr1 < curr2 && prev1 >= prev2);
             }
        };
        
        // Enhanced cross helper that supports numeric literals as second argument
        // _crossValue(1, 'diff', 0.5, i) -> crossover(diff, 0.5)
        // _crossValue(1, 'a', 'b', i) -> crossover(a, b) 
        const _crossValue = (mode, n1, n2OrValue, idx) => {
             const arr1 = _seriesHistory[n1];
             if (!arr1 || idx < 1) {
                 return false;
             }
             
             const curr1 = arr1[idx];
             const prev1 = arr1[idx-1];
             
             // Check if n2OrValue is a number (literal) or string (variable name)
             let curr2, prev2;
             if (typeof n2OrValue === 'number') {
                 // It's a constant - same value for current and previous
                 curr2 = n2OrValue;
                 prev2 = n2OrValue;
             } else {
                 // It's a variable name
                 const arr2 = _seriesHistory[n2OrValue];
                 if (!arr2) return false;
                 curr2 = arr2[idx];
                 prev2 = arr2[idx-1];
             }
             
             if (curr1 === undefined || prev1 === undefined) return false;
             
             if (mode === 1) { // crossover: 1 crosses over 2
                 return (curr1 > curr2) && (prev1 <= prev2);
             } else if (mode === -1) { // crossunder: 1 crosses under 2
                 return (curr1 < curr2) && (prev1 >= prev2);
             } else { // cross (any direction)
                 return (curr1 > curr2 && prev1 <= prev2) || (curr1 < curr2 && prev1 >= prev2);
             }
        };
        
        const _pine_avg = (...args) => {
             if (args.length === 0) return 0;
             const sum = args.reduce((a, b) => a + (Number(b)||0), 0);
             return sum / args.length;
        };

        // Mock User Functions that might be stripped
        const _emaState = {}; 
        const _calculateEmaRuntime = (src, len) => {
             // Simple state keying by length (Limitation: conflicts if same len used twice on diff sources)
             const key = 'ema_' + len; 
             const prevEma = _emaState[key] !== undefined ? _emaState[key] : src; 
             const alpha = 2 / (len + 1);
             const ema = (src - prevEma) * alpha + prevEma;
             _emaState[key] = ema;
             return ema;
        };

        const ta = {
            crossover: (src1, src2) => false, 
            crossunder: (src1, src2) => false,
            rsi: (src, len) => 50, 
            ema: (src, len) => _calculateEmaRuntime(src, len), 
            sma: (src, len) => src, // simplified fallback
            avg: _pine_avg,
            cross: (a, b) => false,
            // Additional ta functions for Pine Script compatibility
            atr: (len) => {
                // ATR calculation at runtime (simplified)
                if (i < len) return 0;
                let sum = 0;
                for (let k = 0; k < len; k++) {
                    const c = candles[i - k];
                    const p = candles[i - k - 1] || c;
                    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
                    sum += tr;
                }
                return sum / len;
            },
            stdev: (src, len) => {
                if (i < len) return 0;
                const vals = [];
                for (let k = 0; k < len; k++) {
                    const srcVal = typeof src === 'number' ? src : candles[i - k]?.close || 0;
                    vals.push(srcVal);
                }
                const mean = vals.reduce((a, b) => a + b, 0) / len;
                const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / len;
                return Math.sqrt(variance);
            },
            variance: (src, len) => {
                if (i < len) return 1;
                const vals = [];
                for (let k = 0; k < len; k++) vals.push(i - k);
                const mean = vals.reduce((a, b) => a + b, 0) / len;
                return vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / len;
            },
            highest: (len) => {
                if (i < len) return candles[i]?.high || 0;
                let max = -Infinity;
                for (let k = 0; k < len; k++) max = Math.max(max, candles[i - k]?.high || 0);
                return max;
            },
            lowest: (len) => {
                if (i < len) return candles[i]?.low || 0;
                let min = Infinity;
                for (let k = 0; k < len; k++) min = Math.min(min, candles[i - k]?.low || 0);
                return min;
            },
            highestbars: (src, len) => {
                if (i < len) return 0;
                let maxVal = -Infinity;
                let maxIdx = 0;
                for (let k = 0; k <= len; k++) {
                    const val = typeof src === 'number' ? src : (candles[i - k]?.high || 0);
                    if (val > maxVal) { maxVal = val; maxIdx = -k; }
                }
                return maxIdx;
            },
            lowestbars: (src, len) => {
                if (i < len) return 0;
                let minVal = Infinity;
                let minIdx = 0;
                for (let k = 0; k <= len; k++) {
                    const val = typeof src === 'number' ? src : (candles[i - k]?.low || 0);
                    if (val < minVal) { minVal = val; minIdx = -k; }
                }
                return minIdx;
            },
            pivothigh: (left, right) => {
                // Runtime pivot detection
                const idx = i - right;
                if (idx < left || idx >= candles.length - right) return NaN;
                const val = candles[idx]?.high || 0;
                for (let k = 1; k <= left; k++) if ((candles[idx - k]?.high || 0) >= val) return NaN;
                for (let k = 1; k <= right; k++) if ((candles[idx + k]?.high || 0) >= val) return NaN;
                return val;
            },
            pivotlow: (left, right) => {
                const idx = i - right;
                if (idx < left || idx >= candles.length - right) return NaN;
                const val = candles[idx]?.low || 0;
                for (let k = 1; k <= left; k++) if ((candles[idx - k]?.low || 0) <= val) return NaN;
                for (let k = 1; k <= right; k++) if ((candles[idx + k]?.low || 0) <= val) return NaN;
                return val;
            },
            // change(src) returns src - src[1]
            change: (src) => {
                if (typeof src === 'number') {
                    // src is a current value, get previous from series history or candles
                    const prev = i > 0 ? candles[i - 1]?.close || 0 : src;
                    return src - prev;
                }
                // If src is an array (indicator result), calculate change
                if (Array.isArray(src)) {
                    const curr = src[i] || 0;
                    const prev = i > 0 ? (src[i - 1] || 0) : curr;
                    return curr - prev;
                }
                return 0;
            },
            // sum(src, length) returns sum of src over length bars
            sum: (src, len) => {
                if (i < len - 1) return 0;
                let total = 0;
                for (let k = 0; k < len; k++) {
                    if (typeof src === 'number') {
                        total += src;
                    } else if (Array.isArray(src)) {
                        total += src[i - k] || 0;
                    } else {
                        total += candles[i - k]?.close || 0;
                    }
                }
                return total;
            },
            // barssince(condition) - simplified, tracks in _conditionHistory
            barssince: (cond) => {
                // If condition is true now, return 0
                if (cond) return 0;
                // Otherwise search backwards (simplified - returns large number)
                return 999;
            },
            // valuewhen already defined above
            // tr (true range)
            tr: (handleNa) => {
                const c = candles[i];
                const p = i > 0 ? candles[i - 1] : c;
                return Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
            },
            // rma (Running Moving Average, used in ATR calculation)
            rma: (src, len) => {
                // Simplified as SMA for now
                if (i < len) return typeof src === 'number' ? src : candles[i]?.close || 0;
                let sum = 0;
                for (let k = 0; k < len; k++) {
                    sum += typeof src === 'number' ? src : (candles[i - k]?.close || 0);
                }
                return sum / len;
            },
            // Request up and down volume (mock for backtest)
            requestUpAndDownVolume: (tf) => {
                const c = candles[i];
                if (!c) return [0, 0, 0];
                const isUp = c.close >= c.open;
                return [
                    isUp ? c.volume : 0,  // up volume
                    isUp ? 0 : c.volume,  // down volume  
                    isUp ? c.volume : -c.volume  // delta
                ];
            },
        };
        
        // Math helpers
        const math = {
            max: Math.max,
            min: Math.min,
            abs: Math.abs,
            avg: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
            round: Math.round,
            floor: Math.floor,
            ceil: Math.ceil,
            sqrt: Math.sqrt,
            pow: Math.pow,
            log: Math.log,
            log10: Math.log10,
            exp: Math.exp,
            sign: Math.sign,
            sum: (src, len) => {
                if (i < len - 1) return 0;
                let total = 0;
                for (let k = 0; k < len; k++) {
                    if (typeof src === 'number') {
                        total += src;
                    } else {
                        total += candles[i - k]?.close || 0;
                    }
                }
                return total;
            },
        };
        
        // Mock visual objects (line, label, box, etc.) - they do nothing but prevent errors
        const line = {
            new: () => ({ set_xy1: () => {}, set_xy2: () => {}, delete: () => {} }),
            style_solid: 0, style_dashed: 1, style_dotted: 2,
        };
        const label = {
            new: () => ({ set_text: () => {}, delete: () => {} }),
            style_label_left: 0, style_label_right: 1,
        };
        const box = {
            new: () => ({ set_right: () => {}, get_top: () => 0, get_bottom: () => 0, set_text: () => {}, set_text_halign: () => {}, set_text_color: () => {}, set_text_size: () => {} }),
        };
        const array = {
            new_box: () => ({ size: () => 0, get: () => box.new(), unshift: () => {}, remove: () => {} }),
            new_line: () => ({ size: () => 0, get: () => line.new(), unshift: () => {}, remove: () => {} }),
            new: () => [],
        };
        const extend = { right: 0, left: 1, both: 2, none: 3 };
        const text = { align_right: 0, align_left: 1, align_center: 2 };
        const chart = { fg_color: '#ffffff' };
        const position = { top_right: 0, top_left: 1, bottom_right: 2, bottom_left: 3 };
        const str = { tostring: (v, d) => String(v) };
        
        // Time/Color helpers
        // Support both: timestamp(2021, 1, 13, 5, 0) and timestamp("2021-01-13:05:00")
        const timestamp = (...args) => {
            if (args.length === 1 && typeof args[0] === 'string') {
                // Parse string format: "2021-01-13:05:00" or "2021-01-13T05:00" or "2021-01-13"
                const str = args[0];
                // Try various formats
                const match = str.match(/(\d{4})-(\d{2})-(\d{2})[:T]?(\d{2})?:?(\d{2})?/);
                if (match) {
                    const [, y, m, d, h, min] = match;
                    return new Date(
                        parseInt(y), 
                        parseInt(m) - 1, 
                        parseInt(d), 
                        parseInt(h || '0'), 
                        parseInt(min || '0')
                    ).getTime();
                }
                // Fallback: try native Date parse
                return new Date(str).getTime() || 0;
            }
            // Numeric format: timestamp(year, month, day, hour, minute)
            const [y, m, d, h, min] = args;
            return new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0).getTime();
        };
        const color = { 
            new: (c, a) => c, // Mock new color with alpha (ignore alpha for now)
            red: 'red', white: 'white', orange: 'orange', blue: 'blue', green: 'green', black: 'black', yellow: 'yellow', aqua: 'aqua', teal: 'teal', gray: 'gray', lime: 'lime', maroon: 'maroon', fuchsia: 'fuchsia', olive: 'olive', navy: 'navy', silver: 'silver', purple: 'purple' 
        }; 
        // Input Identity Function with Heuristic
        const input = (...args) => {
            // Arguments might be shifted/reordered due to transpiler stripping "key="
            // e.g. input(title="T", defval=10) -> input("T", 10)
            // e.g. input(10, "T") -> input(10, "T")
            
            // Known type constants to ignore
            const typeConsts = ['bool', 'int', 'float', 'string', 'symbol', 'resolution', 'session', 'source', 'color', 'time'];
            
            // Filter out internal type constants
            const cleanArgs = args.filter(a => !typeConsts.includes(a));
            
            // Priority 1: Return first Boolean or Number
            const val = cleanArgs.find(a => typeof a === 'boolean' || typeof a === 'number');
            if (val !== undefined) return val;
            
            // Priority 2: Return first arg (likely string input)
            return cleanArgs[0];
        };
        // Attach type constants to input function
        Object.assign(input, {
             bool: 'bool', int: 'int', float: 'float', string: 'string', symbol: 'symbol', resolution: 'resolution', session: 'session', source: 'source', color: 'color', time: 'time' 
        });

        const shape = { labelup: 'labelup', labeldown: 'labeldown', triangleup: 'triangleup', triangledown: 'triangledown', circle: 'circle', cross: 'cross', xcross: 'xcross', arrowup: 'arrowup', arrowdown: 'arrowdown', square: 'square', diamond: 'diamond', flag: 'flag' };
        const size = { auto: 'auto', tiny: 'tiny', small: 'small', normal: 'normal', large: 'large', huge: 'huge' };
        const location = { abovebar: 'abovebar', belowbar: 'belowbar', top: 'top', bottom: 'bottom', absolute: 'absolute' };
        
        // Mock Visual Functions
        const plot = () => 0;
        const plotshape = () => 0;
        const fill = () => 0;
        const hline = () => 0;
        const bgcolor = () => 0;
        const barcolor = () => 0;
        
        // Strategy/Study mocks if they appear as functions
        const study = () => 0;
        
        // TP/SL 추적을 위한 변수
        let lastEntryPrice = 0;
        let lastEntryType = null;
        
        // TP/SL 공유 객체 - Pine Script 코드에서 접근 가능
        const _tpsl = { sl: 0, tp: [] };
        
        // Pine Script 변수들이 할당될 때 자동으로 _tpsl에도 저장되도록
        // 자주 사용되는 TP/SL 변수명 패턴 (DrFX 등에서 사용)
        let stop_y = 0;
        let atrStop = 0;
        let tp1Rl_y = 0;
        let tp2RL_y = 0;
        let tp3RL_y = 0;
        
        // strategy object - TP/SL 지원 버전
        const strategy = {
            entry: (id, direction, qty, limit, stop, oca_name, oca_type, comment, when) => {
                // Heuristic: Check for 'when' condition passed as other arguments due to named-arg stripping
                let condition = true;
                const args = [qty, limit, stop, oca_name, oca_type, comment, when];
                const boolArg = args.find(a => typeof a === 'boolean');
                if (boolArg !== undefined) {
                    condition = boolArg;
                }
                
                if (!condition) return;

                // Map direction 'long' -> 'buy', 'short' -> 'sell'
                const type = (direction === 'long' || direction === strategy.long) ? 'buy' : 'sell';
                
                // 진입 가격 추적
                lastEntryPrice = candles[i].close;
                lastEntryType = type === 'buy' ? 'long' : 'short';
                
                // TP/SL 변수 참조 (사전 정의된 변수 사용)
                // DrFX 스크립트의 패턴: stop_y, tp1Rl_y, tp2RL_y, tp3RL_y 등
                let stopLoss = undefined;
                let takeProfit = undefined;
                
                // SL 변수 확인 (0보다 큰 값이 있으면 사용)
                if (stop_y > 0) stopLoss = stop_y;
                else if (atrStop > 0) stopLoss = atrStop;
                
                // TP 변수 확인
                const tpValues = [];
                if (tp1Rl_y > 0) tpValues.push(tp1Rl_y);
                if (tp2RL_y > 0) tpValues.push(tp2RL_y);
                if (tp3RL_y > 0) tpValues.push(tp3RL_y);
                
                if (tpValues.length > 0) takeProfit = tpValues;
                
                signals.push({ 
                    time: candles[i].time, 
                    type: type, 
                    price: candles[i].close, 
                    reason: id,
                    stopLoss,
                    takeProfit,
                });
            },
            close: (id, comment, qty, func, when) => {
                 let condition = true;
                 const args = [comment, qty, func, when];
                 const boolArg = args.find(a => typeof a === 'boolean');
                 if (boolArg !== undefined) condition = boolArg;
                 
                 if (!condition) return;

                let type = 'sell';
                if (id && id.toLowerCase().includes('short')) type = 'buy';
                
                signals.push({ 
                    time: candles[i].time, 
                    type: type, 
                    price: candles[i].close, 
                    reason: "Close " + id 
                });
                
                lastEntryPrice = 0;
                lastEntryType = null;
            },
            exit: (id, from_entry, qty, limit, stop, profit, loss, trail_points, trail_offset, comment) => {
                // strategy.exit의 profit/loss 파라미터 처리
                let stopLoss = undefined;
                let takeProfit = undefined;
                
                if (lastEntryPrice > 0) {
                    // profit/loss는 틱 단위일 수 있음 - 백분율로 추정
                    if (typeof profit === 'number' && profit > 0) {
                        // 틱 기반이면 가격 계산
                        const tpPrice = lastEntryType === 'long' 
                            ? lastEntryPrice + profit 
                            : lastEntryPrice - profit;
                        takeProfit = [tpPrice];
                    }
                    if (typeof loss === 'number' && loss > 0) {
                        stopLoss = lastEntryType === 'long' 
                            ? lastEntryPrice - loss 
                            : lastEntryPrice + loss;
                    }
                    
                    // limit/stop 직접 가격도 지원
                    if (typeof limit === 'number') takeProfit = [limit];
                    if (typeof stop === 'number') stopLoss = stop;
                }
                
                // TP/SL 정보가 있으면 기존 진입 신호 업데이트
                if ((stopLoss || takeProfit) && signals.length > 0) {
                    const lastSignal = signals[signals.length - 1];
                    if (lastSignal.type === 'buy' || lastSignal.type === 'sell') {
                        if (stopLoss) lastSignal.stopLoss = stopLoss;
                        if (takeProfit) lastSignal.takeProfit = takeProfit;
                    }
                }
            },
            cancel: () => {},
            cancel_all: () => {},
            order: () => {},
            // properties
            long: 'long',
            short: 'short',
            position_size: 0,
            opentrades: 0
        };
        
        for (let i = 0; i < candles.length; i++) {
        // ... (rest of the file)
            try {
                // Define built-in time variables
                const _dateObj = new Date(candles[i].time);
                const year = _dateObj.getFullYear();
                const month = _dateObj.getMonth() + 1;
                const dayofmonth = _dateObj.getDate();
                const dayofweek = _dateObj.getDay() + 1; // Pine: 1=Sunday
                const hour = _dateObj.getHours();
                const minute = _dateObj.getMinutes();
                const second = _dateObj.getSeconds();
                // Pine Script 'time' is in milliseconds. 
                // Our candle.time is in seconds. We must convert it for the script logic.
                const time = candles[i].time * 1000;
                
                // Pine Script built-in variables
                const bar_index = i;
                // Note: 'n' is NOT defined here because Pine scripts often use 'n = bar_index'
                const last_bar_index = candles.length - 1;
                const barstate = { islast: i === candles.length - 1, isfirst: i === 0, isconfirmed: true, isnew: true };
                
                // Price helpers
                const hl2 = (candles[i].high + candles[i].low) / 2;
                const hlc3 = (candles[i].high + candles[i].low + candles[i].close) / 3;
                const ohlc4 = (candles[i].open + candles[i].high + candles[i].low + candles[i].close) / 4;
                
                ${jsCode}
            } catch (err) {
                console.error("Runtime Error at candle " + i, err);
            }
        }
        
        return signals;
    `;

    // Debug Log


    try {
        const fn = new Function('candles', 'indicators', fnBody);
        const signals = fn(candles, indicatorContext) as Signal[];
        return { signals, indicators: indicatorResults };
    } catch (e) {
        console.error("Pine Script Compilation/Execution Error:", e);
        console.error("---------------------------------------------------");
        console.error("GENERATED CODE WITH ERROR:");
        // Print with line numbers for easy debugging
        const lines = fnBody.split('\n');
        lines.forEach((line, idx) => {
            console.log(`${idx + 1}: ${line}`);
        });
        console.error("---------------------------------------------------");

        throw e;
    }
}
