"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceMetrics, Trade } from "@/types";
import { Separator } from "@/components/ui/separator";

interface AnalysisTabProps {
    metrics: PerformanceMetrics;
    trades: Trade[];
}

export function AnalysisTab({ metrics, trades }: AnalysisTabProps) {
    const fmtCurrency = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Additional calculations if needed (e.g. Consecutive wins/losses)
    // For now, rely on Pre-calculated PerformanceMetrics from engine.

    interface AnalysisStat {
        label: string;
        value: string | number;
        sub?: string;
        color?: string;
    }

    interface AnalysisSection {
        category: string;
        stats: AnalysisStat[];
    }

    const items: AnalysisSection[] = [
        {
            category: "거래 횟수 (Counts)",
            stats: [
                { label: "총 거래횟수", value: metrics.totalTrades },
                { label: "수익 거래 (Win)", value: metrics.winningTrades, sub: `${(metrics.winningTrades / metrics.totalTrades * 100).toFixed(1)}%` },
                { label: "손실 거래 (Loss)", value: metrics.losingTrades, sub: `${(metrics.losingTrades / metrics.totalTrades * 100).toFixed(1)}%` },
            ]
        },
        {
            category: "수익금 분석 (P&L Breakdown)",
            stats: [
                { label: "총 수익 (Gross Profit)", value: `+${fmtCurrency(metrics.grossProfit)}`, color: "text-green-500" },
                { label: "총 손실 (Gross Loss)", value: `-${fmtCurrency(metrics.grossLoss)}`, color: "text-red-500" },
                { label: "순이익 (Net Profit)", value: `${metrics.netProfit > 0 ? '+' : ''}${fmtCurrency(metrics.netProfit)}`, color: metrics.netProfit > 0 ? "text-green-500" : "text-red-500" },
            ]
        },
        {
            category: "평균 거래 (Averages)",
            stats: [
                { label: "평균 수익 (Avg Win)", value: `+${fmtCurrency(metrics.avgWin)}` },
                { label: "평균 손실 (Avg Loss)", value: `-${fmtCurrency(metrics.avgLoss)}` },
                { label: "평균 손익비 (Win/Loss)", value: ((metrics.avgWin / (metrics.avgLoss || 1)) || 0).toFixed(2) },
            ]
        },
        {
            category: "극단값 (Extremes)",
            stats: [
                { label: "최대 수익 (Max Win)", value: `+${fmtCurrency(metrics.maxWin)}`, color: "text-green-500" },
                { label: "최대 손실 (Max Loss)", value: `-${fmtCurrency(metrics.maxLoss)}`, color: "text-red-500" },
                { label: "최대 낙폭 (Max Drawdown)", value: `-${fmtCurrency(metrics.maxDrawdown)}`, sub: `-${metrics.maxDrawdownPercent.toFixed(2)}%`, color: "text-red-500" },
            ]
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((section, idx) => (
                <Card key={idx}>
                    <CardHeader className="py-4 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {section.category}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        {section.stats.map((stat, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">{stat.label}</span>
                                    <div className="text-right">
                                        <div className={`font-mono font-medium ${stat.color || "text-foreground"}`}>
                                            {stat.value}
                                        </div>
                                        {stat.sub && <div className="text-xs text-muted-foreground">{stat.sub}</div>}
                                    </div>
                                </div>
                                {i < section.stats.length - 1 && <Separator className="mt-2 opacity-50" />}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
