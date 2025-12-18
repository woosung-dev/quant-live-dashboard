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
    // 0. Pre-process: Sanitize Reserved Keywords
    // Pine Script allows variable names that are reserved in JS (e.g. 'new', 'class', 'function')
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
        // 'try', 'catch', 'throw', 'finally' -> used in logic? Pine doesn't use them.
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
        // Avoid replacing inside strings? A bit complex, but for MVP simple replacement is mostly safe as vars.
        // Note: Pine Script doesn't use 'new' as operator.
        sanitizedScript = sanitizedScript.replace(new RegExp(`(?<!\\.)\\b${key}\\b`, 'g'), val);
    }

    // 0.1. Pre-process: Merge multi-line statements
    // Heuristic: If a line ends with an operator, merge next line.
    let lines = sanitizedScript.split('\n');
    const mergedLines: string[] = [];
    let buffer = "";

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        // Remove comments for checking line-ends (but keep for output? No, simpler to strip line-end comments for logic)
        // Simplification: We'll trim right and check end char.
        const trimmedRight = line.replace(/\s*\/\/.*$/, '').trimRight();

        // Check for continuation
        const continuationChars = ['?', ':', '+', '-', '*', '/', '%', '(', ',', 'and', 'or', '==', '!=', '>', '<', '>=', '<=', '=>'];
        const endsWithContinuation = continuationChars.some(c => trimmedRight.endsWith(c));

        if (buffer) {
            buffer += " " + line.trim();
        } else {
            buffer = line;
        }

        if (endsWithContinuation) {
            // internal buffer continues
            continue;
        } else {
            // Push buffer
            mergedLines.push(buffer);
            buffer = "";
        }
    }
    if (buffer) mergedLines.push(buffer);

    lines = mergedLines;

    const indicatorDefs: TranspilerResult['indicators'] = [];
    let processedScript = "";
    let indCount = 0;

    // State for block stripping
    let strippingIndentLevel: number | null = null;

    // Helper to register indicator
    const registerIndicator = (fullMatch: string, funcName: string, argsStr: string): string => {
        if (funcName in PINE_INDICATORS || funcName.startsWith('ta.')) {
            const id = `_ind_${indCount++}`;
            indicatorDefs.push({
                id,
                name: funcName,
                args: argsStr.split(',').map((a: string) => a.trim())
            });
            return `${id}[i]`;
        }
        return fullMatch;
    };

    // Global Regex for ta.func(...)
    const indicatorRegex = /(ta\.[a-zA-Z0-9_]+)\(([^)]*)\)/g;

    // Special handling for Destructuring: [a, b] = ta.macd(...)
    const destructureRegex = /^\[([a-zA-Z0-9_,\s]+)\]\s*=\s*(ta\.[a-zA-Z0-9_]+)\((.*)\)/;

    // Strategy Regex
    const strategyCloseRegex = /strategy\.close\(([^)]+)\)/g;

    // State for indentation tracking
    const indentStack = [0]; // Stack of indent levels (spaces)

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // 0. Handle Indentation (Before trimming)
        if (!line.trim()) continue;

        // Calculate indent
        const match = line.match(/^(\s*)/);
        const spaces = match ? match[1].length : 0;

        // --- Stripping Logic ---
        if (strippingIndentLevel !== null) {
            if (spaces > strippingIndentLevel) {
                // Inside function body -> Skip
                continue;
            } else {
                // Dedent -> End stripping
                strippingIndentLevel = null;
            }
        }
        // -----------------------

        // Indent change detection
        const currentLevel = indentStack[indentStack.length - 1];
        let bracePrefix = "";
        let braceSuffix = "";

        if (spaces > currentLevel) {
            // Indent Increased -> Open Block
            bracePrefix = " {\n";
            indentStack.push(spaces);
        } else if (spaces < currentLevel) {
            // Indent Decreased -> Close Blocks
            while (indentStack.length > 1 && indentStack[indentStack.length - 1] > spaces) {
                indentStack.pop();
                braceSuffix += "}\n";
            }
        }

        // Apply braces
        if (braceSuffix) processedScript += braceSuffix;
        if (bracePrefix) processedScript += bracePrefix;

        // 1. Trim and resume processing
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//')) continue;

        // 2. Handle 'if' statement syntax (Pine `if x` -> JS `if (x)`)
        if (trimmedLine.startsWith('if ')) {
            // Check if it already has wrapping parentheses
            if (!trimmedLine.match(/^if\s*\(/)) {
                line = trimmedLine.replace(/^if\s+(.*)/, 'if ($1)');
            } else {
                line = trimmedLine;
            }
        } else if (trimmedLine.startsWith('else if ')) {
            // Handle 'else if'
            if (!trimmedLine.match(/^else\s+if\s*\(/)) {
                line = trimmedLine.replace(/^else\s+if\s+(.*)/, 'else if ($1)');
            } else {
                line = trimmedLine;
            }
        } else if (trimmedLine.match(/^\s*switch\s+/)) {
            // Handle Pine switch statement
            // varName = switch expr  ->  let varName; switch (expr)
            const switchMatch = trimmedLine.match(/^([a-zA-Z0-9_]+)\s*=\s*switch\s+(.+)/);
            if (switchMatch) {
                const [, varName, expr] = switchMatch;
                line = `let ${varName}; switch (${expr})`;
            } else {
                // Regular switch
                line = trimmedLine.replace(/^switch\s+(.*)/, 'switch ($1)');
            }
        } else if (trimmedLine.match(/^'[^']+'\s*=>/)) {
            // Pine switch case: 'Value' => expression
            const caseMatch = trimmedLine.match(/^'([^']+)'\s*=>\s*(.*)/);
            if (caseMatch) {
                const [, caseVal, expr] = caseMatch;
                // Get the switch variable from context (simplified - use previous line variable)
                line = `case '${caseVal}': { const _switchResult = ${expr}; break; }`;
            }
        } else if (trimmedLine.match(/^"[^"]+"\s*=>/)) {
            // Double-quoted case
            const caseMatch = trimmedLine.match(/^"([^"]+)"\s*=>\s*(.*)/);
            if (caseMatch) {
                const [, caseVal, expr] = caseMatch;
                line = `case "${caseVal}": { const _switchResult = ${expr}; break; }`;
            }
        } else {
            line = trimmedLine;
        }

        // 2.1 Handle Pine Type Declarations (var bool x = ...) -> (var x = ...)
        // Types: bool, int, float, string, color
        // Keywords: var, varip
        // Logic: 
        // "var bool x =" -> "var x ="
        // "bool x =" -> "let x =" (assume local if not var)
        // "x =" -> handled by Trap Assignment later

        // Regex to capture optional var/varip and type, followed by identifier and =
        // We use replace to strip the type and normalize var/let.
        // Note: Reserved keywords like 'long' are already sanitized to '_long' by step 0.
        // So we might see "var bool _long ="

        const typeDeclRegex = /^\s*(varip|var)?\s*(bool|int|float|string|color|line|label|box|table)\s+([a-zA-Z0-9_]+)\s*(=|:=)/;
        const typeMatch = line.match(typeDeclRegex);
        if (typeMatch) {
            const [full, keyword, type, varName, op] = typeMatch;
            const jsKeyword = (keyword === 'var' || keyword === 'varip') ? 'var' : 'let';
            // Reconstruct line without type
            // preserved indentation? line is trimmed here, but we append to processedScript? 
            // processedScript structure uses 'line', which is indentation-stripped? 
            // No, processedScript reconstructs blocks.
            // But we modified 'line' variable. 'line' is used later.
            // We should modify 'line' correctly.

            // Rewrite the start of the line
            // We need to keep the rest of the expression.
            // Replace the matched declaration part.
            line = line.replace(typeDeclRegex, `${jsKeyword} ${varName} ${op}`);
        }

        // Color Literals: #RRGGBB -> '#RRGGBB'
        // Regex: # followed by 6 or 3 hex digits, not preceded by string quote check?
        // Simple hack: Replace #([0-9A-Fa-f]{3,8}) with '$&'
        line = line.replace(/#([0-9A-Fa-f]{3,8})/g, "'#$1'");

        // Fix: Don't replace `rsi(` if it is preceded by `ta.`
        line = line.replace(/(?<!ta\.)\brsi\(/g, 'ta.rsi(');
        line = line.replace(/(?<!ta\.)\bema\(/g, 'ta.ema(');
        line = line.replace(/(?<!ta\.)\bsma\(/g, 'ta.sma(');
        line = line.replace(/(?<!ta\.)\bmacd\(/g, 'ta.macd(');
        line = line.replace(/(?<!ta\.)\bavg\(/g, '_pine_avg(');

        // Rewrite cross/crossover/crossunder to use _crossValue helper for numeric comparisons
        // crossover(a, 0.5) -> _crossValue(1, 'a', 0.5, i)
        // crossover(a, b) -> _crossValue(1, 'a', b, i) where b could be var or number
        // More permissive pattern: allow any expression as second arg
        line = line.replace(/\bcrossover\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^)]+)\s*\)/g, (match, a, b) => {
            const bTrimmed = b.trim();
            // Check if b is a number literal
            if (/^[0-9.]+$/.test(bTrimmed)) {
                return `_crossValue(1, '${a}', ${bTrimmed}, i)`;
            }
            // Otherwise it's a variable
            return `_crossValue(1, '${a}', '${bTrimmed}', i)`;
        });
        line = line.replace(/\bcrossunder\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^)]+)\s*\)/g, (match, a, b) => {
            const bTrimmed = b.trim();
            if (/^[0-9.]+$/.test(bTrimmed)) {
                return `_crossValue(-1, '${a}', ${bTrimmed}, i)`;
            }
            return `_crossValue(-1, '${a}', '${bTrimmed}', i)`;
        });
        line = line.replace(/\bcross\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^)]+)\s*\)/g, (match, a, b) => {
            const bTrimmed = b.trim();
            if (/^[0-9.]+$/.test(bTrimmed)) {
                return `_crossValue(0, '${a}', ${bTrimmed}, i)`;
            }
            return `_crossValue(0, '${a}', '${bTrimmed}', i)`;
        });

        // Map remaining cross calls to ta.cross (fallback, likely won't work well without history but valid syntactically)
        line = line.replace(/(?<!ta\.|_)\bcrossover\(/g, 'ta.crossover(');
        line = line.replace(/(?<!ta\.|_)\bcrossunder\(/g, 'ta.crossunder(');
        line = line.replace(/(?<!ta\.|_)\bcross\(/g, 'ta.cross(');

        // Strip Named Arguments to prevent "color=..." being treated as assignment to const color
        // Common args: color, title, linewidth, transp, style, type, val, defval, minval, maxval
        // We match `\bname\s*=\s*` and replace with empty string, leaving the value.
        // WARNING: This assumes positional args logic will generally be accepted by logic (mocks don't care, inputs use parsing logic).
        // Inputs handled earlier? No, inputs handle logic later.
        // Actually, logic for `input` parser extracts args manually.
        // But `input(2019, title="Foo")` -> `input(2019, "Foo")`.
        // My manual input parser expects `defval=`. If I strip it here, parser breaks?
        // Let's check input parser location.
        // Input parser is at lines 205+. It uses regex match on `line`.
        // We are at line 140+ here?
        // Let's check structure.
        // The replacements are happening inside the loop.
        // Input parser is AFTER `Replace Color Literals` in previous file?
        // Let's re-read file structure.
        // `input` handling is correct to keep `defval`? 
        // My input parser: `const defvalMatch = argsStr.match(/defval\s*=\s*([^,)]+)/);`
        // If I strip `defval=`, it fails.
        // So I should NOT strip `defval` here, or ensure stripping happens AFTER input parsing.
        // Input parsing is BEFORE this block in my previous `replace_file_content`?
        // Let's check `replace_file_content` block in Step 110.
        // It shows `Indicator Call Replacement` is AFTER `input` check.
        // `color` replacement was seemingly placed BEFORE `input` check in my merged file?
        // I need to be careful.
        // Let's look at `transpiler.ts` again.

        // Order:
        // 0. Indentation
        // 1. Trim
        // 2. If
        // 3. Color Literals (#...)
        // 4. Indicator Mapping (rsi -> ta.rsi)
        // 5. Destructuring
        // 6. Clean Visuals (plot) - wait, I want to keep assignments
        // 7. Strategy check
        // 8. Function Def
        // 9. Input
        // 10. Indicator Regex (ta.func)
        // ...

        // I should insert Named Argument stripping AFTER Input handling (step 9), or Exclude `defval`.
        // But `plot` (step 6) check is before Input?
        // Actually `p1 = plot(...)` is handled by `assignMatch` at end (step ~12), but the LINE content is modified throughout.

        // If I strip `color=` early, it's fine.
        // But `defval=` for inputs must be preserved for step 9.
        // So I will strip named arguments EXCEPT `defval` (and maybe `title` if used by input?).
        // `input(title="Foo")`. My input parser doesn't use title.
        // `strategy(title="...")`.

        // So, let's strip: color, linewidth, style, transp, location, text, textcolor, size
        // Note: 'when' is intentionally kept for strategy.entry parsing
        const namedArgs = ['color', 'linewidth', 'transp', 'style', 'location', 'text', 'textcolor', 'size', 'offset'];
        const namedArgsRegex = new RegExp(`\\b(${namedArgs.join('|')})\\s*=\\s*`, 'g');
        line = line.replace(namedArgsRegex, ''); // Remove 'color=' leaving 'red'

        // 1. Check destructuring FIRST
        const dMatch = line.match(destructureRegex);
        if (dMatch) {
            const [_, vars, funcName, args] = dMatch;
            if (funcName in PINE_INDICATORS || funcName.startsWith('ta.')) {
                const id = `_ind_${indCount++}`;
                const varNames = vars.split(',').map((v: string) => v.trim());

                indicatorDefs.push({
                    id,
                    name: funcName,
                    args: args.split(',').map((a: string) => a.trim()),
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

        // Convert alertcondition() to trading signals
        // alertcondition(condition, "Title", "Message") -> if (condition) signal
        const alertMatch = line.match(/^\s*alertcondition\s*\(\s*([^,]+)\s*,\s*['"]([^'"]+)['"]/);
        if (alertMatch) {
            const [, condition, title] = alertMatch;
            // Determine signal type from title keywords
            const titleLower = title.toLowerCase();
            let signalType = 'buy'; // default
            if (titleLower.includes('sell') || titleLower.includes('short') ||
                titleLower.includes('bearish') || titleLower.includes('down') ||
                titleLower.includes('bear')) {
                signalType = 'sell';
            } else if (titleLower.includes('buy') || titleLower.includes('long') ||
                titleLower.includes('bullish') || titleLower.includes('up') ||
                titleLower.includes('bull')) {
                signalType = 'buy';
            }
            // Generate signal code
            line = `if (${condition}) { signals.push({ time: candles[i].time, type: '${signalType}', price: candles[i].close, reason: '${title}' }); }`;
        }

        // Convert plotshape() to trading signals when it contains signal-like patterns
        // plotshape(condition ? value : na, "Title"...) -> if (condition) signal
        const plotshapeMatch = line.match(/^\s*plotshape\s*\(\s*([^?]+)\s*\?\s*[^:]+\s*:\s*na\s*,\s*['"]([^'"]+)['"]/);
        if (plotshapeMatch) {
            const [, condition, title] = plotshapeMatch;
            const titleLower = title.toLowerCase();
            let signalType = 'buy'; // default
            if (titleLower.includes('sell') || titleLower.includes('short') ||
                titleLower.includes('bearish') || titleLower.includes('down') ||
                titleLower.includes('bear') || titleLower.includes('lower')) {
                signalType = 'sell';
            } else if (titleLower.includes('buy') || titleLower.includes('long') ||
                titleLower.includes('bullish') || titleLower.includes('up') ||
                titleLower.includes('bull') || titleLower.includes('upper')) {
                signalType = 'buy';
            }
            line = `if (${condition.trim()}) { signals.push({ time: candles[i].time, type: '${signalType}', price: candles[i].close, reason: '${title}' }); }`;
        } else if (line.match(/^\s*plotshape\s*\(/)) {
            // Skip other plotshape calls that don't match the signal pattern
            continue;
        }

        // Clean other Visuals and Inputs
        if (
            line.match(/^\s*plot\s*\(/) ||
            line.match(/^\s*hline\s*\(/) ||
            line.match(/^\s*fill\s*\(/) ||
            line.match(/^\s*bgcolor\s*\(/) ||
            line.match(/^\s*barcolor\s*\(/) ||
            line.match(/^\s*plotcandle\s*\(/) ||
            line.match(/^\s*plotarrow\s*\(/) ||
            line.match(/^\s*plotbar\s*\(/) ||
            line.match(/^\s*plotchar\s*\(/) ||
            line.match(/^\s*table\.cell\s*\(/) ||
            line.match(/^\s*table\.new\s*\(/)
        ) {
            continue;
        }

        // Skip import statements (Pine Script v5/v6 library imports)
        if (line.match(/^\s*import\s+/)) {
            continue;
        }

        // Skip indicator() and study() declarations
        if (line.startsWith('indicator(') || line.startsWith('indicator ')) {
            continue;
        }
        if (line.startsWith('study(') || line.startsWith('strategy(') || line.startsWith('strategy ')) {
            if (!line.startsWith('strategy.')) {
                continue;
            }
        }

        // Handle Function Definition
        // Pattern: funcName(args) => expression
        const funcMatch = line.match(/^\s*([a-zA-Z0-9_]+)\(([^)]*)\)\s*=>\s*(.*)/);
        if (funcMatch) {
            const [_, name, args, body] = funcMatch;
            if (body && body.trim()) {
                // Single line expression (merged)
                line = `const ${name} = (${args}) => (${body});`;
            } else {
                // Block function - unsupported
                line = `// Function def removed: ${line}`;
                strippingIndentLevel = spaces;
                processedScript += line + '\n';
                continue;
            }
        }

        // Handle 'input'
        const inputMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*input\s*\((.*)\)/);
        if (inputMatch) {
            let [_, varName, argsStr] = inputMatch;
            let defVal = "";

            // Helper to extract named arg value respecting parentheses
            const extractArg = (key: string) => {
                const keyPattern = key + '=';
                let idx = argsStr.indexOf(keyPattern);
                if (idx === -1) {
                    // Try with spaces? "defval ="
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
                            else if (depth === 0) break; // Should not happen in valid inside-arg string usually, or end of expression
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
                // Positional: First argument if not named
                // We need to parse first arg similarly (scan until first comma at depth 0)
                let value = "";
                let depth = 0;
                let inString = false;
                let stringChar = '';

                // If it starts with name=..., then it is named, so positional is invalid?
                // Pine allows mixing? Usually positional comes first. 
                // If first char implies named arg "title=...", then no positional.
                // Simple check: does it look like "name="?
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
                            } else if (c === '(' || c === '[') { // inputs use () sometimes
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
            else if (defVal === 'open') defVal = 'candles[i].open';
            else if (defVal === 'high') defVal = 'candles[i].high';
            else if (defVal === 'low') defVal = 'candles[i].low';
            else if (defVal === 'volume') defVal = 'candles[i].volume';
            else if (defVal === 'hl2') defVal = '(candles[i].high + candles[i].low) / 2';

            processedScript += `const ${varName} = ${defVal};\n`;
            continue;
        }

        // Indicator Call Replacement
        line = line.replace(indicatorRegex, (fullMatch, funcName, argsStr) => {
            const id = `_ind_${indCount++}`;
            indicatorDefs.push({
                id,
                name: funcName,
                args: argsStr.split(',').map((a: string) => a.trim())
            });
            return `${id}[i]`;
        });

        // Helper for cross transpilation
        const crossRegex = /\b(cross|crossover|crossunder)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
        line = line.replace(crossRegex, (m, fn, a, b) => {
            const mode = fn === 'crossover' ? 1 : (fn === 'crossunder' ? -1 : 0);
            return `_cross(${mode}, '${a}', '${b}', i)`;
        });

        // Handle Series Access: var[idx]
        line = line.replace(/\b(open|high|low|close|volume)\[([^\]]+)\]/g, (m, name, idx) => {
            return `(candles[i - (${idx})] || {}).${name}`;
        });

        // Pass 1: Replace user var access
        line = line.replace(/(?<!\.)\b([a-zA-Z0-9_]+)\[([^\]]+)\]/g, (m, name, idx) => {
            if (name.startsWith('candles') || name.startsWith('_ind_') || name === 'signals') return m;
            return `_getSeries('${name}', i - (${idx}))`;
        });

        // Trap Assignment for History
        // Matches: var = expr OR var := expr
        const assignMatch = line.match(/^\s*(?:const\s+)?([a-zA-Z0-9_]+)\s*(:?=)\s*(.+)/);
        let seriesUpdate = "";
        if (assignMatch) {
            const [_, name, op, expr] = assignMatch;

            // Check if it's NOT an input (inputs handled earlier), not if, etc.
            if (!name.startsWith('_ind_') && name !== 'signals' && !line.includes('input(') && !line.startsWith('if ') && !op.includes('=>')) {
                // If operator is := (reassignment), just keep it as = (since JS doesn't have :=)
                // If operator is = (declaration), prepend `let` to avoid global pollution/const issues

                if (op === ':=') {
                    // Reassignment: replace := with =
                    line = line.replace(':=', '=');
                } else if (op === '=') {
                    // Declaration: ensure valid JS declaration
                    // check if already declared? No easy way to track in simple transpiler
                    // heuristic: always use 'let' if it starts the line
                    // But if it's inside 'if', 'let' is block scoped.
                    // Pine vars generated by 'var = x' are usually series (globalish)
                    // But in our runner loop, 'let' makes it local to iteration.
                    // This is acceptable for simple scripts where vars are recalculated.
                    // For persistent vars (Pine `var` keyword), we need `var` or outer scope.
                    // MVP: Use `let`.

                    // Don't add 'let' if it already has 'const' or 'let'
                    if (!line.match(/^\s*(let|const|var)\s+/)) {
                        line = line.replace(/^\s*([a-zA-Z0-9_]+)\s*=\s*/, 'let $1 = ');
                    }
                }

                seriesUpdate = `_setSeries('${name}', ${name});`;
            }
        }

        // 3. Strategy Commands
        const strategyEntryRegex = /strategy\.entry\(([^)]+)\)/g;
        line = line.replace(strategyEntryRegex, (m, argsStr) => {
            const args = argsStr.split(',').map((a: string) => a.trim());
            const id = args[0];
            const dirArg = args[1];
            const type = dirArg.includes('long') ? 'buy' : 'sell';

            let whenCond = 'true';
            const whenArg = args.find((a: string) => a.startsWith('when='));
            if (whenArg) whenCond = whenArg.replace('when=', '').trim();

            return `if (${whenCond}) signals.push({ time: candles[i].time, type: '${type}', price: candles[i].close, reason: ${id} });`;
        });

        line = line.replace(strategyCloseRegex, (m, id) => {
            return `// strategy.close not supported yet`;
        });

        // 4. Built-in Variables
        const replaceSeries = (name: string, prop: string) => {
            const re = new RegExp(`(?<!\\.)\\b${name}\\b(?!\\s*[:=\\(])`, 'g');
            line = line.replace(re, `candles[i].${prop}`);
        };

        replaceSeries('close', 'close');
        replaceSeries('open', 'open');
        replaceSeries('high', 'high');
        replaceSeries('low', 'low');
        replaceSeries('volume', 'volume');
        // Note: 'time' is NOT replaced here. Runner provides 'time' in milliseconds.

        // Operators
        // Use word boundaries to catch 'or' even if followed by non-whitespace (like comma or parens)
        // Be careful of strings, but usually fine for simple scripts
        line = line.replace(/\band\b/g, '&&');
        line = line.replace(/\bor\b/g, '||');

        processedScript += line + (seriesUpdate ? `\n${seriesUpdate}` : '') + '\n';
    }

    // Close remaining blocks
    while (indentStack.length > 1) {
        indentStack.pop();
        processedScript += "}\n";
    }

    return {
        jsCode: processedScript,
        indicators: indicatorDefs
    };
}
