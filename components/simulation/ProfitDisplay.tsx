'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ProfitDisplayProps {
    pnl: number;
    winRate: number;
    trades: number;
}

export const ProfitDisplay = ({ pnl, winRate, trades }: ProfitDisplayProps) => {
    const [displayPnl, setDisplayPnl] = useState(0);

    useEffect(() => {
        // Simple lerp for smooth number transition
        const interval = setInterval(() => {
            setDisplayPnl(prev => {
                const diff = pnl - prev;
                if (Math.abs(diff) < 0.01) return pnl;
                return prev + diff * 0.1;
            });
        }, 50);
        return () => clearInterval(interval);
    }, [pnl]);

    return (
        <div className="grid grid-cols-3 gap-4 p-6 bg-card/50 backdrop-blur-md border border-border rounded-xl">
            <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">총 수익률</div>
                <motion.div
                    className={`text-3xl font-bold font-mono ${displayPnl >= 0 ? 'text-up' : 'text-down'}`}
                    key={pnl} // Trigger animation on change if needed, or just let the number update
                >
                    {displayPnl > 0 ? '+' : ''}{displayPnl.toFixed(2)}%
                </motion.div>
            </div>
            <div className="text-center border-l border-border">
                <div className="text-sm text-gray-400 mb-1">승률</div>
                <div className="text-3xl font-bold font-mono text-foreground">
                    {winRate.toFixed(1)}%
                </div>
            </div>
            <div className="text-center border-l border-border">
                <div className="text-sm text-gray-400 mb-1">거래 횟수</div>
                <div className="text-3xl font-bold font-mono text-foreground">
                    {trades}
                </div>
            </div>
        </div>
    );
};
