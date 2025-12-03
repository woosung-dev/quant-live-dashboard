'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { StrategyEditor } from '@/components/forms/StrategyEditor';
import { PriceChart } from '@/components/charts/PriceChart';
import { ProfitDisplay } from '@/components/simulation/ProfitDisplay';
import { useWebSocket } from '@/hooks/useWebSocket';
import { calculateSimulation, runBacktest } from '@/lib/simulation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StrategyDetailPage() {
    const { id } = useParams();
    const [strategy, setStrategy] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Real-time data
    const { price, isConnected } = useWebSocket('btcusdt');
    const [history, setHistory] = useState<{ time: number; value: number }[]>([]);
    const [prices, setPrices] = useState<number[]>([]);
    const [result, setResult] = useState<any>({ totalPnL: 0, winRate: 0, trades: 0 });

    // Fetch Strategy
    useEffect(() => {
        const fetchStrategy = async () => {
            const { data } = await supabase.from('strategies').select('*').eq('id', id).single();
            if (data) setStrategy(data);
            setLoading(false);
        };
        fetchStrategy();
    }, [id]);

    // Fetch History (Same as Home)
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500');
                const data = await res.json();
                const initialPrices = data.map((d: any) => parseFloat(d[4]));
                const initialHistory = data.map((d: any) => ({ time: d[0] / 1000, value: parseFloat(d[4]) }));
                setPrices(initialPrices);
                setHistory(initialHistory);
            } catch (e) { console.error(e); }
        };
        fetchHistory();
    }, []);

    // Update Real-time
    useEffect(() => {
        if (price > 0) {
            setPrices(prev => [...prev.slice(-999), price]);
            setHistory(prev => {
                const newPoint = { time: Date.now() / 1000, value: price };
                if (prev.length > 0 && prev[prev.length - 1].time === newPoint.time) return [...prev.slice(0, -1), newPoint];
                return [...prev, newPoint];
            });
        }
    }, [price]);

    // Run Simulation with Strategy Params
    useEffect(() => {
        if (prices.length > 0 && strategy) {
            // Use the backward compatible wrapper or the new function if we had type info
            // For now, since we only have SMA_CROSS in DB, we can stick to calculateSimulation
            // or use runBacktest(prices, strategy.type, strategy.parameters)

            // Let's try to use the new function if possible, but we need to import it.
            // Since I didn't export runBacktest in the previous step (I did export it actually),
            // let's update the import and usage.

            // Actually, to avoid breaking changes without updating imports, I kept calculateSimulation.
            // But let's verify if I can update the import.
            const res = runBacktest(prices, strategy.type, strategy.parameters); // Changed to runBacktest
            setResult(res);
        }
    }, [prices, strategy]);

    const handleSave = async (name: string, params: any) => {
        const { error } = await supabase
            .from('strategies')
            .update({ name, parameters: params, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (!error) {
            setStrategy({ ...strategy, name, parameters: params });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>;
    if (!strategy) return <div>Strategy not found</div>;

    return (
        <div className="space-y-6">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-foreground transition-colors">
                <ArrowLeft size={18} /> Back to Dashboard
            </Link>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left: Chart & Stats */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-2xl font-bold">{strategy.name}</h1>
                            <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                                {isConnected ? 'LIVE' : 'OFFLINE'}
                            </div>
                        </div>

                        <div className="h-[400px] w-full relative">
                            <PriceChart data={history} />
                        </div>
                    </div>

                    <ProfitDisplay
                        pnl={result.totalPnL}
                        winRate={result.winRate}
                        trades={result.trades}
                    />
                </div>

                {/* Right: Editor */}
                <div>
                    <StrategyEditor
                        initialName={strategy.name}
                        initialParams={strategy.parameters}
                        onSave={handleSave}
                    />
                </div>
            </div>
        </div>
    );
}
