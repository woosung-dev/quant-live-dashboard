'use client';

import { useEffect, useState, useRef } from 'react';
import { PriceChart } from '@/components/charts/PriceChart';
import { ProfitDisplay } from '@/components/simulation/ProfitDisplay';
import { useWebSocket } from '@/hooks/useWebSocket';
import { calculateSimulation } from '@/features/backtest/lib/simulation';
import { SimulationResult } from '@/types';
import { ProblemSection } from '@/components/sections/ProblemSection';
import { SolutionSection } from '@/components/sections/SolutionSection';
import { CTASection } from '@/components/sections/CTASection';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Footer } from '@/components/layout/Footer';

export default function Home() {
  const { price, isConnected } = useWebSocket('btcusdt');
  const [history, setHistory] = useState<{ time: number; value: number }[]>([]);
  const [prices, setPrices] = useState<number[]>([]);
  const [result, setResult] = useState<SimulationResult>({
    totalPnL: 0,
    winRate: 0,
    trades: 0,
    equityCurve: []
  });

  // Fetch initial history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500');
        const data = await res.json();
        const initialPrices = data.map((d: any) => parseFloat(d[4])); // Close price
        const initialHistory = data.map((d: any) => ({
          time: d[0] / 1000,
          value: parseFloat(d[4])
        }));

        setPrices(initialPrices);
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
      setPrices(prev => {
        const newPrices = [...prev, price];
        // Keep last 1000 points to avoid memory leak in long run
        if (newPrices.length > 1000) return newPrices.slice(-1000);
        return newPrices;
      });

      setHistory(prev => {
        const newPoint = { time: Date.now() / 1000, value: price };
        // De-duplicate if time is same (unlikely with ms precision but good practice)
        if (prev.length > 0 && prev[prev.length - 1].time === newPoint.time) {
          return [...prev.slice(0, -1), newPoint];
        }
        return [...prev, newPoint];
      });
    }
  }, [price]);

  // Run Simulation
  useEffect(() => {
    if (prices.length > 0) {
      const res = calculateSimulation(prices);
      setResult(res);
    }
  }, [prices]);

  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Hero Section */}
        <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">

          {/* Background Chart */}
          <div className="absolute inset-0 z-0 opacity-30">
            <PriceChart data={history} />
          </div>

          {/* Content Overlay */}
          <div className="z-10 flex flex-col items-center space-y-8 max-w-4xl w-full px-4">
            <div className="text-center space-y-4">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                QUANT<span className="text-primary">.LIVE</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                실시간 트레이딩 전략 백테스트 & 시뮬레이션.
                <br />
                당신의 알고리즘이 실제 시장에서 어떻게 동작하는지 확인하세요.
              </p>
            </div>

            {/* Live Simulation Card */}
            <div className="w-full max-w-2xl">
              <ProfitDisplay
                pnl={result.totalPnL}
                winRate={result.winRate}
                trades={result.trades}
              />
              <div className="mt-2 flex justify-between text-xs text-gray-500 font-mono">
                <span>상태: {isConnected ? '실시간 연결됨' : '연결 중...'}</span>
                <span>BTC/USDT: ${price.toFixed(2)}</span>
              </div>
            </div>

            {/* CTA */}
            <button className="px-8 py-4 bg-primary text-black font-bold text-lg rounded-full hover:bg-opacity-90 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,255,148,0.5)]">
              시뮬레이션 시작하기
            </button>
          </div>
        </section>

        <ProblemSection />
        <SolutionSection />
        <CTASection />

      </main>
      <Footer />
    </>
  );
}
