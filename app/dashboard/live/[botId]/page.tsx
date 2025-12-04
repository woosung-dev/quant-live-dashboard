'use client';

import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';

export default function BotConsolePage() {
    const params = useParams();
    const botId = params.botId;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Bot Console: {botId}</h1>
                    <p className="text-sm text-green-500 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live Trading Active
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-500/10 font-bold">
                        Stop Bot
                    </button>
                    <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-bold">
                        Liquidate All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Chart & Status */}
                <div className="lg:col-span-2 flex flex-col gap-6 h-full">
                    <Card className="flex-1 p-4 bg-gray-900 flex items-center justify-center border-gray-800">
                        <p className="text-gray-500">Real-time Chart Stream</p>
                    </Card>
                    <Card className="h-48 p-4 overflow-auto font-mono text-xs bg-black text-green-400 border-gray-800">
                        <div className="mb-1">[INFO] 2023-10-05 14:30:01 - Connecting to Binance WebSocket...</div>
                        <div className="mb-1">[INFO] 2023-10-05 14:30:02 - Connection established.</div>
                        <div className="mb-1">[INFO] 2023-10-05 14:30:05 - Subscribed to BTCUSDT ticker.</div>
                        <div className="mb-1">[INFO] 2023-10-05 14:31:00 - Price update: $42,150.00</div>
                        <div className="mb-1">[WARN] 2023-10-05 14:32:00 - High volatility detected.</div>
                    </Card>
                </div>

                {/* Side Panel */}
                <div className="flex flex-col gap-6 h-full">
                    <Card className="p-6">
                        <h3 className="font-bold mb-4">Current Positions</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold">BTC/USDT</p>
                                    <p className="text-xs text-gray-500">Long 0.5 BTC</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-500 font-bold">+$120.00</p>
                                    <p className="text-xs text-gray-500">Unrealized PnL</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 flex-1">
                        <h3 className="font-bold mb-4">Order History</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>14:20</span>
                                <span>BUY 0.5 BTC</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>13:00</span>
                                <span>SELL 0.5 BTC</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
