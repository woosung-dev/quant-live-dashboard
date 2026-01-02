'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  BarChart3,
  Bell,
  Zap,
  Shield,
  ChevronRight,
  Play,
  ArrowRight
} from 'lucide-react';
import { PriceChart } from '@/components/charts/PriceChart';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Footer } from '@/components/layout/Footer';

const getFeatures = (t: any) => [
  {
    icon: BarChart3,
    title: t('features.backtest.title'),
    desc: t('features.backtest.desc'),
    color: "from-emerald-400 to-cyan-400"
  },
  {
    icon: Bell,
    title: t('features.alerts.title'),
    desc: t('features.alerts.desc'),
    color: "from-blue-400 to-purple-400"
  },
  {
    icon: Zap,
    title: t('features.autotrading.title'),
    desc: t('features.autotrading.desc'),
    color: "from-orange-400 to-pink-400"
  },
  {
    icon: Shield,
    title: t('features.security.title'),
    desc: t('features.security.desc'),
    color: "from-violet-400 to-indigo-400"
  }
];

export default function Home() {
  const t = useTranslations('LandingPage');
  const features = getFeatures(t);
  const { price, isConnected } = useWebSocket('btcusdt');
  const [history, setHistory] = useState<{ time: number; value: number }[]>([]);

  // Fetch initial history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=100');
        const data = await res.json();
        const initialHistory = data.map((d: any) => ({
          time: d[0] / 1000,
          value: parseFloat(d[4])
        }));
        setHistory(initialHistory);
      } catch (e) {
        console.error('Failed to fetch history', e);
      }
    };
    fetchHistory();
  }, []);

  // Update with real-time data
  useEffect(() => {
    if (price > 0) {
      setHistory(prev => {
        const newPoint = { time: Date.now() / 1000, value: price };
        const updated = [...prev, newPoint];
        if (updated.length > 200) return updated.slice(-200);
        return updated;
      });
    }
  }, [price]);

  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen bg-background text-foreground">
        {/* Hero Section - 뱅크샐러드 스타일 그라데이션 */}
        <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-background" />

          {/* Animated Orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/30 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center max-w-5xl w-full px-6 py-20">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t('hero.badge')}
              </span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-center leading-tight mb-6"
            >
              <span className="text-foreground" dangerouslySetInnerHTML={{ __html: t.raw('hero.title').replace('\n', '<br/>') }} />
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-10"
            >
              <span dangerouslySetInnerHTML={{ __html: t.raw('hero.subtitle').replace('\n', '<br class="hidden sm:block" />') }} />
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 mb-16"
            >
              <Link
                href="/signup"
                className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                {t('hero.startFree')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/docs"
                className="px-8 py-4 bg-card border border-border text-foreground font-semibold text-lg rounded-2xl hover:bg-muted transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t('hero.viewDocs')}
              </Link>
            </motion.div>

            {/* Live Chart Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-4xl"
            >
              <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-6 shadow-2xl">
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-sm">₿</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">BTC/USDT</h3>
                      <p className="text-sm text-muted-foreground">Bitcoin</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <div className="flex items-center gap-1 text-sm">
                      <span className={`flex items-center gap-1 ${isConnected ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'}`} />
                        {isConnected ? t('hero.chartLive') : t('hero.chartConnecting')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-64 rounded-2xl overflow-hidden">
                  <PriceChart data={history} />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section - 뱅크샐러드 스타일 카드 */}
        <section className="py-24 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                {t('features.title')} <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">QUANT.LIVE</span>?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('features.subtitle')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group p-8 rounded-3xl bg-card border border-border hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 px-6 bg-gradient-to-b from-background to-card">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8 text-center"
            >
              {[
                { value: "10,000+", label: t('stats.backtests'), suffix: t('stats.times') },
                { value: "500+", label: t('stats.strategies'), suffix: t('stats.count') },
                { value: "99.9%", label: t('stats.uptime'), suffix: "" }
              ].map((stat, i) => (
                <div key={i} className="p-8">
                  <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground text-lg">{stat.label}{stat.suffix}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-background relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[150px]" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              <span dangerouslySetInnerHTML={{ __html: t.raw('cta.title').replace('\n', '<br/>') }} />
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground mb-10"
            >
              {t('cta.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-xl rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25"
              >
                {t('cta.button')}
                <ChevronRight className="w-6 h-6" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

