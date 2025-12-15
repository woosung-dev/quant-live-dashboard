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
        const result = func(...args);


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
        // Mock unimplemented logic to prevent crash
        const barssince = (c) => 0; 
        const valuewhen = (c, s, n) => s; 
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
            avg: _pine_avg, // Expose avg in ta
            cross: (a, b) => false, 
            // Fallbacks for direct calls if transpiler didn't catch variables
        };
        
        // Time/Color helpers
        const timestamp = (y, m, d, h, min) => new Date(y, m-1, d, h, min).getTime();
        const color = { red: 'red', white: 'white', orange: 'orange', blue: 'blue', green: 'green', black: 'black', yellow: 'yellow', aqua: 'aqua', teal: 'teal', gray: 'gray', lime: 'lime', maroon: 'maroon', fuchsia: 'fuchsia', olive: 'olive', navy: 'navy', silver: 'silver', purple: 'purple' }; 
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
        // strategy object is already partially mocked via replacement, but 'strategy()' call check:
        // strategy object implementation
        const strategy = {
            entry: (id, direction, qty, limit, stop, oca_name, oca_type, comment, when) => {
                // Heuristic: Check for 'when' condition passed as other arguments due to named-arg stripping
                let condition = true; // default true if no 'when' passed? Pine default is true? No, usually explicit.
                // If named arg "when=longCondition" was stripped, 'longCondition' (bool) might be in 'qty' (3rd) or others.
                
                // Identify boolean args
                const args = [qty, limit, stop, oca_name, oca_type, comment, when];
                const boolArg = args.find(a => typeof a === 'boolean');
                if (boolArg !== undefined) {
                    condition = boolArg;
                }
                
                if (!condition) return;

                // Map direction 'long' -> 'buy', 'short' -> 'sell'
                const type = (direction === 'long' || direction === strategy.long) ? 'buy' : 'sell';
                signals.push({ 
                    time: candles[i].time, 
                    type: type, 
                    price: candles[i].close, 
                    reason: id 
                });
            },
            close: (id, comment, qty, func, when) => { // args might be shifted
                 let condition = true;
                 const args = [comment, qty, func, when]; // check positional args after id
                 const boolArg = args.find(a => typeof a === 'boolean');
                 if (boolArg !== undefined) condition = boolArg;
                 
                 if (!condition) return;

                // Heuristic: 'close' usually implies exiting the position identified by id.
                // Without state, we can't be sure if "Long" means we need to Sell, or "Short" means we need to Buy.
                // commonly, strategy.close("Long") -> Sell. strategy.close("Short") -> Buy.
                // For MVP, we default to 'sell' if id contains "Long", 'buy' if "Short", else 'sell' (safe exit).
                let type = 'sell';
                if (id && id.toLowerCase().includes('short')) type = 'buy';
                
                signals.push({ 
                    time: candles[i].time, 
                    type: type, 
                    price: candles[i].close, 
                    reason: "Close " + id 
                });
            },
            exit: (id, from_entry, qty, limit, stop, profit, loss, trail_points, trail_offset, comment) => {
                // Exit is complex (tp/sl). For now, treat as general close/sell signal.
               signals.push({ 
                   time: candles[i].time, 
                   type: 'sell', 
                   price: candles[i].close, 
                   reason: "Exit " + (id || from_entry)
               });
            },
            cancel: () => {},
            cancel_all: () => {},
            order: () => {},
            // properties
            long: 'long',
            short: 'short',
            position_size: 0, // mock
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

        throw e;
    }
}
