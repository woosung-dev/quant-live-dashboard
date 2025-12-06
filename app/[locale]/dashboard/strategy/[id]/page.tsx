'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { StrategyEditor } from '@/components/dashboard/StrategyEditor';
import { PriceChart } from '@/components/charts/PriceChart';
import { ProfitDisplay } from '@/components/simulation/ProfitDisplay';
import { useWebSocket } from '@/hooks/useWebSocket';
import { runCustomStrategy } from '@/lib/simulation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StrategyDetailPage() {
    const { id } = useParams();
    const [strategy, setStrategy] = useState<any>(null);
    const [code, setCode] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Real-time data
    const { price, isConnected } = useWebSocket('btcusdt');
    const [history, setHistory] = useState<{ time: number; value: number }[]>([]);
    const [prices, setPrices] = useState<number[]>([]);
    const [result, setResult] = useState<any>({ totalPnL: 0, winRate: 0, trades: 0 });

    // Default Strategy Code Template
    const defaultCode = `// Available variables: 
// prices: number[] (history up to current point)
// portfolio: { balance, position, entryPrice }
// Return 'BUY', 'SELL', or null

const fast = 9;
const slow = 21;

if (prices.length < slow) return;

// Calculate SMA
const fastMA = prices.slice(-fast).reduce((a,b) => a+b, 0) / fast;
const slowMA = prices.slice(-slow).reduce((a,b) => a+b, 0) / slow;

// Logic
if (fastMA > slowMA) return 'BUY';
if (fastMA < slowMA) return 'SELL';
`;

    // Fetch Strategy
    useEffect(() => {
        const fetchStrategy = async () => {
            const { data } = await supabase.from('strategies').select('*').eq('id', id).single();
            if (data) {
                setStrategy(data);
                // If strategy has saved code, use it, otherwise use default
                setCode(data.code || defaultCode);
            }
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

    const handleRunBacktest = () => {
        if (prices.length > 0 && code) {
            const res = runCustomStrategy(prices, code);
            setResult(res);
        }
    };

    const handleSave = async () => {
        const { error } = await supabase
            .from('strategies')
            .update({ code, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (!error) {
            alert('Strategy saved!');
        } else {
            alert('Failed to save strategy');
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>;
    if (!strategy) return <div>Strategy not found</div>;

    return (
        <div className="space-y-6">
            <Link href="/dashboard/strategy" className="inline-flex items-center gap-2 text-gray-400 hover:text-foreground transition-colors">
                <ArrowLeft size={18} /> Back to Strategies
            </Link>

            <div className="grid lg:grid-cols-3 gap-8 h-[calc(100vh-150px)]">
                {/* Left: Chart & Stats */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                    <div className="bg-card border border-border rounded-xl p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-2xl font-bold">{strategy.name}</h1>
                            <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                                {isConnected ? 'LIVE' : 'OFFLINE'}
                            </div>
                        </div>

                        <div className="flex-1 w-full relative min-h-[300px]">
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
                <div className="h-full">
                    <StrategyEditor
                        code={code}
                        onChange={(val) => setCode(val || '')}
                        onRunBacktest={handleRunBacktest}
                        onSave={handleSave}
                    />
                </div>
            </div>
        </div>
    );
}
