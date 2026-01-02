'use client';

import { Card } from '@/components/ui/card';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslations } from 'next-intl';

export default function DashboardOverviewPage() {
    const t = useTranslations('Dashboard');
    const { prices, isConnected } = useWebSocket(['btcusdt', 'ethusdt', 'solusdt']);

    const tickerItems = [
        { symbol: 'BTC/USDT', key: 'btcusdt' },
        { symbol: 'ETH/USDT', key: 'ethusdt' },
        { symbol: 'SOL/USDT', key: 'solusdt' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('title')}</h1>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-500">{t('totalEquity')}</h3>
                    <p className="text-2xl font-bold">$12,345.67</p>
                    <span className="text-xs text-green-500">+2.5% {t('today')}</span>
                </Card>
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-500">{t('activeBots')}</h3>
                    <p className="text-2xl font-bold">3</p>
                    <span className="text-xs text-gray-500">{t('running')}</span>
                </Card>
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-500">{t('dailyPnL')}</h3>
                    <p className="text-2xl font-bold text-green-500">+$123.45</p>
                </Card>
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-500">{t('winRate')}</h3>
                    <p className="text-2xl font-bold">68%</p>
                    <span className="text-xs text-gray-500">Last 30 days</span>
                </Card>
            </div>

            {/* Placeholder for Equity Curve */}
            <Card className="p-6 h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900 border-dashed">
                <p className="text-gray-400">{t('equityCurvePlaceholder')}</p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">{t('recentActivity')}</h2>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <div>
                                    <p className="font-medium">Bot #{i} executed BUY BTC</p>
                                    <p className="text-xs text-gray-500">2 minutes ago</p>
                                </div>
                                <span className="text-sm font-bold text-green-500">+$12.00</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Market Ticker */}
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">{t('marketTicker')}</h2>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? t('connected') : t('disconnected')} />
                    </div>
                    <div className="space-y-4">
                        {tickerItems.map((item) => (
                            <div key={item.key} className="flex justify-between items-center">
                                <span className="font-medium">{item.symbol}</span>
                                <span className={`font-mono ${prices[item.key] ? 'text-foreground' : 'text-gray-500'}`}>
                                    {prices[item.key]
                                        ? `$${prices[item.key].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : t('loading')}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
