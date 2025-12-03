'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Calendar } from 'lucide-react';

interface StrategyCardProps {
    id: string;
    name: string;
    type: string;
    createdAt: string;
    lastPnL?: number;
}

export const StrategyCard = ({ id, name, type, createdAt, lastPnL }: StrategyCardProps) => {
    return (
        <Link href={`/dashboard/strategy/${id}`}>
            <motion.div
                whileHover={{ y: -5 }}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer group"
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{name}</h3>
                        <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded mt-1 inline-block">
                            {type}
                        </span>
                    </div>
                    {lastPnL !== undefined && (
                        <div className={`text-lg font-bold font-mono ${lastPnL >= 0 ? 'text-up' : 'text-down'}`}>
                            {lastPnL > 0 ? '+' : ''}{lastPnL.toFixed(2)}%
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                        <Activity size={14} />
                        <span>Active</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{new Date(createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
};
