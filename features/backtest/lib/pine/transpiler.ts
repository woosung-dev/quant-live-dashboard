/**
 * Pine Script "Lite" Transpiler
 * Converts simple Pine Script syntax into an executable JavaScript function body.
 */

import { PINE_INDICATORS } from './indicators';

interface TranspilerResult {
    jsCode: string;
    indicators: {
        id: string; // variable name in generated JS (e.g. _ind_1)
        name: string; // ta.rsi
        args: string[]; // arguments source code
        assignTo?: string; // (Optional) original variable name
        isObjectDestructure?: boolean;
    }[];
}

export function transpilePineScript(script: string): TranspilerResult {
    const lines = script.split('\n');
    const indicatorDefs: TranspilerResult['indicators'] = [];
    let processedScript = "";
    let indCount = 0;

    // State for block stripping
    let isStrippingBlock = false;

    // Helper to register indicator
    const registerIndicator = (fullMatch: string, funcName: string, argsStr: string): string => {
        if (funcName in PINE_INDICATORS || funcName.startsWith('ta.')) {
            // Find existing identical indicator to reuse?
            // For now, simple deduplication or just new instance
            const id = `_ind_${indCount++}`;
            indicatorDefs.push({
                id,
                name: funcName,
                args: argsStr.split(',').map(a => a.trim())
            });
            // Replace with array access
            return `${id}[i]`;
        }
        return fullMatch;
    };

    // Global Regex for ta.func(...)
    const indicatorRegex = /(ta\.[a-zA-Z0-9_]+)\(([^)]*)\)/g;

    // Special handling for Destructuring: [a, b] = ta.macd(...)
    const destructureRegex = /^\[([a-zA-Z0-9_,\s]+)\]\s*=\s*(ta\.[a-zA-Z0-9_]+)\((.*)\)/;

    // Strategy Regex
    // const strategyEntryRegex = ... (Moved to loop for fresh reasoning or keep simple?)
    // We used literal replace in loop. We can remove global const if unused.
    const strategyCloseRegex = /strategy\.close\(([^)]+)\)/g;

    for (let line of lines) {
        // preserve indent for detection
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('//')) continue;

        // Check indentation for block stripping
        const isIndented = line.startsWith('    ') || line.startsWith('\t');
        if (isStrippingBlock) {
            if (isIndented) {
                continue; // Skip body line
            } else {
                isStrippingBlock = false; // End of block
            }
        }

        line = trimmedLine; // Resume normal processing

        // Map v4 names to v5 (basic) - Must be before indicator processing
        line = line.replace(/\brsi\(/g, 'ta.rsi(');
        line = line.replace(/\bema\(/g, 'ta.ema(');
        line = line.replace(/\bsma\(/g, 'ta.sma(');
        line = line.replace(/\bmacd\(/g, 'ta.macd(');
        // line = line.replace(/\bavg\(/g, 'ta.avg('); // Don't use ta.avg for dynamic args
        line = line.replace(/\bavg\(/g, '_pine_avg(');

        // 1. Check destructuring FIRST (since it needs special handling)
        const dMatch = line.match(destructureRegex);
        if (dMatch) {
            const [_, vars, funcName, args] = dMatch;
            if (funcName in PINE_INDICATORS || funcName.startsWith('ta.')) {
                const id = `_ind_${indCount++}`;
                const varNames = vars.split(',').map(v => v.trim());

                // Extract args logic... handling 'close' etc?
                // For simplified v1, assume args are static or 'close'

                indicatorDefs.push({
                    id,
                    name: funcName,
                    args: args.split(',').map(a => a.trim()),
                    isObjectDestructure: true
                });

                if (funcName === 'ta.macd' || funcName === 'macd') {
                    const [m, s, h] = varNames;
                    processedScript += `
                   const ${m} = ${id}.macdLine[i];
                   const ${s} = ${id}.signalLine[i];
                   const ${h} = ${id}.hist[i];
                   `;
                }
                continue;
            }
        }

        // Clean Visuals and Inputs
        // Ensure we don't match variables like 'plotBull'
        if (
            line.match(/^\s*plot\s*\(/) ||
            line.match(/^\s*hline\s*\(/) ||
            line.match(/^\s*fill\s*\(/) ||
            line.match(/^\s*bgcolor\s*\(/) ||
            line.match(/^\s*barcolor\s*\(/) ||
            line.match(/^\s*plotshape\s*\(/)
        ) {
            continue;
        }
        if (line.startsWith('study(') || line.startsWith('strategy(') || line.startsWith('strategy ')) {
            // Handle "strategy(...)" or "strategy ..."
            if (!line.startsWith('strategy.')) {
                continue;
            }
        }

        // Handle Function Definition: similar to _inRange(cond) =>
        // Unsupported in Lite. We comment it out and rely on runner mocks or failure.
        if (line.match(/^\s*([a-zA-Z0-9_]+)\(([^)]*)\)\s*=>/)) {
            line = `// Function def removed: ${line}`;
            isStrippingBlock = true;
        }

        // Handle 'input'
        // Generic match: var = input(...)
        const inputMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*input\s*\((.*)\)/);
        if (inputMatch) {
            let [_, varName, argsStr] = inputMatch;
            let defVal = "";

            // 1. Try named 'defval='
            const defValMatch = argsStr.match(/defval\s*=\s*([^,)]+)/);
            if (defValMatch) {
                defVal = defValMatch[1].trim();
            } else {
                // 2. Fallback to first argument if it's not a named arg
                // Split by comma, but be careful of quotes?
                // Simple heuristic: Take up to first comma
                const firstComma = argsStr.indexOf(',');
                const firstArg = firstComma === -1 ? argsStr.trim() : argsStr.substring(0, firstComma).trim();

                // If it looks like a named arg (contains =), ignore?
                // Pine allows mixing? "input(10, title=...)" -> 10 is default.
                // "input(title=..., defval=10)" -> 10 is default.
                // If firstArg has '=', it's named.
                if (!firstArg.includes('=')) {
                    defVal = firstArg;
                }
            }

            // Cleanup quotes?
            if (defVal.startsWith('"') || defVal.startsWith("'")) {
                // String input? Keep quotes.
            }

            if (!defVal) defVal = "0"; // Fallback

            // Replace built-ins
            if (defVal === 'close') defVal = 'candles[i].close';
            else if (defVal === 'open') defVal = 'candles[i].open';
            else if (defVal === 'high') defVal = 'candles[i].high';
            else if (defVal === 'low') defVal = 'candles[i].low';
            else if (defVal === 'volume') defVal = 'candles[i].volume';
            else if (defVal === 'hl2') defVal = '(candles[i].high + candles[i].low) / 2';

            processedScript += `const ${varName} = ${defVal};\n`;
            continue;
        }

        // Helper for cross transpilation
        // cross(a, b) -> _cross(0, 'a', 'b', i)
        // crossover(a, b) -> _cross(1, 'a', 'b', i)
        // crossunder(a, b) -> _cross(-1, 'a', 'b', i)
        const crossRegex = /\b(cross|crossover|crossunder)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
        line = line.replace(crossRegex, (m, fn, a, b) => {
            const mode = fn === 'crossover' ? 1 : (fn === 'crossunder' ? -1 : 0);
            return `_cross(${mode}, '${a}', '${b}', i)`;
        });

        // (Removed old post-regex mappings)

        // Handle Series Access: var[idx]
        // 1. Built-in: low[x] -> candles[i - (x)].low
        // Regex to capture `name[expr]`
        // Exclude indicator calls like `_ind_0[i]` which we generate later, but user doesn't write.
        // User writes `low[1]`.
        // Look for word followed by [ ... ]
        line = line.replace(/\b(open|high|low|close|volume)\[([^\]]+)\]/g, (m, name, idx) => {
            return `(candles[i - (${idx})] || {}).${name}`;
        });

        // 2. User Vars: osc[1]
        // We need to know which vars are accessed this way to enable history?
        // Simple hack: Assume any `word[expr]` is a history access, replace it, AND ensure we track it.
        // But invalid for array usage?
        // We only support series history for typical vars.
        // We need to inject `history_osc.push(osc)` at the end of assignment?
        // Or finding assignments?
        // Let's do a 2-pass or intelligent replace?
        // MVP: Detect usage `osc[lbR]`. replace with `(history_osc[i - (${lbR})] ?? NaN)`.
        // AND inject `const history_osc = []` at top.
        // AND inject `history_osc.push(osc)` after `osc = ...`.

        // This requires parsing assignments.

        // Pass 1: Replace user var access
        // Ignore `_ind_` (our generated ones) and `candles`.
        line = line.replace(/(?<!\.)\b([a-zA-Z0-9_]+)\[([^\]]+)\]/g, (m, name, idx) => {
            if (name.startsWith('candles') || name.startsWith('_ind_') || name === 'signals') return m;
            // It's a user var access
            // Ensure we declared history for it? 
            // We can't easily inject top-level decs from inside loop without buffering.
            // We'll rely on a `historyVars` set and prepend declarations later.
            // BUT `historyVars` must be scoped to `transpilePineScript`. We can't use global.
            // We'll assume `processedScript` builder can handle it?
            // No, simple replace here. We'll fix headers later?
            // Actually, we can just use a `Map` in the function scope (exposed via closure?) 
            // `transpiler.ts` file scope: NO.
            // We need `historyVars` Set in the function.
            // `line` loop is inside function.
            // We need to capture `name` and add to Set.
            // But we can't easily add `push` code.

            // ALTERNATIVE: Use `Context` object for all history?
            // `context.history['osc'][i - idx]`.
            // `context.history['osc'].push(osc)`.
            // This is safer.
            // Replace `osc[x]` -> `_getSeries('osc', i - (${idx}))`.
            // And we need to trap assignments `osc = ...` -> `osc = ...; _pushSeries('osc', osc);`
            return `_getSeries('${name}', i - (${idx}))`;
        });

        // Trap Assignment for History
        const assignMatch = line.match(/^\s*(?:const\s+)?([a-zA-Z0-9_]+)\s*=\s*(.+)/);
        let seriesUpdate = "";
        if (assignMatch) {
            const [_, name] = assignMatch;
            if (!name.startsWith('_ind_') && name !== 'signals' && !line.includes('input(')) {
                seriesUpdate = `_setSeries('${name}', ${name});`;
            }
        }

        // Ignore 'if' statements (Flatten control flow)
        // This is a heuristic for "Lite" engine where we assume strategy blocks want to run.
        // We comment out the 'if' line but leave the indented body to execute.
        // Caveat: variable scope issues if variables defined inside block?
        // But signals push is fine.
        if (line.match(/^\s*if\s+/)) {
            line = `// Control flow flattened: ${line}`;
        }

        // 3. Strategy Commands
        // strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, when, alert_message)
        const strategyEntryRegex = /strategy\.entry\(([^)]+)\)/g;
        line = line.replace(strategyEntryRegex, (m, argsStr) => {
            const args = argsStr.split(',').map(a => a.trim());
            const id = args[0];
            const dirArg = args[1];
            const type = dirArg.includes('long') ? 'buy' : 'sell';

            let whenCond = 'true';
            const whenArg = args.find(a => a.startsWith('when='));
            if (whenArg) whenCond = whenArg.replace('when=', '').trim();

            return `if (${whenCond}) signals.push({ time: candles[i].time, type: '${type}', price: candles[i].close, reason: ${id} });`;
        });

        line = line.replace(strategyCloseRegex, (m, id) => {
            return `// strategy.close not supported yet`;
        });

        // 4. Built-in Variables
        const replaceSeries = (name: string, prop: string) => {
            // Lookbehind (?<!\.) ensures we don't replace property access like .close
            const re = new RegExp(`(?<!\\.)\\b${name}\\b(?!\\s*[:=\\(])`, 'g');
            line = line.replace(re, `candles[i].${prop}`);
        };

        replaceSeries('close', 'close');
        replaceSeries('open', 'open');
        replaceSeries('high', 'high');
        replaceSeries('low', 'low');
        replaceSeries('volume', 'volume');

        // Operators
        line = line.replace(/\s+and\s+/g, ' && ');
        line = line.replace(/\s+or\s+/g, ' || ');

        processedScript += line + (seriesUpdate ? `\n${seriesUpdate}` : '') + '\n';
    }

    return {
        jsCode: processedScript,
        indicators: indicatorDefs
    };
}
