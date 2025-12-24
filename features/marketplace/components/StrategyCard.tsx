"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Download, User } from "lucide-react";

interface StrategyCardProps {
    id: string;
    strategyId: string;
    title: string;
    description?: string | null;
    tags?: string[] | null;
    avgRating: number;
    ratingCount: number;
    downloads: number;
    author: {
        full_name?: string | null;
        email?: string;
    };
    onViewDetails: (id: string) => void;
}

export function StrategyCard({
    id,
    strategyId,
    title,
    description,
    tags,
    avgRating,
    ratingCount,
    downloads,
    author,
    onViewDetails
}: StrategyCardProps) {
    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    className={`w-4 h-4 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
            );
        }
        return stars;
    };

    return (
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onViewDetails(strategyId)}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            <span className="text-xs">{author.full_name || author.email}</span>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
                )}

                {/* Rating */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                        {renderStars(avgRating)}
                    </div>
                    <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({ratingCount})</span>
                </div>

                {/* Downloads */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Download className="w-4 h-4" />
                    <span>{downloads.toLocaleString()} downloads</span>
                </div>

                {/* Tags */}
                {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                            </Badge>
                        ))}
                        {tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{tags.length - 3}
                            </Badge>
                        )}
                    </div>
                )}

                <Button className="w-full mt-2" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(strategyId);
                }}>
                    View Details
                </Button>
            </CardContent>
        </Card>
    );
}
