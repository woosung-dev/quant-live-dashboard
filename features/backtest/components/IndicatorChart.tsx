"use client";

import { useEffect, useRef, useId } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, LineSeries } from "lightweight-charts";

interface IndicatorData {
    time: number;
    value: number;
}

interface IndicatorChartProps {
    data: IndicatorData[];
    colors?: {
        lineColor?: string;
        backgroundColor?: string;
        textColor?: string;
    };
    height?: number;
    title?: string;
    overbought?: number;
    oversold?: number;
}

export function IndicatorChart({
    data,
    colors: {
        lineColor = "#2962FF",
        backgroundColor = "transparent",
        textColor = "#D1D4DC",
    } = {},
    height = 150,
    title = "Indicator",
    overbought,
    oversold,
}: IndicatorChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const id = useId();

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height,
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.1)" },
                horzLines: { color: "rgba(255, 255, 255, 0.1)" },
            },
            rightPriceScale: {
                borderColor: "rgba(255, 255, 255, 0.2)",
            },
            timeScale: {
                borderColor: "rgba(255, 255, 255, 0.2)",
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Use addSeries(LineSeries, options) instead of addLineSeries
        const series = chart.addSeries(LineSeries, {
            color: lineColor,
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        // Add levels for RSI etc.
        if (overbought !== undefined) {
            series.createPriceLine({
                price: overbought,
                color: 'rgba(255, 0, 0, 0.5)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'OB',
            });
        }

        if (oversold !== undefined) {
            series.createPriceLine({
                price: oversold,
                color: 'rgba(0, 255, 0, 0.5)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'OS',
            });
        }

        const validData = data.filter(d => d.time !== undefined && d.value !== undefined && !isNaN(d.value));
        // Sort data by time
        validData.sort((a, b) => a.time - b.time);

        // De-duplicate
        const uniqueData: IndicatorData[] = [];
        let lastTime: number | null = null;
        for (const item of validData) {
            if (lastTime === item.time) continue;
            uniqueData.push(item);
            lastTime = item.time;
        }

        // @ts-expect-error - lightweight-charts types mismatch
        series.setData(uniqueData);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = series;

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [data, backgroundColor, lineColor, textColor, height, overbought, oversold]);

    // Update data if it changes
    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const validData = data.filter(d => d.time !== undefined && d.value !== undefined && !isNaN(d.value));
            validData.sort((a, b) => a.time - b.time);

            // De-duplicate
            const uniqueData: IndicatorData[] = [];
            let lastTime: number | null = null;
            for (const item of validData) {
                if (lastTime === item.time) continue;
                uniqueData.push(item);
                lastTime = item.time;
            }

            // @ts-expect-error - types mismatch
            seriesRef.current.setData(uniqueData);
        }
    }, [data]);

    return (
        <div className="w-full relative">
            {title && (
                <div className="absolute top-2 left-2 z-10 text-xs font-bold text-muted-foreground bg-background/50 px-1 rounded pointer-events-none">
                    {title}
                </div>
            )}
            <div ref={chartContainerRef} id={id} />
        </div>
    );
}
