"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getStrategyOptions } from "../strategies";

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
    const options = getStrategyOptions();

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
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{option.label}</span>
                                <span className="text-xs text-muted-foreground">
                                    {option.description}
                                </span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
