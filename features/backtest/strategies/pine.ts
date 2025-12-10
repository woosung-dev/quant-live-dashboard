import { Strategy, Candle, ParameterDefinition, StrategyResult } from '@/types';
import { runPineScript } from '../lib/pine/runner';

// Initial default script
const DEFAULT_SCRIPT = `
// RSI Strategy
rsi = ta.rsi(close, 14)
if (rsi < 30)
    strategy.entry("Long", strategy.long)
if (rsi > 70)
    strategy.entry("Short", strategy.short) // Treated as sell/exit
`;

const parameters: ParameterDefinition[] = [
    {
        name: 'code',
        label: 'Pine Script',
        type: 'select', // Using 'select' type as placeholder, but UI will render Editor
        defaultValue: DEFAULT_SCRIPT,
        options: [] // Hidden in UI custom renderer
    }
];

function execute(candles: Candle[], params: Record<string, any>): StrategyResult {
    const code = params.code as string || DEFAULT_SCRIPT;
    return runPineScript(code, candles);
}

export const pineStrategy: Strategy = {
    id: 'pine-script',
    name: 'Custom Pine Script',
    description: 'Write your own strategy using Pine Script Lite syntax.',
    parameters,
    execute
};
