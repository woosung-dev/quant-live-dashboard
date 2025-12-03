'use client'

import { createChart, ColorType, IChartApi } from 'lightweight-charts'
import React, { useEffect, useRef } from 'react'

interface LiveChartProps {
    data: { time: string; open: number; high: number; low: number; close: number }[]
    colors?: {
        backgroundColor?: string
        lineColor?: string
        textColor?: string
        areaTopColor?: string
        areaBottomColor?: string
    }
}

export const LiveChart: React.FC<LiveChartProps> = ({ data, colors = {} }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const handleResize = () => {
            chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth })
        }

        const {
            backgroundColor = 'transparent',
            textColor = '#EDEDED',
        } = colors

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            grid: {
                vertLines: { color: '#333' },
                horzLines: { color: '#333' },
            },
        })
        chartRef.current = chart

        const candlestickSeries = (chart as any).addCandlestickSeries({
            upColor: '#00FF94',
            downColor: '#FF4976',
            borderVisible: false,
            wickUpColor: '#00FF94',
            wickDownColor: '#FF4976',
        })

        candlestickSeries.setData(data)

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [data, colors])

    return (
        <div
            ref={chartContainerRef}
            className="w-full h-[500px] relative"
        />
    )
}
