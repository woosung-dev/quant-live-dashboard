import { Candle, Signal } from '@/types';
import { transpilePineScript } from './transpiler';
import { PINE_INDICATORS, PineIndicatorName } from './indicators';
import { getClosePrices } from '../../lib/engine';

interface PineRunnerResult {
    signals: Signal[];
    indicators: Record<string, number[]>;
}

export function runPineScript(script: string, candles: Candle[]): PineRunnerResult {
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
    console.log("Runner: Parsed Inputs:", Object.fromEntries(inputMap));

    // 2. Pre-calculate Indicators
    const indicatorContext: Record<string, any> = {};
    const indicatorResults: Record<string, number[]> = {};

    for (const def of indicatorDefs) {
        const func = PINE_INDICATORS[def.name as PineIndicatorName];
        if (!func) {
            console.warn(`Indicator function not found for: ${def.name}`);
            continue;
        }

        // Resolve arguments (e.g. 'close', '14', 'ema1')
        const args = def.args.map(argRaw => {
            const arg = argRaw.trim();
            // Check if number
            if (!isNaN(parseFloat(arg))) return parseFloat(arg);
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
        console.log(`Runner: Calculated ${def.name} (${def.id})`, result ? (Array.isArray(result) ? `Array[${result.length}]` : `Object keys: ${Object.keys(result)}`) : 'UNDEFINED');

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

    console.log("Runner: Indicator Keys:", Object.keys(indicatorContext));
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
             if (!arr1 || !arr2 || idx < 1) return false;
             
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
            // avg: via _pine_avg
        };
        
        // Time/Color helpers
        const timestamp = (y, m, d, h, min) => new Date(y, m-1, d, h, min).getTime();
        const color = { red: 'red', white: 'white', orange: 'orange' }; // Mock colors
        
        for (let i = 0; i < candles.length; i++) {
            try {
                ${jsCode}
            } catch (err) {
                console.error("Runtime Error at candle " + i, err);
            }
        }
        
        return signals;
    `;

    // Debug Log
    console.log("--- Generated Pine JS ---");
    console.log(fnBody);
    console.log("-------------------------");

    try {
        const fn = new Function('candles', 'indicators', fnBody);
        const signals = fn(candles, indicatorContext) as Signal[];
        return { signals, indicators: indicatorResults };
    } catch (e) {
        console.error("Pine Script Compilation/Execution Error:", e);
        console.log("FnBody:", fnBody);
        throw e;
    }
}
