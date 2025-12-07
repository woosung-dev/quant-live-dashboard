"use client";

import { Button } from "@/components/ui/button";
import { TIMEFRAME_LABELS, Timeframe, TIMEFRAME_MAP } from "@/types";
import { cn } from "@/lib/utils";

interface TimeframeSelectorProps {
    selectedTimeframe: Timeframe;
    onSelect: (timeframe: Timeframe) => void;
    disabled?: boolean;
}

export function TimeframeSelector({
    selectedTimeframe,
    onSelect,
    disabled,
}: TimeframeSelectorProps) {
    const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">타임프레임</label>
            <div className="flex flex-wrap gap-2">
                {timeframes.map((tf) => (
                    <Button
                        key={tf}
                        variant={selectedTimeframe === tf ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSelect(tf)}
                        disabled={disabled}
                        className={cn(
                            "flex-1 min-w-[3rem]",
                            selectedTimeframe === tf && "font-bold"
                        )}
                    >
                        {TIMEFRAME_LABELS[tf]}
                    </Button>
                ))}
            </div>
        </div>
    );
}
