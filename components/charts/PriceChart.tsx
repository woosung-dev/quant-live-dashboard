'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from 'lightweight-charts';

interface PriceChartProps {
    data: { time: number; value: number }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
}

export const PriceChart = ({ data, colors = {} }: PriceChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

    const {
        backgroundColor = 'transparent',
        lineColor = '#00ff94',
        textColor = '#ededed',
        areaTopColor = 'rgba(0, 255, 148, 0.5)',
        areaBottomColor = 'rgba(0, 255, 148, 0.0)',
    } = colors;

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: '#333' },
                horzLines: { color: '#333' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
        });

        chartRef.current = chart;

        const newSeries = chart.addSeries(AreaSeries, {
            lineColor,
            topColor: areaTopColor,
            bottomColor: areaBottomColor,
        }) as ISeriesApi<"Area">;
        seriesRef.current = newSeries;

        newSeries.setData(data as any); // Type assertion needed for lightweight-charts time format

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]);

    // Update data when props change
    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            // If we are appending real-time data, we might use update() instead of setData()
            // For this demo, we'll just set the whole dataset or update the last point
            // But lightweight-charts expects sorted data.
            seriesRef.current.setData(data as any);
        }
    }, [data]);

    return <div ref={chartContainerRef} className="w-full h-[400px]" />;
};
