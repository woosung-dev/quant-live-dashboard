"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel
} from "@/components/ui/select";
import { getStrategyOptions } from "../strategies";
import { getUserStrategies } from "../lib/storage";
import { useEffect, useState } from "react";
import { Strategy } from "@/types"; // Import Strategy type

interface StrategySelectorProps {
    selectedStrategyId: string;
    onSelect: (strategyId: string) => void;
    disabled?: boolean;
}

export function StrategySelector({
    selectedStrategyId,
    onSelect,
    disabled,
}: StrategySelectorProps) {
    const defaultOptions = getStrategyOptions();
    const [userStrategies, setUserStrategies] = useState<Strategy[]>([]);

    useEffect(() => {
        const fetchStrategies = async () => {
            const strategies = await getUserStrategies();
            setUserStrategies(strategies);
        };
        fetchStrategies();
        // Poll or listen for updates ideally, but for now fetch on mount
        // Add a custom event listener if we want instant updates after save
        window.addEventListener('strategy-saved', fetchStrategies);
        return () => window.removeEventListener('strategy-saved', fetchStrategies);
    }, []);

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">전략 선택</label>
            <Select
                value={selectedStrategyId}
                onValueChange={onSelect}
                disabled={disabled}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="전략을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>기본 전략 (Default)</SelectLabel>
                        {defaultOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col items-start">
                                    <span className="font-medium">{option.label}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {option.description}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                    {userStrategies.length > 0 && (
                        <SelectGroup>
                            <SelectLabel>내 전략 (My Strategies)</SelectLabel>
                            {userStrategies.map((strategy) => (
                                <SelectItem key={strategy.id} value={strategy.id}>
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">{strategy.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {strategy.type}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
