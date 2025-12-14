
// scripts/reproduce_crash.ts
// This file manually combines logic from indicators.ts, transpiler.ts, and runner.ts 
// to exactly reproduce the execution flow and error.

// --- 1. MOCK INDICATORS (Match indicators.ts logic) ---
const PINE_INDICATORS = {
    'ta.rsi': (prices, length) => {
        // Simple RSI Mock that works
        if (!prices || prices.length === 0) return [];
        return prices.map(p => 50); // Valid Array
    },
    'ta.ema': (prices, len) => prices,
    'ta.sma': (prices, len) => prices,
    'ta.macd': (prices, f, s, sig) => ({ macdLine: prices, signalLine: prices, hist: prices }),
    'ta.crossover': (s1, s2) => s1.map(v => false),
    'ta.crossunder': (s1, s2) => s1.map(v => false),
};

// --- 2. TRANSPILER LOGIC (Match transpiler.ts) ---
function transpilePineScript(script) {
    const lines = script.split('\n');
    const indicatorDefs = [];
    let processedScript = "";
    let indCount = 0;
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
            while (indentStack.length > 1 && indentStack[indentStack.length - 1] > spaces) {
                indentStack.pop();
                braceSuffix += "}\n";
            }
        }
        if (braceSuffix) processedScript += braceSuffix;
        if (bracePrefix) processedScript += bracePrefix;

        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//')) continue;

        // IF logic
        if (trimmedLine.startsWith('if ')) {
            if (!trimmedLine.includes('(')) {
                line = trimmedLine.replace(/^if\s+(.*)/, 'if ($1)');
            } else {
                line = trimmedLine;
            }
        } else {
            line = trimmedLine;
        }

        // Helper Map
        line = line.replace(/\brsi\(/g, 'ta.rsi(');

        // Indicator Replace
        const indicatorRegex = /(ta\.[a-zA-Z0-9_]+)\(([^)]*)\)/g;
        line = line.replace(indicatorRegex, (fullMatch, funcName, argsStr) => {
            const id = `_ind_${indCount++}`;
            indicatorDefs.push({
                id,
                name: funcName,
                args: argsStr.split(',').map((a) => a.trim())
            });
            return `${id}[i]`;
        });

        // Strategy
        const strategyEntryRegex = /strategy\.entry\(([^)]+)\)/g;
        line = line.replace(strategyEntryRegex, (m, argsStr) => {
            return `signals.push({ type: 'buy', price: candles[i].close });`;
        });

        // Built-ins
        line = line.replace(/\bclose\b/g, 'candles[i].close');

        processedScript += line + '\n';
    }
    while (indentStack.length > 1) {
        indentStack.pop();
        processedScript += "}\n";
    }
    return { jsCode: processedScript, indicators: indicatorDefs };
}

// --- 3. RUNNER LOGIC (Match runner.ts) ---
function runPineScript(script, candles) {
    console.log("Runner: Start");
    const { jsCode, indicators: indicatorDefs } = transpilePineScript(script);
    console.log("Runner: Transpiled Indicators:", indicatorDefs);

    const inputMap = new Map();
    // (Skipping input logic for simplicity as standard RSI has no inputs usually used here)

    const indicatorContext = {};

    // --- SAFEGUARD ADDED IN STEP 432 ---
    for (const def of indicatorDefs) {
        const func = PINE_INDICATORS[def.name];
        if (!func) {
            console.warn(`Indicator function not found for: ${def.name}`);
            indicatorContext[def.id] = [];
            continue;
        }

        // Mock args resolution
        const args = def.args.map(argRaw => {
            const arg = argRaw.trim();
            const num = parseFloat(arg);
            if (!isNaN(num) && isFinite(num)) return num;
            if (arg === 'close') return candles.map(c => c.close);
            return arg;
        });

        const result = func(...args);
        console.log(`Computed ${def.id} result length:`, result ? result.length : 'undefined');
        indicatorContext[def.id] = result;
    }

    console.log("Runner: Context Keys:", Object.keys(indicatorContext));

    // FN Creation
    const fnBody = `
        const signals = [];
        const keys = Object.keys(indicators);
        if (!keys) console.error("Keys undefined?!");
        const { ${Object.keys(indicatorContext).join(', ')} } = indicators;
        
        // Helpers
        const ta = { rsi: () => 50 }; // Mock
        
        for (let i = 0; i < candles.length; i++) {
            try {
                ${jsCode}
            } catch (err) {
                console.error("Runtime Error at candle " + i, err);
                throw err; // Re-throw to simulate crash
            }
        }
        return signals;
    `;

    console.log("--- Generated JS Body ---");
    console.log(fnBody);
    console.log("-------------------------");

    try {
        const fn = new Function('candles', 'indicators', fnBody);
        return fn(candles, indicatorContext);
    } catch (e) {
        console.error("CRASH:", e);
        throw e;
    }
}

// --- 4. TEST ---
const candles = Array.from({ length: 10 }, (_, i) => ({ close: 100 + i, time: i * 60000 }));
const script = `
rsi = ta.rsi(close, 14)
if (rsi < 30)
    strategy.entry("Long", strategy.long)
`;

console.log("=== RUNNING REPRODUCTION ===");
try {
    const res = runPineScript(script, candles);
    console.log("Success! Signals:", res.length);
} catch (e) {
    console.log("CAUGHT CRASH:", e.message);
}
