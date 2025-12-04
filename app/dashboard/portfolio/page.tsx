import { Card } from '@/components/ui/card';

export default function PortfolioPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Portfolio & Assets</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asset Allocation */}
                <Card className="p-6 h-80 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-bold mb-4 self-start">Asset Allocation</h2>
                    <div className="w-48 h-48 rounded-full border-8 border-primary/20 flex items-center justify-center">
                        <span className="text-gray-400">Pie Chart</span>
                    </div>
                </Card>

                {/* Exchange Balances */}
                <Card className="p-6 h-80">
                    <h2 className="text-xl font-bold mb-4">Exchange Balances</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
                                <span className="font-bold">Binance</span>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">$10,234.00</p>
                                <p className="text-xs text-gray-500">2.1 BTC</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                                <span className="font-bold">Upbit</span>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">$5,120.00</p>
                                <p className="text-xs text-gray-500">4,500,000 KRW</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Transaction History */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Exchange</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Asset</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b last:border-0">
                            <td className="p-3">2023-10-05</td>
                            <td className="p-3">Binance</td>
                            <td className="p-3">Deposit</td>
                            <td className="p-3">USDT</td>
                            <td className="p-3 text-green-500">+$1,000.00</td>
                            <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span></td>
                        </tr>
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
