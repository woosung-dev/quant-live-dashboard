import { BacktestConfig } from '../types';
import { runBacktest } from '../features/backtest/lib/engine';
import { strategies } from '../features/backtest/strategies';

async function main() {
    console.log('🚀 Starting Backtest Engine Test...');

    const config: BacktestConfig = {
        symbol: 'BTCUSDT',
        timeframe: '1d',
        limit: 500,
        initialCapital: 10000
    };

    for (const strategy of strategies) {
        console.log(`\nTesting Strategy: ${strategy.name} (${strategy.id})`);

        const params: Record<string, any> = {};
        strategy.parameters.forEach(p => {
            params[p.name] = p.defaultValue;
        });

        const startTime = performance.now();
        const result = await runBacktest(config, strategy, params);
        const endTime = performance.now();

        console.log(`✅ ${strategy.name} Completed in ${(endTime - startTime).toFixed(2)}ms`);
        console.log('-----------------------------------');
        console.log(`Candles: ${result.candles.length}`);
        console.log(`Trades: ${result.trades.length}`);
        console.log(`Win Rate: ${result.metrics.winRate.toFixed(2)}%`);
        console.log(`Net Profit: $${result.metrics.netProfit.toFixed(2)} (${result.metrics.netProfitPercent.toFixed(2)}%)`);

        if (result.trades.length > 0) {
            console.log('Last Trade:', result.trades[result.trades.length - 1]);
        }
    }
}

main().catch(console.error);
