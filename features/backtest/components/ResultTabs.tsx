"use client";

import { useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface ResultTabsProps {
    defaultValue?: string;
    children: React.ReactNode;
}

export function ResultTabs({ defaultValue = "chart", children }: ResultTabsProps) {
    return (
        <Tabs defaultValue={defaultValue} className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                    <TabsTrigger value="trades">Trades</TabsTrigger>
                </TabsList>
            </div>
            {children}
        </Tabs>
    );
}
