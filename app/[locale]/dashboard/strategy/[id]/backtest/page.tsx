'use client';

import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';

export default function BacktestPage() {
    const params = useParams();
    const id = params.id;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Backtest Results: Strategy #{id}</h1>
                <button className="bg-primary text-black px-4 py-2 rounded font-bold">
                    Run New Backtest
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <Card className="lg:col-span-2 p-6 h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <p className="text-gray-400">Interactive Candle Chart + Buy/Sell Markers</p>
                </Card>

                {/* Stats Panel */}
                <Card className="p-6 space-y-6">
                    <div>
                        <h3 className="text-sm text-gray-500">Total Return</h3>
                        <p className="text-3xl font-bold text-green-500">+145.2%</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-xs text-gray-500">Sharpe Ratio</h3>
                            <p className="font-mono font-bold">1.84</p>
                        </div>
                        <div>
                            <h3 className="text-xs text-gray-500">Max Drawdown</h3>
                            <p className="font-mono font-bold text-red-500">-12.4%</p>
                        </div>
                        <div>
                            <h3 className="text-xs text-gray-500">Win Rate</h3>
                            <p className="font-mono font-bold">65%</p>
                        </div>
                        <div>
                            <h3 className="text-xs text-gray-500">Trades</h3>
                            <p className="font-mono font-bold">423</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Trade List */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Trade History</h2>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                                <th className="p-3">Time</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Price</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">PnL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="p-3">2023-10-0{i} 12:00</td>
                                    <td className={`p-3 font-bold ${i % 2 === 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {i % 2 === 0 ? 'SELL' : 'BUY'}
                                    </td>
                                    <td className="p-3">$42,10{i}.00</td>
                                    <td className="p-3">0.5 BTC</td>
                                    <td className="p-3 text-green-500">+$12{i}.00</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
