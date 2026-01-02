"use client";

import { useState } from "react";
import { StrategyFeed } from "@/features/social/components/StrategyFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Sparkles, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ExplorerPage() {
    const t = useTranslations('Explorer');

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="border-b px-6 py-4 flex items-center justify-between bg-card/30 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('description')}</p>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                <Tabs defaultValue="popular" className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList>
                            <TabsTrigger value="popular" className="flex items-center gap-2">
                                <Flame className="w-4 h-4" /> {t('tabs.trending')}
                            </TabsTrigger>
                            <TabsTrigger value="return" className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> {t('tabs.topReturns')}
                            </TabsTrigger>
                            <TabsTrigger value="recent" className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> {t('tabs.newest')}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="popular" className="m-0">
                        <StrategyFeed sortBy="popular" />
                    </TabsContent>
                    <TabsContent value="return" className="m-0">
                        <StrategyFeed sortBy="return" />
                    </TabsContent>
                    <TabsContent value="recent" className="m-0">
                        <StrategyFeed sortBy="recent" />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
