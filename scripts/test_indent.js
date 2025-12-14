
// Simple script to test Indentation Handling for Pine Transpiler logic
// Run with: node scripts/test_indent.js

function transpileIndent(script) {
    const lines = script.split('\n');
    let output = "";

    let indentStack = [0]; // Stack of indent levels

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (!line.trim()) continue; // Skip empty? Or preserve?

        // 1. Calculate Indent (spaces)
        // Assume 4 spaces or 1 tab? Or just count spaces
        const match = line.match(/^(\s*)/);
        const spaces = match ? match[1].length : 0; // Tabs?
        // Tab = 4 spaces heuristic?
        // Let's assume user uses spaces for now or consistent tabs.

        // 2. Handle Indent Change
        const currentLevel = indentStack[indentStack.length - 1];

        if (spaces > currentLevel) {
            // Indent increased -> Open Block
            // Wait, usually the block opens AFTER the previous line's control statement.
            // "if cond"
            // "    stmt"
            // We need to inject { at the end of PREVIOUS line? Or start of this?
            // JS: if (cond) { ... }
            // If we put { at start of this line, it works?
            // "if (cond)"
            // "{ stmt }"
            // Yes, JS ignores newline.

            output += " {\n"; // Inject opening brace
            indentStack.push(spaces);
        } else if (spaces < currentLevel) {
            // Indent decreased -> Close Block
            while (indentStack.length > 0 && indentStack[indentStack.length - 1] > spaces) {
                indentStack.pop();
                output += "}\n";
            }
        }

        // 3. Process Line
        const trimmed = line.trim();

        // Handle "if condition" -> "if (condition)"
        // Regex: if [no parens] ...
        // Simplistic: if (line.startsWith('if ') && !line.includes('('))
        let processed = trimmed;
        if (processed.startsWith('if ')) {
            // ensure parens. 
            // "if rsi < 30" -> "if (rsi < 30)"
            if (!processed.includes('(')) {
                processed = processed.replace(/^if\s+(.*)/, 'if ($1)');
            }
        }

        // Add semi-colon?
        // Pine lines don't use ;. JS needs it (often).

        output += processed + "\n";
    }

    // Close remaining blocks
    while (indentStack.length > 1) { // Keep 0?
        indentStack.pop();
        output += "}\n";
    }

    return output;
}

const testScript = `
norm = 1
if norm > 0
    val = 10
    if val > 5
        buy
    sell
next
`;

console.log("--- Input ---");
console.log(testScript);
console.log("\n--- Output ---");
console.log(transpileIndent(testScript));
