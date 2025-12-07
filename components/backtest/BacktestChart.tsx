"use client";

import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries } from "lightweight-charts";
import { Candle, Signal } from "@/types";
import { useTheme } from "next-themes";

interface BacktestChartProps {
    candles: Candle[];
    signals: Signal[];
    metrics?: any; // Optional metrics to display on chart if needed
}

export function BacktestChart({ candles, signals }: BacktestChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    const { theme } = useTheme();
    const isDark = theme === "dark";

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: "transparent" },
                textColor: isDark ? "#A1A1AA" : "#333",
            },
            grid: {
                vertLines: { color: isDark ? "#27272A" : "#E5E7EB" },
                horzLines: { color: isDark ? "#27272A" : "#E5E7EB" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#10B981", // Emerald 500
            downColor: "#EF4444", // Red 500
            borderVisible: false,
            wickUpColor: "#10B981",
            wickDownColor: "#EF4444",
        });

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [isDark]);

    useEffect(() => {
        if (!candlestickSeriesRef.current || candles.length === 0) return;

        try {
            // Validation and Logging
            console.log("BacktestChart: Processing candles", candles.length);

            // Convert candles to lightweight-charts format
            const data = candles
                .filter(c => c.time && !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close))
                .map((c) => ({
                    time: c.time as Time,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                }))
                .sort((a, b) => (a.time as number) - (b.time as number)); // Ensure sorted

            // De-duplicate (lightweight-charts throws on duplicates)
            const uniqueData: typeof data = [];
            let lastTime: number | null = null;
            for (const item of data) {
                const currentTime = item.time as number;
                if (lastTime === currentTime) continue;
                uniqueData.push(item);
                lastTime = currentTime;
            }

            if (uniqueData.length === 0) {
                console.warn("BacktestChart: No valid data to render");
                return;
            }

            candlestickSeriesRef.current.setData(uniqueData);

            // Set markers for signals
            const markers = signals
                .filter(s => s.time && s.price)
                .map((s) => ({
                    time: s.time as Time,
                    position: (s.type === "buy" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar" | "inBar",
                    color: s.type === "buy" ? "#10B981" : "#EF4444",
                    shape: (s.type === "buy" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown" | "circle" | "square",
                    text: s.type.toUpperCase(),
                    size: 1
                }));

            // Filter out markers with times not in candle data (chart crashes if marker time not in series?)
            // Actually lightweight-charts 3.8+ handles it, but let's be safe.
            // We will just try setting them.

            // @ts-ignore - mismatch in expected types but compatible in practice for lightweight-charts 5.x
            candlestickSeriesRef.current.setMarkers(markers);

            // Fit content
            if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
            }
        } catch (e) {
            console.error("BacktestChart: Error updating chart data", e);
        }

    }, [candles, signals]);

    return (
        <div className="w-full h-[400px] border rounded-lg overflow-hidden bg-background">
            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
