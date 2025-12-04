export default function DocsPage() {
    return (
        <div className="container mx-auto py-20 px-4 flex gap-10">
            {/* Sidebar */}
            <aside className="w-64 hidden md:block border-r pr-6">
                <h3 className="font-bold mb-4 text-lg">Documentation</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                    <li className="text-primary font-medium">Introduction</li>
                    <li className="hover:text-primary cursor-pointer">Getting Started</li>
                    <li className="hover:text-primary cursor-pointer">Strategy Guide</li>
                    <li className="hover:text-primary cursor-pointer">API Reference</li>
                    <li className="hover:text-primary cursor-pointer">FAQ</li>
                </ul>
            </aside>

            {/* Content */}
            <main className="flex-1 max-w-3xl">
                <h1 className="text-4xl font-bold mb-6">Introduction to Quant.Live</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                    Quant.Live is a powerful platform for designing, backtesting, and executing algorithmic trading strategies in real-time.
                </p>

                <h2 className="text-2xl font-bold mb-4">How it works</h2>
                <div className="prose dark:prose-invert max-w-none">
                    <p>
                        1. <strong>Create a Strategy</strong>: Use our visual builder or code editor to define your trading logic.
                    </p>
                    <p>
                        2. <strong>Backtest</strong>: Run your strategy against historical data to verify its performance.
                    </p>
                    <p>
                        3. <strong>Go Live</strong>: Connect your exchange API keys and deploy your bot to trade with real funds.
                    </p>
                </div>
            </main>
        </div>
    );
}
