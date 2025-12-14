"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { StrategySelector } from "@/features/backtest/components/StrategySelector";
import { ParameterForm } from "@/features/backtest/components/ParameterForm";
import { PineEditor } from "@/features/backtest/components/PineEditor";
import { TimeframeSelector } from "@/features/backtest/components/TimeframeSelector";
import { BacktestChart, OverlayLine } from "@/features/backtest/components/BacktestChart";
import { IndicatorChart } from "@/features/backtest/components/IndicatorChart";
import { MetricsCards } from "@/features/backtest/components/MetricsCards";
import { ResultTabs } from "@/features/backtest/components/ResultTabs";
import { TradeLogTable } from "@/features/backtest/components/TradeLogTable";
import { AlertSettings } from "@/features/backtest/components/AlertSettings";
import {
    getStrategyById,
    defaultStrategy
} from "@/features/backtest/strategies";
import { runBacktest } from "@/features/backtest/lib/engine";
import { RealtimeRunner, RealtimeState } from "@/features/backtest/lib/realtime/runner";
import { AlertConfig } from "@/features/backtest/lib/realtime/notification";
import {
    BacktestResult,
    BacktestConfig,
    Timeframe,
    SUPPORTED_SYMBOLS,
    Candle
} from "@/types";
import { Loader2, Play } from "lucide-react";

// Default configuration
const DEFAULT_CONFIG: BacktestConfig = {
    symbol: "BTCUSDT",
    timeframe: "1d",
    initialCapital: 10000,
    limit: 500,
};

// Helper: Map indicator array to time-value objects
const mapIndicatorData = (candles: Candle[], values?: number[]) => {
    if (!values || values.length === 0) return [];
    return candles.map((c, i) => ({
        time: c.time,
        value: values[i]
    })).filter(d => d.value !== undefined && !isNaN(d.value));
};

export default function StrategyLabPage() {
    const t = useTranslations('Dashboard');

    // Configuration State
    const [symbol, setSymbol] = useState<string>(DEFAULT_CONFIG.symbol);
    const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_CONFIG.timeframe);

    // Strategy State
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>(defaultStrategy.id);
    const [strategyParams, setStrategyParams] = useState<Record<string, any>>({});

    // Alert State
    const [alertConfig, setAlertConfig] = useState<AlertConfig>({ type: 'webhook', url: '' });

    // Result State
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Real-time State
    const realtimeRunner = useRef<RealtimeRunner | null>(null);
    const [realtimeState, setRealtimeState] = useState<RealtimeState | null>(null);

    // Derived State
    const selectedStrategy = getStrategyById(selectedStrategyId);

    // Initialize parameters when strategy changes
    useEffect(() => {
        if (selectedStrategy) {
            const initialParams: Record<string, any> = {};
            selectedStrategy.parameters.forEach(p => {
                initialParams[p.name] = p.defaultValue;
            });
            setStrategyParams(initialParams);
        }
    }, [selectedStrategyId]);

    // Cleanup runner on unmount
    useEffect(() => {
        return () => {
            if (realtimeRunner.current) {
                realtimeRunner.current.stop();
            }
        };
    }, []);

    const handleRunBacktest = async () => {
        if (!selectedStrategy) return;

        setIsRunning(true);
        setError(null);

        try {
            const config: BacktestConfig = {
                symbol,
                timeframe,
                initialCapital: DEFAULT_CONFIG.initialCapital,
                limit: 1000,
            };

            const result = await runBacktest(config, selectedStrategy, strategyParams);
            setResult(result);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "백테스트 실행 중 오류가 발생했습니다.");
        } finally {
            setIsRunning(false);
        }
    };

    const toggleRealtime = () => {
        if (realtimeState?.status === 'running') {
            realtimeRunner.current?.stop();
            return;
        }

        if (!selectedStrategy) return;

        if (!realtimeRunner.current) {
            realtimeRunner.current = new RealtimeRunner((state) => {
                setRealtimeState(state);
            });
        }

        realtimeRunner.current.start(
            { symbol, timeframe, initialCapital: 0 }, // Capital not used for alerts
            selectedStrategy,
            strategyParams,
            alertConfig.url ? alertConfig : undefined
        );
    };

    // Prepare Overlays (EMA Cross)
    const overlays: OverlayLine[] = useMemo(() => {
        if (!result || !result.indicators) return [];
        if (selectedStrategyId === 'ema-cross') {
            const fastMA = result.indicators.fastMA;
            const slowMA = result.indicators.slowMA;
            if (!fastMA || !slowMA) return [];
            return [
                { data: mapIndicatorData(result.candles, fastMA), color: '#2962FF', lineWidth: 2 },
                { data: mapIndicatorData(result.candles, slowMA), color: '#FF6D00', lineWidth: 2 }
            ];
        }
        return [];
    }, [result, selectedStrategyId]);

    // Prepare Indicator Chart Data (RSI)
    const indicatorChartProps = useMemo(() => {
        if (!result || !result.indicators) return null;

        if (selectedStrategyId === 'rsi-divergence') {
            const rsi = result.indicators.rsi;
            if (!rsi) return null;
            return {
                data: mapIndicatorData(result.candles, rsi),
                title: 'RSI(14)',
                overbought: Number(strategyParams.overbought) || 70,
                oversold: Number(strategyParams.oversold) || 30
            };
        }

        // MACD (Simplified to Signal Line or Histogram for now)
        if (selectedStrategyId === 'macd') {
            const macd = result.indicators.macdLine; // Use MACD Line
            // Ideally we want 3 lines (MACD, Signal, Hist)
            // IndicatorChart only supports one line + levels.
            // We'll just show MACD line for now to verify integration.
            // Or maybe Histogram?
            if (!macd) return null;
            return {
                data: mapIndicatorData(result.candles, macd),
                title: 'MACD Line',
                overbought: undefined,
                oversold: undefined
            };
        }

        return null;
    }, [result, selectedStrategyId, strategyParams]);

    return (
        <div className="container mx-auto p-4 space-y-6 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">Strategy Lab</h1>
                        {realtimeState?.status === 'running' && (
                            <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        전략을 만들고 테스트하여 시장을 이기는 알파를 찾으세요.
                    </p>
                </div>
                <AlertSettings
                    onSave={setAlertConfig}
                    defaultConfig={alertConfig}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar: Configuration */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">설정 (Configuration)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">심볼 (Symbol)</label>
                            <Select value={symbol} onValueChange={setSymbol}>
                                <SelectTrigger>
                                    <SelectValue placeholder="심볼 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUPPORTED_SYMBOLS.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <TimeframeSelector selectedTimeframe={timeframe} onSelect={setTimeframe} />

                        <Separator />

                        <StrategySelector selectedStrategyId={selectedStrategyId} onSelect={setSelectedStrategyId} />


                        {selectedStrategy && (
                            <div className="space-y-4 border rounded-md p-3 bg-muted/20">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground">Parameters</span>
                                </div>

                                {selectedStrategy.id === 'pine-script' ? (
                                    <PineEditor
                                        value={strategyParams.code ?? selectedStrategy.parameters[0].defaultValue}
                                        onChange={(val) => setStrategyParams({ ...strategyParams, code: val })}
                                    />
                                ) : (
                                    <ParameterForm
                                        parameters={selectedStrategy.parameters}
                                        values={strategyParams}
                                        onChange={setStrategyParams}
                                    />
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleRunBacktest}
                                disabled={isRunning || !selectedStrategy}
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        실행 중...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4 fill-current" />
                                        백테스트
                                    </>
                                )}
                            </Button>

                            <Button
                                className="w-full"
                                size="lg"
                                variant={realtimeState?.status === 'running' ? "destructive" : "secondary"}
                                onClick={toggleRealtime}
                                disabled={!selectedStrategy}
                            >
                                {realtimeState?.status === 'running' ? "중지 (Stop)" : "실전 활성화 (Activate)"}
                            </Button>
                        </div>

                        {realtimeState && (
                            <div className="mt-4 border rounded p-2 bg-black/80 font-mono text-xs h-32 overflow-hidden">
                                <ScrollArea className="h-full">
                                    {realtimeState.logs.map((log, i) => (
                                        <div key={i} className="text-green-400 border-b border-green-900/30 pb-1 mb-1">{log}</div>
                                    ))}
                                </ScrollArea>
                            </div>
                        )}

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Main Content: Results Tabs */}
                <div className="lg:col-span-3">
                    <ResultTabs defaultValue="chart">
                        <TabsContent value="chart" className="space-y-6">
                            <MetricsCards metrics={result?.metrics || null} isLoading={isRunning} />

                            <Card>
                                <CardHeader className="py-4 border-b">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base font-medium flex items-center gap-2">
                                            {symbol} {timeframe}
                                            {result && <span className="text-muted-foreground font-normal text-sm">| {selectedStrategy?.name}</span>}
                                        </CardTitle>
                                        <div className="text-xs text-muted-foreground">
                                            {result ? `${result.candles.length} Candles` : 'No Data'}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="flex flex-col">
                                        {/* Main Chart */}
                                        <div className="w-full h-[400px] bg-background relative flex items-center justify-center">
                                            {result ? (
                                                <BacktestChart
                                                    candles={result.candles}
                                                    signals={result.signals}
                                                    overlays={overlays}
                                                />
                                            ) : (
                                                <div className="text-muted-foreground flex flex-col items-center gap-2">
                                                    <Play className="w-8 h-8 opacity-20" />
                                                    <span>백테스트를 실행하여 결과를 확인하세요</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Indicator Chart (if RSI/MACD) */}
                                        {result && indicatorChartProps && (
                                            <div className="w-full h-[150px] border-t bg-background">
                                                <IndicatorChart
                                                    data={indicatorChartProps.data}
                                                    title={indicatorChartProps.title}
                                                    overbought={indicatorChartProps.overbought}
                                                    oversold={indicatorChartProps.oversold}
                                                    height={150}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="trades">
                            <Card>
                                <CardContent className="p-0">
                                    <TradeLogTable trades={result?.trades || []} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </ResultTabs>
                </div>
            </div>
        </div>
    );
}
