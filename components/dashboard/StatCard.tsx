'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Target, Activity, LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    icon: LucideIcon;
    positive?: boolean;
}

export const StatCard = ({ title, value, change, icon: Icon, positive = true }: StatCardProps) => {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
        >
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-400">{title}</span>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon className="text-primary" size={20} />
                </div>
            </div>

            <div className="space-y-1">
                <div className="text-3xl font-bold font-mono">{value}</div>
                <div className={`text-sm font-medium ${positive ? 'text-up' : 'text-down'}`}>
                    {positive ? '↑' : '↓'} {change}
                </div>
            </div>
        </motion.div>
    );
};
