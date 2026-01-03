import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function LiveBotsPage() {
    const t = useTranslations('LiveBots');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <button className="bg-primary text-black px-4 py-2 rounded font-bold">
                    {t('deployNew')}
                </button>
            </div>

            <div className="grid gap-4">
                {[1, 2].map((i) => (
                    <Link key={i} href={`/dashboard/live/bot-${i}`}>
                        <Card className="p-6 hover:border-primary transition cursor-pointer flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-xl font-bold">BTC Trend Follower #{i}</h2>
                                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full font-bold border border-green-500/20">
                                        {t('running')}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm">{t('strategy')}: SMA Crossover • {t('exchange')}: Binance</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-green-500">+$1,234.00</p>
                                <p className="text-xs text-gray-500">{t('totalPnL')}</p>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
