"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { StrategySelector } from "@/components/backtest/StrategySelector";
import { ParameterForm } from "@/components/backtest/ParameterForm";
import { TimeframeSelector } from "@/components/backtest/TimeframeSelector";
import { BacktestChart } from "@/components/backtest/BacktestChart";
import { MetricsCards } from "@/components/backtest/MetricsCards";
import {
    getStrategyById,
    defaultStrategy
} from "@/lib/strategies";
import { runBacktest } from "@/lib/backtest";
import {
    BacktestResult,
    BacktestConfig,
    Timeframe,
    SUPPORTED_SYMBOLS,
    Strategy
} from "@/types";
import { Loader2, Play } from "lucide-react";

// Default configuration
const DEFAULT_CONFIG: BacktestConfig = {
    symbol: "BTCUSDT",
    timeframe: "1d",
    initialCapital: 10000,
    limit: 500, // Load enough candles for good visualization
};

export default function StrategyLabPage() {
    const t = useTranslations('Dashboard'); // Assuming translation namespace

    // Configuration State
    const [symbol, setSymbol] = useState<string>(DEFAULT_CONFIG.symbol);
    const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_CONFIG.timeframe);

    // Strategy State
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>(defaultStrategy.id);
    const [strategyParams, setStrategyParams] = useState<Record<string, any>>({});

    // Result State
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="container mx-auto p-4 space-y-6 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Strategy Lab</h1>
                    <p className="text-muted-foreground">
                        전략을 만들고 테스트하여 시장을 이기는 알파를 찾으세요.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Global Actions if any */}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar: Configuration */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">설정 (Configuration)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Symbol Selection */}
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

                        {/* Timeframe Selection */}
                        <TimeframeSelector
                            selectedTimeframe={timeframe}
                            onSelect={setTimeframe}
                        />

                        <Separator />

                        {/* Strategy Selection */}
                        <StrategySelector
                            selectedStrategyId={selectedStrategyId}
                            onSelect={setSelectedStrategyId}
                        />

                        {/* Dynamic Parameters */}
                        {selectedStrategy && (
                            <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground">Parameters</span>
                                </div>
                                <ParameterForm
                                    parameters={selectedStrategy.parameters}
                                    values={strategyParams}
                                    onChange={setStrategyParams}
                                />
                            </div>
                        )}

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
                                    백테스트 실행
                                </>
                            )}
                        </Button>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                {error}
                            </div>
                        )}

                    </CardContent>
                </Card>

                {/* Main Content: Charts & Results */}
                <div className="lg:col-span-3 space-y-6">

                    {/* Metrics */}
                    <MetricsCards metrics={result?.metrics || null} isLoading={isRunning} />

                    {/* Main Chart */}
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
                            <div className="aspect-[16/9] w-full bg-muted/10 relative flex items-center justify-center">
                                {result ? (
                                    <BacktestChart candles={result.candles} signals={result.signals} />
                                ) : (
                                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                                        <Play className="w-8 h-8 opacity-20" />
                                        <span>백테스트를 실행하여 결과를 확인하세요</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Trades Table can go here later */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">거래 기록 (Trade Log)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {result && result.trades.length > 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    총 {result.trades.length}개의 거래가 발생했습니다. (상세 내역 테이블 구현 예정)
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground p-4 text-center">
                                    거래 데이터가 없습니다.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
