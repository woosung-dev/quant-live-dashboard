"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, TrendingUp, Activity, Download, Trophy, Medal } from "lucide-react";
import Link from "next/link";

interface LeaderboardStrategy {
    id: string;
    strategy_id: string;
    name: string;
    description: string;
    author: { id: string; full_name: string; email: string } | null;
    avgRating: number;
    ratingCount: number;
    performance_win_rate: number | null;
    performance_cagr: number | null;
    performance_mdd: number | null;
    performance_profit_factor: number | null;
    performance_trades: number | null;
    download_count: number | null;
}

export default function LeaderboardPage() {
    const t = useTranslations('Leaderboard');
    const [strategies, setStrategies] = useState<LeaderboardStrategy[]>([]);
    const [sortBy, setSortBy] = useState<string>('rating');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, [sortBy]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/leaderboard?sortBy=${sortBy}&limit=20`);
            const data = await res.json();
            setStrategies(data.strategies || []);
        } catch (e) {
            console.error('Failed to fetch leaderboard', e);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
        if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
        return <span className="w-5 h-5 text-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-3 w-3 ${
                            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                        }`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">🏆 {t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
            </div>

            <Tabs value={sortBy} onValueChange={setSortBy} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-4">
                    <TabsTrigger value="rating" className="flex items-center gap-1">
                        <Star className="h-4 w-4" /> {t('tabRating')}
                    </TabsTrigger>
                    <TabsTrigger value="profit" className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" /> {t('tabProfit')}
                    </TabsTrigger>
                    <TabsTrigger value="trades" className="flex items-center gap-1">
                        <Activity className="h-4 w-4" /> {t('tabTrades')}
                    </TabsTrigger>
                    <TabsTrigger value="downloads" className="flex items-center gap-1">
                        <Download className="h-4 w-4" /> {t('downloadCount')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={sortBy} className="mt-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    ) : strategies.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <Trophy className="h-12 w-12 mb-4 opacity-50" />
                                <p>{t('noData')}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {strategies.map((strategy, index) => (
                                <Card key={strategy.id} className="hover:border-primary/50 transition-colors">
                                    <CardContent className="flex items-center gap-4 py-4">
                                        {/* Rank */}
                                        <div className="flex-shrink-0 w-8 flex justify-center">
                                            {getRankIcon(index)}
                                        </div>

                                        {/* Strategy Info */}
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Link 
                                                    href={`/dashboard/marketplace`}
                                                    className="font-semibold hover:text-primary truncate"
                                                >
                                                    {strategy.name}
                                                </Link>
                                                {renderStars(strategy.avgRating)}
                                                <span className="text-xs text-muted-foreground">
                                                    ({strategy.ratingCount})
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {t('byAuthor')} {strategy.author?.full_name || 'Anonymous'}
                                            </p>
                                        </div>

                                        {/* Metrics */}
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            {strategy.performance_win_rate !== null && (
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">{t('winRate')}</p>
                                                    <p className="font-semibold text-green-500">
                                                        {strategy.performance_win_rate.toFixed(1)}%
                                                    </p>
                                                </div>
                                            )}
                                            {strategy.performance_cagr !== null && (
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">{t('cagr')}</p>
                                                    <p className={`font-semibold ${strategy.performance_cagr >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {strategy.performance_cagr >= 0 ? '+' : ''}{strategy.performance_cagr.toFixed(1)}%
                                                    </p>
                                                </div>
                                            )}
                                            {strategy.performance_mdd !== null && (
                                                <div className="text-center">
                                                    <p className="text-xs text-muted-foreground">{t('mdd')}</p>
                                                    <p className="font-semibold text-red-500">
                                                        {strategy.performance_mdd.toFixed(1)}%
                                                    </p>
                                                </div>
                                            )}
                                            <div className="text-center">
                                                <p className="text-xs text-muted-foreground">{t('downloadCount')}</p>
                                                <p className="font-semibold">{strategy.download_count || 0}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
