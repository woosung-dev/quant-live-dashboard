"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitFork, Heart, TrendingUp, TrendingDown, User } from "lucide-react";
import { Strategy } from "@/features/backtest/types";
import { cn } from "@/lib/utils";

interface StrategyCardProps {
    strategy: Strategy;
    onView: (id: string) => void;
    onFork?: (id: string) => void;
}

export function StrategyCard({ strategy, onView }: StrategyCardProps) {
    // Default to mock values if performance is missing (for initial display)
    const {
        cagr = 0,
        mdd = 0,
        winRate = 0,
        totalTrades = 0
    } = strategy.performance || {};

    const isProfitable = cagr >= 0;

    return (
        <Card className="hover:border-primary/50 transition-all duration-300 cursor-pointer group bg-card/50 backdrop-blur-sm" onClick={() => onView(strategy.id)}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg leading-none group-hover:text-primary transition-colors">
                                {strategy.name}
                            </h3>
                            {strategy.type === 'PINE_SCRIPT' && <Badge variant="secondary" className="text-[10px] h-5">Pine</Badge>}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{strategy.authorName || 'Anonymous'}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-4 my-2">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Return (CAGR)</p>
                        <div className={cn("flex items-center gap-1 font-mono font-bold text-lg", isProfitable ? "text-green-500" : "text-red-500")}>
                            {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {cagr.toFixed(2)}%
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Max Drawdown</p>
                        <p className="font-mono font-bold text-lg text-red-500/80">
                            -{Math.abs(mdd).toFixed(2)}%
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Win Rate</span>
                        <span className="font-medium">{winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Trades</span>
                        <span className="font-medium">{totalTrades}</span>
                    </div>
                </div>
                {strategy.description && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                        {strategy.description}
                    </p>
                )}
            </CardContent>
            <CardFooter className="pt-2 text-xs text-muted-foreground flex justify-between border-t bg-muted/20">
                <div className="flex gap-3">
                    <span className="flex items-center gap-1 hover:text-red-500 transition-colors">
                        <Heart className="w-3.5 h-3.5" /> {strategy.likeCount || 0}
                    </span>
                    <span className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                        <GitFork className="w-3.5 h-3.5" /> {strategy.forkCount || 0}
                    </span>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {strategy.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="bg-background border px-1.5 py-0.5 rounded text-[10px]">{tag}</span>
                    ))}
                </div>
            </CardFooter>
        </Card>
    );
}
