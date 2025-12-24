"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceMetrics } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

interface MetricsCardsProps {
    metrics: PerformanceMetrics | null;
    isLoading?: boolean;
}

export function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse bg-muted/50">
                        <CardHeader className="pb-2">
                            <div className="h-4 w-20 bg-muted-foreground/20 rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-32 bg-muted-foreground/20 rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!metrics) {
        return null;
    }

    const cards = [
        {
            title: "순이익 (Net Profit)",
            value: `${metrics.netProfit > 0 ? '+' : ''}${metrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            subValue: `${metrics.netProfitPercent > 0 ? '+' : ''}${metrics.netProfitPercent.toFixed(2)}%`,
            isPositive: metrics.netProfit > 0,
            isNegative: metrics.netProfit < 0,
        },
        {
            title: "최대 낙폭 (MDD)",
            value: `${metrics.maxDrawdownPercent.toFixed(2)}%`,
            subValue: `${metrics.maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            isNegative: true, // MDD is always considered bad/risk
        },
        {
            title: "총 거래횟수",
            value: metrics.totalTrades.toLocaleString(),
            subValue: `승 ${metrics.winningTrades} / 패 ${metrics.losingTrades}`,
        },
        {
            title: "승률 (Win Rate)",
            value: `${metrics.winRate.toFixed(2)}%`,
            isPositive: metrics.winRate >= 50,
            isNegative: metrics.winRate < 50,
        },
        {
            title: "손익비 (Profit Factor)",
            value: metrics.profitFactor.toFixed(2),
            isPositive: metrics.profitFactor >= 1.5,
            isNegative: metrics.profitFactor < 1,
        },
    ];

    return (
        <div className="flex gap-3 items-stretch">
            {cards.map((card, idx) => (
                <Card
                    key={idx}
                    className="overflow-hidden bg-background/80 backdrop-blur-md border-border/50 shadow-lg flex-1 min-w-[140px]"
                >
                    <CardHeader className="p-2.5 pb-1 space-y-0">
                        <CardTitle className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                            {card.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2.5 pt-0">
                        <div className="flex flex-col">
                            <div className={cn(
                                "text-lg font-bold flex items-center gap-1",
                                card.isPositive && "text-green-500",
                                card.isNegative && "text-red-500"
                            )}>
                                {card.value}
                                {card.isPositive && <ArrowUpIcon className="w-3 h-3" />}
                                {card.isNegative && <ArrowDownIcon className="w-3 h-3" />}
                                {!card.isPositive && !card.isNegative && <MinusIcon className="w-3 h-3 text-muted-foreground" />}
                            </div>
                            {card.subValue && (
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                    {card.subValue}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
