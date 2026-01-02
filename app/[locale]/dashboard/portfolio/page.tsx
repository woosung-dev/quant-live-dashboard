'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function PortfolioPage() {
    const t = useTranslations('Portfolio');
    const [balances, setBalances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalances = async () => {
            try {
                const res = await fetch('/api/exchange/balance');
                const data = await res.json();
                if (data.balances) {
                    setBalances(data.balances);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchBalances();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('title')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asset Allocation */}
                <Card className="p-6 h-80 flex flex-col items-center justify-center">
                    <h2 className="text-xl font-bold mb-4 self-start">{t('allocation')}</h2>
                    <div className="w-48 h-48 rounded-full border-8 border-primary/20 flex items-center justify-center">
                        <span className="text-gray-400">{t('pieChart')}</span>
                    </div>
                </Card>

                {/* Exchange Balances */}
                <Card className="p-6 min-h-80">
                    <h2 className="text-xl font-bold mb-4">{t('balances')}</h2>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin" size={24} />
                        </div>
                    ) : balances.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            {t('noBalances')}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {balances.map((balance: any) => (
                                <div key={balance.asset} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#F3BA2F] rounded-full flex items-center justify-center text-black font-bold text-xs">
                                            {balance.asset[0]}
                                        </div>
                                        <span className="font-bold">{balance.asset}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{balance.total.toFixed(8)}</p>
                                        <p className="text-xs text-gray-500">{t('available')}: {balance.free.toFixed(8)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Transaction History */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">{t('recentTransactions')}</h2>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="p-3">{t('table.date')}</th>
                            <th className="p-3">{t('table.exchange')}</th>
                            <th className="p-3">{t('table.type')}</th>
                            <th className="p-3">{t('table.asset')}</th>
                            <th className="p-3">{t('table.amount')}</th>
                            <th className="p-3">{t('table.status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b last:border-0">
                            <td className="p-3">2023-10-05</td>
                            <td className="p-3">Binance</td>
                            <td className="p-3">{t('table.deposit')}</td>
                            <td className="p-3">USDT</td>
                            <td className="p-3 text-green-500">+$1,000.00</td>
                            <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t('table.completed')}</span></td>
                        </tr>
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
