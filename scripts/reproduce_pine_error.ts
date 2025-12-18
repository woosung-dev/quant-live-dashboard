
const fs = require('fs');
const path = require('path');

// Manually mock the transpiler import since ts-node might struggle with aliases or deep imports if not configured
// actually, I can try to read the file and eval it or just copy paste the transpiler logic for a quick test 
// OR simpler: use the verify pattern which seemed to work for imports?
// Verify script used 'require'.
// Let's try to load the file content and modify it to be standalone or use ts-node with tsconfig paths.
// But usually simpler to just put the script in a variable and run the logic I suspect is failing.

// However, I want to test the ACTUAL transpiler code.
// I'll try to use ts-node with register to load the actual file.

/*
  Usage: npx ts-node -r tsconfig-paths/register scripts/reproduce_pine_error.ts
*/

// Copy-paste minimal transpiler logic if import fails is a backup.
// But let's try to import.
// The transpiler has no external dependencies except 'indicators.ts'.

const script = `
// This work is licensed under a Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0) https://creativecommons.org/licenses/by-nc-sa/4.0/
// © LuxAlgo

//@version=4
strategy("Moon Phases Strategy [LuxAlgo]", overlay=true,process_orders_on_close=true)
new    = input(title="New Moon Reference Date", type=input.time, defval=timestamp("2021-01-13:05:00"))
buy    = input('Full Moon',options=['New Moon','Full Moon','Higher Moon','Lower Moon'],inline='buy')
sell   = input('New Moon',options=['New Moon','Full Moon','Higher Moon','Lower Moon'],inline='sell')
longcol  = input(color.new(#2157f3,80),'',inline='buy')
shortcol = input(color.new(#ff1100,80),'',inline='sell')
//----
n = bar_index
cycle = 2551442876.8992
day = 8.64e+7
diff = (new + time + day*2)%cycle/cycle
//----
newmoon = crossover(diff,.5)
fullmoon = diff < diff[1]

plotshape(newmoon ? low : na,"New Moon",shape.labelup,location.top,na,0,text="🌑",size=size.tiny)
plotshape(fullmoon ? high : na,"Full Moon",shape.labeldown,location.bottom,na,0,text="🌕",size=size.tiny) 
//----
src = close
var bool long = na
var bool short = na
if buy == 'New Moon'
    long := newmoon
else if buy == 'Full Moon'
    long := fullmoon
else if buy == 'Higher Moon'
    long := valuewhen(newmoon or fullmoon,src,0) > valuewhen(newmoon or fullmoon,src,1)
else
    long := valuewhen(newmoon or fullmoon,src,0) < valuewhen(newmoon or fullmoon,src,1)
//----
if sell == 'New Moon'
    short := newmoon
else if sell == 'Full Moon'
    short := fullmoon
else if sell == 'Higher Moon'
    short := valuewhen(newmoon or fullmoon,src,0) > valuewhen(newmoon or fullmoon,src,1)
else
    short := valuewhen(newmoon or fullmoon,src,0) < valuewhen(newmoon or fullmoon,src,1)
//----
var pos = 0
if long
    pos := 1
    strategy.close("Short")
    strategy.entry("Long", strategy.long)

if short
    pos := -1
    strategy.close("Long")
    strategy.entry("Short", strategy.short)

bgcolor(pos == 1 ? longcol : shortcol)
`;

// MOCK Transpiler for immediate verification of logic without import hell
// I'll replicate the exact logic I wrote in the file to test it "in situ" 
// (or I can write a script that reads `transpiler.ts` and evals it, but unsafe).

// Let's rely on the file system.
// I will try to run a command that imports the file.

// Mock Dependencies
const PINE_INDICATORS = {
    'ta.rsi': true, 'ta.ema': true, 'ta.sma': true, 'ta.macd': true, 'ta.crossover': true, 'ta.crossunder': true, 'ta.cross': true
};

// Paste transpilePineScript Function Logic Here (Modified for standalone)
function transpilePineScript(script: string) {
    // 0. Pre-process: Sanitize Reserved Keywords
    const reservedMap: Record<string, string> = {
        'new': '_new',
        'class': '_class',
        'function': '_function',
        'void': '_void',
        'delete': '_delete',
        'in': '_in',
        'instanceof': '_instanceof',
        'typeof': '_typeof',
        'this': '_this',
        'super': '_super',
        'export': '_export',
        'extends': '_extends',
        'import': '_import',
        'yield': '_yield',
        'debugger': '_debugger',
        'volatile': '_volatile',
        'static': '_static',
        'try': '_try',
        'catch': '_catch',
        'throw': '_throw',
        'finally': '_finally',
        'long': '_long',
        'short': '_short',
    };

    // Replace whole words only, avoiding object properties (preceded by dot)
    let sanitizedScript = script;
    for (const [key, val] of Object.entries(reservedMap)) {
        // Regex: negative lookbehind for dot, word boundary, key, word boundary. Global.
        sanitizedScript = sanitizedScript.replace(new RegExp(`(?<!\\.)\\b${key}\\b`, 'g'), val);
    }

    // 0.1. Pre-process: Merge multi-line statements
    let lines = sanitizedScript.split('\n');
    const mergedLines: string[] = [];
    let buffer = "";

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmedRight = line.replace(/\s*\/\/.*$/, '').trimRight();
        const continuationChars = ['?', ':', '+', '-', '*', '/', '%', '(', ',', 'and', 'or', '==', '!=', '>', '<', '>=', '<=', '=>'];
        const endsWithContinuation = continuationChars.some(c => trimmedRight.endsWith(c));

        if (buffer) {
            buffer += " " + line.trim();
        } else {
            buffer = line;
        }

        if (endsWithContinuation) {
            continue;
        } else {
            mergedLines.push(buffer);
            buffer = "";
        }
    }
    if (buffer) mergedLines.push(buffer);
    lines = mergedLines;

    const indicatorDefs: any[] = [];
    let processedScript = "";
    let indCount = 0;
    let strippingIndentLevel: number | null = null;
    const indentStack = [0];

    // Indicator Regex
    const indicatorRegex = /(ta\.[a-zA-Z0-9_]+)\(([^)]*)\)/g;
    const destructureRegex = /^\[([a-zA-Z0-9_,\s]+)\]\s*=\s*(ta\.[a-zA-Z0-9_]+)\((.*)\)/;
    const strategyCloseRegex = /strategy\.close\(([^)]+)\)/g;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (!line.trim()) continue;

        const match = line.match(/^(\s*)/);
        const spaces = match ? match[1].length : 0;

        if (strippingIndentLevel !== null) {
            if (spaces > strippingIndentLevel) {
                continue;
            } else {
                strippingIndentLevel = null;
            }
        }

        const currentLevel = indentStack[indentStack.length - 1];
        let bracePrefix = "";
        let braceSuffix = "";

        if (spaces > currentLevel) {
            bracePrefix = " {\n";
            indentStack.push(spaces);
        } else if (spaces < currentLevel) {
            while (indentStack.length > 1 && indentStack[indentStack.length - 1] > spaces) {
                indentStack.pop();
                braceSuffix += "}\n";
            }
        }

        if (braceSuffix) processedScript += braceSuffix;
        if (bracePrefix) processedScript += bracePrefix;

        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//')) continue;

        if (trimmedLine.startsWith('if ')) {
            if (!trimmedLine.match(/^if\s*\(/)) {
                line = trimmedLine.replace(/^if\s+(.*)/, 'if ($1)');
            } else {
                line = trimmedLine;
            }
        } else if (trimmedLine.startsWith('else if ')) {
            if (!trimmedLine.match(/^else\s+if\s*\(/)) {
                line = trimmedLine.replace(/^else\s+if\s+(.*)/, 'else if ($1)');
            } else {
                line = trimmedLine;
            }
        } else {
            line = trimmedLine;
        }

        // 2.1 Handle Pine Type Declarations
        const typeDeclRegex = /^\s*(varip|var)?\s*(bool|int|float|string|color|line|label|box|table)\s+([a-zA-Z0-9_]+)\s*(=|:=)/;
        const typeMatch = line.match(typeDeclRegex);
        if (typeMatch) {
            const [full, keyword, type, varName, op] = typeMatch;
            const jsKeyword = (keyword === 'var' || keyword === 'varip') ? 'var' : 'let';
            line = line.replace(typeDeclRegex, `${jsKeyword} ${varName} ${op}`);
        }
        // Operators
        line = line.replace(/\band\b/g, '&&');
        line = line.replace(/\bor\b/g, '||');

        line = line.replace(/#([0-9A-Fa-f]{3,8})/g, "'#$1'");

        line = line.replace(/(?<!ta\.)\brsi\(/g, 'ta.rsi(');
        line = line.replace(/(?<!ta\.)\bema\(/g, 'ta.ema(');
        line = line.replace(/(?<!ta\.)\bsma\(/g, 'ta.sma(');
        line = line.replace(/(?<!ta\.)\bmacd\(/g, 'ta.macd(');
        line = line.replace(/(?<!ta\.)\bavg\(/g, '_pine_avg(');

        line = line.replace(/\bcrossover\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/g, "_cross(1, '$1', '$2', i)");
        line = line.replace(/\bcrossunder\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/g, "_cross(-1, '$1', '$2', i)");
        line = line.replace(/\bcross\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/g, "_cross(0, '$1', '$2', i)");

        line = line.replace(/(?<!ta\.|_)\bcrossover\(/g, 'ta.crossover(');
        line = line.replace(/(?<!ta\.|_)\bcrossunder\(/g, 'ta.crossunder(');
        line = line.replace(/(?<!ta\.|_)\bcross\(/g, 'ta.cross(');

        const namedArgs = ['color', 'linewidth', 'transp', 'style', 'location', 'text', 'textcolor', 'size', 'offset'];
        const namedArgsRegex = new RegExp(`\\b(${namedArgs.join('|')})\\s*=\\s*`, 'g');
        line = line.replace(namedArgsRegex, '');

        const dMatch = line.match(destructureRegex);
        if (dMatch) {
            const [_, vars, funcName, args] = dMatch;
            // mock destructuring logic
            continue;
        }

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
            if (!line.startsWith('strategy.')) {
                continue;
            }
        }

        const funcMatch = line.match(/^\s*([a-zA-Z0-9_]+)\(([^)]*)\)\s*=>\s*(.*)/);
        if (funcMatch) {
            const [_, name, args, body] = funcMatch;
            if (body && body.trim()) {
                line = `const ${name} = (${args}) => (${body});`;
            } else {
                line = `// Function def removed: ${line}`;
                strippingIndentLevel = spaces;
                processedScript += line + '\n';
                continue;
            }
        }

        const inputMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*input\s*\((.*)\)/);
        if (inputMatch) {
            let [_, varName, argsStr] = inputMatch;
            let defVal = "";

            // Helper to extract named arg value respecting parentheses
            const extractArg = (key: string) => {
                const keyPattern = key + '=';
                let idx = argsStr.indexOf(keyPattern);
                if (idx === -1) {
                    const match = argsStr.match(new RegExp(key + '\\s*=\\s*'));
                    if (!match) return null;
                    idx = match.index! + match[0].length;
                } else {
                    idx += keyPattern.length;
                }

                let value = "";
                let depth = 0;
                let inString = false;
                let stringChar = '';

                for (let i = idx; i < argsStr.length; i++) {
                    const c = argsStr[i];
                    if (inString) {
                        if (c === stringChar && argsStr[i - 1] !== '\\') inString = false;
                        value += c;
                    } else {
                        if (c === '"' || c === "'") {
                            inString = true;
                            stringChar = c;
                            value += c;
                        } else if (c === '(' || c === '[' || c === '{') {
                            depth++;
                            value += c;
                        } else if (c === ')' || c === ']' || c === '}') {
                            if (depth > 0) depth--;
                            else if (depth === 0) break;
                            value += c;
                        } else if (c === ',' && depth === 0) {
                            break;
                        } else {
                            value += c;
                        }
                    }
                }
                return value.trim();
            };

            const namedDefVal = extractArg('defval');
            if (namedDefVal) {
                defVal = namedDefVal;
            } else {
                let value = "";
                let depth = 0;
                let inString = false;
                let stringChar = '';
                const isNamedStart = /^[a-zA-Z0-9_]+\s*=/.test(argsStr);

                if (!isNamedStart) {
                    for (let i = 0; i < argsStr.length; i++) {
                        const c = argsStr[i];
                        if (inString) {
                            if (c === stringChar && argsStr[i - 1] !== '\\') inString = false;
                            value += c;
                        } else {
                            if (c === '"' || c === "'") {
                                inString = true;
                                stringChar = c;
                                value += c;
                            } else if (c === '(' || c === '[') {
                                depth++;
                                value += c;
                            } else if (c === ')' || c === ']') {
                                depth--;
                                value += c;
                            } else if (c === ',' && depth === 0) {
                                break;
                            } else {
                                value += c;
                            }
                        }
                    }
                    if (value.trim()) defVal = value.trim();
                }
            }

            if (!defVal) defVal = "0";
            if (defVal === 'close') defVal = 'candles[i].close';
            // ... (other defaults)

            processedScript += `const ${varName} = ${defVal};\n`;
            continue;
        }

        line = line.replace(indicatorRegex, (fullMatch, funcName, argsStr) => {
            const id = `_ind_${indCount++}`;
            indicatorDefs.push({ id, name: funcName, args: argsStr.split(',').map((a: any) => a.trim()) });
            return `${id}[i]`;
        });

        const crossRegex = /\b(cross|crossover|crossunder)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
        line = line.replace(crossRegex, (m, fn, a, b) => {
            const mode = fn === 'crossover' ? 1 : (fn === 'crossunder' ? -1 : 0);
            return `_cross(${mode}, '${a}', '${b}', i)`;
        });

        line = line.replace(/\b(open|high|low|close|volume)\[([^\]]+)\]/g, (m, name, idx) => {
            return `(candles[i - (${idx})] || {}).${name}`;
        });

        line = line.replace(/(?<!\.)\b([a-zA-Z0-9_]+)\[([^\]]+)\]/g, (m, name, idx) => {
            if (name.startsWith('candles') || name.startsWith('_ind_') || name === 'signals') return m;
            return `_getSeries('${name}', i - (${idx}))`;
        });

        const assignMatch = line.match(/^\s*(?:const\s+)?([a-zA-Z0-9_]+)\s*(:?=)\s*(.+)/);
        let seriesUpdate = "";
        if (assignMatch) {
            const [_, name, op, expr] = assignMatch;
            if (!name.startsWith('_ind_') && name !== 'signals' && !line.includes('input(') && !line.startsWith('if ') && !op.includes('=>')) {
                if (op === ':=') {
                    line = line.replace(':=', '=');
                } else if (op === '=') {
                    if (!line.match(/^\s*(let|const|var)\s+/)) {
                        line = line.replace(/^\s*([a-zA-Z0-9_]+)\s*=\s*/, 'let $1 = ');
                    }
                }
                seriesUpdate = `_setSeries('${name}', ${name});`;
            }
        }

        const strategyEntryRegex = /strategy\.entry\(([^)]+)\)/g;
        line = line.replace(strategyEntryRegex, (m, argsStr) => {
            return `if (true) signals.push({ type: 'entry' });`; // Simplified mock
        });

        line = line.replace(strategyCloseRegex, (m, id) => {
            return `// strategy.close mock`;
        });

        const replaceSeries = (name: string, prop: string) => {
            const re = new RegExp(`(?<!\\.)\\b${name}\\b(?!\\s*[:=\\(])`, 'g');
            line = line.replace(re, `candles[i].${prop}`);
        };

        replaceSeries('close', 'close');
        // ... (others)

        processedScript += line + (seriesUpdate ? `\n${seriesUpdate}` : '') + '\n';
    }

    while (indentStack.length > 1) {
        indentStack.pop();
        processedScript += "}\n";
    }

    return { jsCode: processedScript, indicators: indicatorDefs };
}



// TEST 
try {
    const result = transpilePineScript(script);
    console.log("---------------- GENERATED JS ----------------");
    console.log(result.jsCode);
    console.log("----------------------------------------------");

    // Validate syntax
    new Function('candles', 'indicators', result.jsCode);
    console.log("✅ Syntax Check Passed");
} catch (e) {
    console.error("❌ Syntax Check Failed:", (e as any).message);
}
