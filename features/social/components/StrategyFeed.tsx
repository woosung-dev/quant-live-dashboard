"use client";

import { useEffect, useState } from "react";
import { Strategy } from "@/features/backtest/types";
import { getPublicStrategies, forkStrategy, toggleLike } from "../lib/api";
import { StrategyCard } from "./StrategyCard";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface StrategyFeedProps {
    sortBy?: 'popular' | 'recent' | 'return';
}

export function StrategyFeed({ sortBy = 'recent' }: StrategyFeedProps) {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadStrategies();
    }, [sortBy]);

    const loadStrategies = async () => {
        setLoading(true);
        const data = await getPublicStrategies(sortBy);
        setStrategies(data);
        setLoading(false);
    };

    const handleView = (id: string) => {
        // Open detail modal (TODO) or just alert for now since modal is Phase 8.1
        // router.push(`/dashboard/explorer/${id}`); 
        // For MVP, we might fork immediately or show simple info. 
        // Let's assume we want to view it. For now, since we don't have a detail page,
        // we can maybe just show a toast or implement a simple Dialog.
        // Let's implement the 'Fork' flow directly from Card for MVP speed.
    };

    const handleFork = async (id: string) => {
        toast.promise(forkStrategy(id), {
            loading: 'Forking strategy...',
            success: (newId) => {
                // Redirect to Lab with new ID
                if (newId) {
                    router.push(`/dashboard/strategy-lab?strategyId=${newId}`);
                    return 'Strategy forked! Redirecting to Lab...';
                }
                return 'Strategy forked!';
            },
            error: 'Failed to fork strategy'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (strategies.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                <p>No public strategies found.</p>
                <p className="text-sm">Be the first to share one!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {strategies.map(strategy => (
                <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    onView={() => handleFork(strategy.id)} // For MVP Card click forks/redirects
                />
            ))}
        </div>
    );
}
