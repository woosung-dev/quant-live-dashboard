'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Download, TrendingUp, DollarSign, Copy, Check, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface StrategyDetail {
    id: string; // public id
    strategy_id: string; // original id
    title: string;
    description: string;
    author: {
        full_name: string;
        email: string;
    };
    price: number;
    is_premium: boolean;
    avg_rating: number;
    review_count: number;
    downloads: number;
    profit_rate: number;
    tags: string[];
    strategy_config: any;
    published_at: string;
    type: string;
}

export default function MarketplaceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
    const [isPurchased, setIsPurchased] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (id) fetchStrategy();
    }, [id]);

    const fetchStrategy = async () => {
        try {
            const res = await fetch(`/api/strategies/public/${id}`);
            if (!res.ok) throw new Error('Failed to fetch strategy');
            const data = await res.json();
            setStrategy(data.strategy);
            setIsPurchased(data.isPurchased);
        } catch (error) {
            toast.error("전략을 불러오는데 실패했습니다.");
            router.push('/dashboard/marketplace');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!confirm(`$${strategy?.price}에 구매하시겠습니까? (Mock Payment)`)) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/strategies/${id}/purchase`, {
                method: 'POST'
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Purchase failed');
            
            toast.success("구매가 완료되었습니다!");
            setIsPurchased(true); // Update state to enable Fork
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleFork = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/strategies/${id}/fork`, {
                method: 'POST'
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Fork failed');
            
            toast.success("전략이 내 보관함으로 복사되었습니다!");
            router.push('/dashboard/strategy'); // Go to my strategies
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!strategy) return <div className="p-8 text-center">Strategy not found</div>;

    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant={strategy.is_premium ? "default" : "secondary"}>
                            {strategy.is_premium ? 'Premium' : 'Free'}
                        </Badge>
                        <Badge variant="outline">{strategy.type || 'Custom'}</Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{strategy.title}</h1>
                    <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                            By {strategy.author?.full_name || 'Unknown'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {strategy.avg_rating?.toFixed(1) || '0.0'} ({strategy.review_count || 0})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            {strategy.downloads || 0} Downloads
                        </span>
                    </div>
                </div>

                <Card className="min-w-[300px] border-primary/20 bg-secondary/10">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center text-xl">
                            <span>Price</span>
                            <span className="text-2xl font-bold text-primary">
                                {strategy.is_premium ? `$${strategy.price}` : 'Free'}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isPurchased ? (
                             <Button className="w-full" size="lg" onClick={handleFork} disabled={actionLoading}>
                                {actionLoading ? 'Copying...' : (
                                    <>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Fork to My Library
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button className="w-full" size="lg" onClick={handlePurchase} disabled={actionLoading}>
                                {actionLoading ? 'Processing...' : (
                                    <>
                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                        Buy Now
                                    </>
                                )}
                            </Button>
                        )}
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground justify-center">
                        {isPurchased ? 'You own this strategy forever.' : 'One-time purchase. Lifetime updates.'}
                    </CardFooter>
                </Card>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert">
                            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                {strategy.description || "No description provided."}
                            </p>
                            
                            <div className="mt-8 flex flex-wrap gap-2">
                                {strategy.tags?.map((tag) => (
                                    <Badge key={tag} variant="secondary">#{tag}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="performance" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historical Performance</CardTitle>
                            <CardDescription>Based on creator's backtest results</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="p-4 bg-background rounded-lg border">
                                    <div className="text-sm text-muted-foreground mb-1">Profit Rate</div>
                                    <div className="text-2xl font-bold text-green-500">
                                        +{strategy.profit_rate || 0}%
                                    </div>
                                </div>
                                <div className="p-4 bg-background rounded-lg border">
                                    <div className="text-sm text-muted-foreground mb-1">Total Trades</div>
                                    <div className="text-2xl font-bold">
                                        {124 /* Placeholder */}
                                    </div>
                                </div>
                                <div className="p-4 bg-background rounded-lg border">
                                    <div className="text-sm text-muted-foreground mb-1">Win Rate</div>
                                    <div className="text-2xl font-bold">
                                        {68 /* Placeholder */}%
                                    </div>
                                </div>
                            </div>
                            <div className="bg-secondary/20 h-[300px] flex items-center justify-center rounded-md border border-dashed">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <TrendingUp /> Chart Visualization Placeholder
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Reviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Reviews feature integrated in previous phase.</p>
                            {/* Review list component to be added */}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
