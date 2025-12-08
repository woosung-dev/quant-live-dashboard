
import { rsiDivergenceStrategy } from '../features/backtest/strategies/rsi-divergence';
import { runBacktest } from '../features/backtest/lib/engine';
import { BacktestConfig } from '../features/backtest/types';

const config: BacktestConfig = {
    symbol: 'BTCUSDT',
    timeframe: '1d',
    initialCapital: 10000,
    limit: 100,
    // Add dummy dates if needed, or let runBacktest handle it
};

async function main() {
    console.log("Starting backtest...");
    try {
        const result = await runBacktest(config, rsiDivergenceStrategy, {
            period: 14,
            overbought: 70,
            oversold: 30
        });
        console.log("Backtest Success!");
        console.log("Trades:", result.trades.length);
        console.log("Net Profit:", result.metrics.netProfit);
        console.log("Candles:", result.candles.length);
    } catch (e) {
        console.error("Backtest Failed:", e);
    }
}

main();
