import { LiveChart } from '@/components/chart/LiveChart'
import { motion } from 'framer-motion'
import { useWebSocket } from '@/hooks/use-websocket'
import { useEffect, useState } from 'react'
import { useStore } from '@/hooks/use-store'

const initialData = [
    { time: '2023-12-22', open: 43000, high: 43500, low: 42800, close: 43200 },
    { time: '2023-12-23', open: 43200, high: 44000, low: 43100, close: 43800 },
    { time: '2023-12-24', open: 43800, high: 44200, low: 43500, close: 44000 },
    // ... more mock data if needed
]

export const HeroSection = () => {
    const { isRunning, balance, pnl, updatePnl } = useStore()
    const [chartData, setChartData] = useState<any[]>(initialData)
    const wsData = useWebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m')

    useEffect(() => {
        if (wsData && wsData.k) {
            const kline = wsData.k
            const newCandle = {
                time: kline.t / 1000 as any, // Lightweight charts expects seconds for unix timestamp
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
            }

            setChartData(prev => {
                const lastCandle = prev[prev.length - 1]
                // If the new candle is the same time as the last one, update the last one
                // Otherwise add a new one
                // Note: Lightweight charts handles updates automatically if we pass the same time,
                // but for React state we might want to be explicit.
                // However, passing the whole array to LiveChart might be expensive if it grows too large.
                // For this demo, we'll just append or update.

                // Simple logic: if time matches, replace last. Else append.
                if (lastCandle && lastCandle.time === newCandle.time) {
                    return [...prev.slice(0, -1), newCandle]
                }
                return [...prev, newCandle]
            })

            // Simulation Logic
            if (isRunning) {
                // Mock strategy: Randomly gain or lose based on price movement
                // In a real app, this would check strategy parameters against the newCandle
                const priceChange = newCandle.close - newCandle.open
                const mockPnl = priceChange * (Math.random() > 0.5 ? 1 : -1) * 0.1 // Simplified P&L
                updatePnl(mockPnl)
            }
        }
    }, [wsData, isRunning, updatePnl])

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black -z-10" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-12 max-w-4xl mx-auto"
            >
                <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                    Validate Your Strategy <br />
                    <span className="text-primary">In Real-Time</span>
                </h1>
                <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                    Don't guess. Simulate your trading algorithms with live market data and instant P&L analysis.
                </p>

                <div className="flex gap-4 justify-center">
                    <button className="bg-primary text-black px-8 py-3 rounded-full font-bold hover:bg-green-400 transition-colors">
                        Start Simulation
                    </button>
                    <button className="border border-gray-700 px-8 py-3 rounded-full font-bold hover:bg-gray-900 transition-colors">
                        View Demo
                    </button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-6xl h-[600px] bg-card/50 border border-white/10 rounded-xl backdrop-blur-sm p-4 shadow-2xl shadow-primary/10 relative"
            >
                {isRunning && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-6 py-2 flex gap-6 z-10">
                        <div>
                            <div className="text-xs text-gray-400">BALANCE</div>
                            <div className="font-mono font-bold text-lg">${balance.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-400">P&L</div>
                            <div className={`font-mono font-bold text-lg ${pnl >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-400 font-mono">BTC/USDT • 1m</div>
                        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            LIVE
                        </div>
                    </div>
                </div>
                <LiveChart data={chartData} />
            </motion.div>
        </section>
    )
}
