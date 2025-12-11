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
                <TabsList>
                    <TabsTrigger value="chart">Chart & Performance</TabsTrigger>
                    <TabsTrigger value="trades">Trade Log</TabsTrigger>
                </TabsList>
            </div>
            {children}
        </Tabs>
    );
}
