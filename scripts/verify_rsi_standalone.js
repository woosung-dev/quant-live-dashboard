
// Standalone Verification Script for Pine Script Logic
// Runs with: node scripts/verify_rsi_standalone.js
// Contains bundled Transpiler and Runner logic to bypass TS/Next.js environment issues.

// --- 1. INDICATORS (Mocked for required functions) ---
const PINE_INDICATORS = {
    'ta.rsi': (prices, length) => {
        // Simple RSI implementation
        if (prices.length < length) return prices.map(p => 50);
        const rsi = [];
        let gain = 0, loss = 0;
        for (let i = 1; i <= length; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) gain += change; else loss -= change;
        }
        gain /= length; loss /= length;
        rsi[length] = 100 - (100 / (1 + (gain / loss || 1))); // Initial

        // Smoothed
        for (let i = length + 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) {
                gain = (gain * (length - 1) + change) / length;
                loss = (loss * (length - 1)) / length;
            } else {
                gain = (gain * (length - 1)) / length;
                loss = (loss * (length - 1) - change) / length;
            }
            rsi[i] = 100 - (100 / (1 + (gain / loss || 1)));
        }
        // Fill start with NaNs or 50
        for (let i = 0; i <= length; i++) if (rsi[i] === undefined) rsi[i] = 50;
        return rsi;
    },
    'ta.ema': (prices, len) => prices, // Mock
    'ta.sma': (prices, len) => prices, // Mock
    'ta.macd': (prices, f, s, sig) => ({ macdLine: prices, signalLine: prices, hist: prices }), // Mock
};

// --- 2. TRANSPILER (Pasted & Adapted from transpiler.ts fix) ---
function transpilePineScript(script) {
    const lines = script.split('\n');
    const indicatorDefs = [];
    let processedScript = "";
    let indCount = 0;

    // State for indentation tracking
    const indentStack = [0];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (!line.trim()) continue;

        const match = line.match(/^(\s*)/);
        const spaces = match ? match[1].length : 0;

        const currentLevel = indentStack[indentStack.length - 1];
        let bracePrefix = "";
        let braceSuffix = "";

        if (spaces > currentLevel) {
            bracePrefix = " {\n";
            indentStack.push(spaces);
        } else if (spaces < currentLevel) {
            // Indent Decreased -> Close Blocks
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
            if (!trimmedLine.includes('(')) {
                line = trimmedLine.replace(/^if\s+(.*)/, 'if ($1)');
            } else {
                line = trimmedLine;
            }
        } else {
            line = trimmedLine;
        }

        // Map v4 names to v5 (basic)
        line = line.replace(/\brsi\(/g, 'ta.rsi(');

        // Indicator Regex
        const indicatorRegex = /(ta\.[a-zA-Z0-9_]+)\(([^)]*)\)/g;
        // Simple replace for indicators
        line = line.replace(indicatorRegex, (full, funcName, argsStr) => {
            const id = `_ind_${indCount++}`;
            indicatorDefs.push({
                id,
                name: funcName,
                args: argsStr.split(',').map(a => a.trim())
            });
            return `${id}[i]`;
        });

        // Strategy Entry
        const strategyEntryRegex = /strategy\.entry\(([^)]+)\)/g;
        line = line.replace(strategyEntryRegex, (m, argsStr) => {
            const args = argsStr.split(',').map(a => a.trim());
            const id = args[0];
            const dirArg = args[1];
            const type = dirArg.includes('long') ? 'buy' : 'sell';
            return `signals.push({ time: candles[i].time, type: '${type}', price: candles[i].close, reason: ${id} });`;
        });

        // Built-ins
        line = line.replace(/\bclose\b/g, 'candles[i].close');

        processedScript += line + '\n';
    }

    while (indentStack.length > 1) {
        indentStack.pop();
        processedScript += "}\n";
    }

    return { jsCode: processedScript, indicatorDefs };
}

// --- 3. RUNNER ---
function runPineScript(script, candles) {
    const { jsCode, indicatorDefs } = transpilePineScript(script);

    // Calculate Indicators
    const indicatorContext = {};
    const prices = candles.map(c => c.close);

    for (const def of indicatorDefs) {
        // Assume static args for this test
        // rsi(close, 14) -> close is handled by PINE_INDICATORS expecting array
        // arg[0] might be 'close' (string). 
        // We know 'ta.rsi' needs (prices, len).
        const result = PINE_INDICATORS[def.name](prices, 14); // Hardcoded 14 for simplicity or parse
        indicatorContext[def.id] = result;
    }

    // Execute
    const fnBody = `
        const signals = [];
        const { ${Object.keys(indicatorContext).join(', ')} } = indicators;
        
        for (let i = 0; i < candles.length; i++) {
            try {
                ${jsCode}
            } catch (err) {
                console.error("Runtime Error at candle " + i, err);
            }
        }
        return signals;
    `;

    console.log("--- Generated JS ---");
    console.log(fnBody);
    console.log("--------------------");

    const fn = new Function('candles', 'indicators', fnBody);
    return fn(candles, indicatorContext);
}

// --- 4. DATA & TEST ---
const candles = Array.from({ length: 200 }, (_, i) => {
    // Sine wave swinging 20 to 180 (centered 100, amp 80? No, rsi needs smooth)
    // RSI moves based on rel strength.
    const price = 100 + Math.sin(i * 0.1) * 50;
    return {
        time: i * 60000,
        close: price
    };
});

const script = `
rsi = ta.rsi(close, 14)
if rsi < 30
    strategy.entry("Long", strategy.long)
if rsi > 70
    strategy.entry("Short", strategy.short)
`;

console.log("=== RUNNING TEST ===");
const signals = runPineScript(script, candles);
console.log("Signals:", signals.length);
if (signals.length > 0) console.log("First Signal:", signals[0]);
