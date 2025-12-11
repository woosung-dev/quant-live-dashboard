```typescript
"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, LineWidth } from 'lightweight-charts';
import { Candle, Signal, PerformanceMetrics } from "@/types";
import { useTheme } from "next-themes";

interface LineData {
    time: number;
    value: number;
}

export interface OverlayLine {
    data: LineData[];
    color: string;
    lineWidth?: number;
}

interface BacktestChartProps {
    candles: Candle[];
    signals: Signal[];
    overlays?: OverlayLine[];
    metrics?: PerformanceMetrics;
}

export function BacktestChart({ candles, signals, overlays }: BacktestChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const lineSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);

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
            rightPriceScale: {
                borderColor: isDark ? "#27272A" : "#E5E7EB",
            },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#10B981",
            downColor: "#EF4444",
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
            // Clean up previous overlay series
            if (chartRef.current) {
                lineSeriesRefs.current.forEach(series => chartRef.current?.removeSeries(series));
                lineSeriesRefs.current = [];
            }

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
                .sort((a, b) => (a.time as number) - (b.time as number));

            // De-duplicate 
            const uniqueData: typeof data = [];
            let lastTime: number | null = null;
            for (const item of data) {
                const currentTime = item.time as number;
                if (lastTime === currentTime) continue;
                uniqueData.push(item);
                lastTime = currentTime;
            }

            if (uniqueData.length === 0) return;

            candlestickSeriesRef.current.setData(uniqueData);

            // Render Overlays
            if (overlays && chartRef.current) {
                overlays.forEach(overlay => {
                    const lineSeries = chartRef.current!.addSeries(LineSeries, {
                        color: overlay.color,
                        lineWidth: (overlay.lineWidth || 2) as LineWidth,
                        priceFormat: { type: 'price' },
                        crosshairMarkerVisible: false,
                    });

                    const validOverlayData = overlay.data
                        .filter(d => d.time && !isNaN(d.value))
                        .map(d => ({ time: d.time as Time, value: d.value }))
                        .sort((a, b) => (a.time as number) - (b.time as number));

                    const uniqueOverlay: typeof validOverlayData = [];
                    let lastOTime: number | null = null;
                    for (const item of validOverlayData) {
                        const t = item.time as number;
                        if (lastOTime === t) continue;
                        uniqueOverlay.push(item);
                        lastOTime = t;
                    }

                    lineSeries.setData(uniqueOverlay);
                    lineSeriesRefs.current.push(lineSeries);
                });
            }

            // Set markers for signals
            const markers = signals
                .filter(s => s.time && s.price)
                .map((s) => ({
                    time: s.time as Time,
                    position: (s.type === "buy" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar",
                    color: s.type === "buy" ? "#10B981" : "#EF4444",
                    shape: (s.type === "buy" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
                    text: s.type.toUpperCase(),
                    size: 1
                }));

            // @ts-expect-error - marker types mismatch fix
            candlestickSeriesRef.current.setMarkers(markers);

            if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
            }
        } catch (e) {
            console.error("BacktestChart: Error updating chart data", e);
        }

    }, [candles, signals, overlays]);

    return (
        <div className="w-full h-[400px] border rounded-lg overflow-hidden bg-background">
            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
