"use client";

import { useState, useEffect } from "react";
import { StrategyCard } from "@/features/marketplace/components/StrategyCard";
import { StrategyDetailModal } from "@/features/marketplace/components/StrategyDetailModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search, TrendingUp, Download, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

interface PublicStrategy {
    id: string;
    strategy_id: string;
    title: string;
    description: string | null;
    tags: string[] | null;
    avg_rating: number;
    rating_count: number;
    downloads: number;
    author: {
        id: string;
        full_name: string | null;
        email: string;
    };
}

export default function MarketplacePage() {
    const t = useTranslations('Marketplace');
    const [strategies, setStrategies] = useState<PublicStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState('rating');
    const [searchTags, setSearchTags] = useState('');
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchStrategies = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                sort,
                limit: '50',
                offset: '0'
            });

            if (searchTags.trim()) {
                params.append('tags', searchTags.trim());
            }

            const res = await fetch(`/api/strategies/public?${params}`);
            if (res.ok) {
                const data = await res.json();
                setStrategies(data.strategies || []);
            }
        } catch (e) {
            console.error('Failed to fetch strategies:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStrategies();
    }, [sort]);

    const handleSearch = () => {
        fetchStrategies();
    };

    const handleViewDetails = (strategyId: string) => {
        setSelectedStrategyId(strategyId);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedStrategyId(null);
        // Refresh list to update download count
        fetchStrategies();
    };

    return (
        <div className="container py-8 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
                <p className="text-muted-foreground">
                    {t('description')}
                </p>
            </div>

            <Separator />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                    <Input
                        placeholder={t('searchPlaceholder')}
                        value={searchTags}
                        onChange={(e) => setSearchTags(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} size="icon" variant="secondary">
                        <Search className="w-4 h-4" />
                    </Button>
                </div>
                <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="rating">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                {t('sortByRating')}
                            </div>
                        </SelectItem>
                        <SelectItem value="downloads">
                            <div className="flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                {t('sortByDownloads')}
                            </div>
                        </SelectItem>
                        <SelectItem value="latest">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {t('sortByLatest')}
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Strategy Grid */}
            {loading ? (
                <div className="text-center py-20 text-muted-foreground">{t('loading')}</div>
            ) : strategies.length === 0 ? (
                <div className="text-center py-20 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">{t('noStrategies')}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        {t('tryAdjusting')}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {strategies.map((strategy) => (
                        <StrategyCard
                            key={strategy.id}
                            id={strategy.id}
                            strategyId={strategy.strategy_id}
                            title={strategy.title}
                            description={strategy.description}
                            tags={strategy.tags}
                            avgRating={strategy.avg_rating}
                            ratingCount={strategy.rating_count}
                            downloads={strategy.downloads}
                            author={strategy.author}
                            onViewDetails={handleViewDetails}
                        />
                    ))}
                </div>
            )}

            {/* Strategy Detail Modal */}
            {selectedStrategyId && (
                <StrategyDetailModal
                    strategyId={selectedStrategyId}
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                />
            )}
        </div>
    );
}

