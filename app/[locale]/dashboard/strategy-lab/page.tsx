"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeLogTable } from "@/features/backtest/components/TradeLogTable";
import { SummaryTab } from "@/features/backtest/components/SummaryTab";
import { AnalysisTab } from "@/features/backtest/components/AnalysisTab";
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
import { Loader2, Play, Lock, Zap } from "lucide-react";
import { toast } from "sonner";
import { saveStrategy, getUserStrategies, StrategyDTO } from "@/features/backtest/lib/storage";
import { saveBacktestResult } from "@/features/backtest/lib/result-service";
import { Save, FolderOpen, RefreshCw, Download } from "lucide-react";
import { SaveStrategyDialog } from "@/features/backtest/components/SaveStrategyDialog";
import { ShareDialog } from "@/features/social/components/ShareDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SecurityManager, KeyMap } from "@/features/trade/lib/security";
import { ExchangeService, ExchangeConfig } from "@/features/trade/lib/exchange";


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

    // Date Range State (for custom period backtesting)
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Strategy State
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>(defaultStrategy.id);
    const [strategyParams, setStrategyParams] = useState<Record<string, any>>({});

    // Alert State
    const [alertConfig, setAlertConfig] = useState<AlertConfig>({ type: 'webhook', url: '' });

    // Result State
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Dialog State
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [isPasscodeOpne, setIsPasscodeOpen] = useState(false);
    const [isSavingResult, setIsSavingResult] = useState(false);
    const [passcode, setPasscode] = useState("");

    // Real-time State
    const runnerRef = useRef<RealtimeRunner | null>(null);
    const apiKeysRef = useRef<KeyMap | null>(null);
    const [realtimeState, setRealtimeState] = useState<RealtimeState | null>(null);
    const [isLiveMode, setIsLiveMode] = useState(false); // Toggle for UI

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
    // Initialize & Cleanup runner
    // Initialize & Cleanup runner
    useEffect(() => {
        runnerRef.current = new RealtimeRunner(
            (state) => setRealtimeState(state),
            async (req) => {
                // Trade Execution Callback
                if (apiKeysRef.current) {
                    const keys = apiKeysRef.current;
                    // Find exchange config (Defaulting to Binance for MVP)
                    const exchangeId = 'binance';
                    const keyData = keys[exchangeId];
                    if (!keyData) {
                        toast.error(`No API Key found for ${exchangeId}`);
                        return;
                    }

                    try {
                        const service = new ExchangeService();
                        // Assume connected in memory or reconnect? 
                        // Service.connect is async.
                        // Ideally we keep a persistent service instance, but for now reconnecting is safer/easier statelessly?
                        // Actually connecting is fast.
                        await service.connect({
                            id: exchangeId,
                            apiKey: keyData.apiKey,
                            secret: keyData.secret,
                            // testnet: true // TODO: Store testnet preference in KeyMap
                        });

                        // Execute Market Order
                        // Quantity? 
                        // For MVP: Fixed tiny amount or error if not specified?
                        // Let's rely on req.quantity if present, else minimum.
                        const qty = req.quantity || 0.001; // BTC min?

                        await service.createMarketOrder(req.symbol, req.side, qty);
                        toast.success(`Unknown Order Placed on ${exchangeId}! (Simulated success if API works)`);
                    } catch (e) {
                        console.error("Trade Execution Failed", e);
                        toast.error("Trade Execution Failed: " + (e as Error).message);
                    }
                } else {
                    console.warn("Trade requested but no API keys unlocked.");
                }
            }
        );

        return () => {
            if (runnerRef.current) {
                runnerRef.current.stop();
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
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate && { endDate: new Date(endDate) }),
            };

            const result = await runBacktest(config, selectedStrategy, strategyParams);
            setResult(result);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Backtest execution failed.");
        } finally {
            setIsRunning(false);
        }
    };

    // --- Save/Load Strategy Handlers ---
    const handleSaveOpen = () => {
        if (!selectedStrategy || selectedStrategy.type !== 'PINE_SCRIPT') {
            toast.error("Only Custom Pine Strategies can be saved.");
            return;
        }
        setIsSaveDialogOpen(true);
    };

    const handleConfirmSave = async (strategyName: string) => {
        if (!selectedStrategy) return;

        const dto: StrategyDTO = {
            id: selectedStrategy.id.startsWith('custom-') ? undefined : selectedStrategy.id,
            name: strategyName,
            type: 'PINE_SCRIPT',
            code: strategyParams.code as string,
            parameters: selectedStrategy.parameters
        };

        const saved = await saveStrategy(dto);
        if (saved) {
            toast.success("Strategy saved successfully!");
            // Dispatch event to update StrategySelector
            window.dispatchEvent(new Event('strategy-saved'));
        } else {
            toast.error("Failed to save strategy.");
        }
    };

    const handleLoadStrategies = async () => {
        // Trigger reload in StrategySelector via event or just let it be.
        // Actually the button is "Load", maybe it should just open the selector or refresh it?
        // Since Selector is always visible, "Load" button is redundant if Selector auto-loads.
        // Let's make "Load" text "Refresh List" and reload.
        window.dispatchEvent(new Event('strategy-saved'));
        toast.success("Refreshed strategy list.");
    };

    // --- Save Backtest Result Handler ---
    const handleSaveResult = async () => {
        if (!result) return;
        setIsSavingResult(true);
        try {
            const saved = await saveBacktestResult(result);
            if (saved) {
                toast.success("백테스트 결과가 저장되었습니다!");
            } else {
                toast.error("결과 저장에 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
            toast.error("결과 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSavingResult(false);
        }
    };
    // -----------------------------------

    const handleToggleRealtime = () => {
        if (!selectedStrategy || !runnerRef.current) return;

        if (realtimeState?.status === 'running') {
            runnerRef.current.stop();
            toast.info("Realtime monitoring stopped.");
            return;
        }

        // If Live Mode selected, check keys
        if (isLiveMode) {
            if (!SecurityManager.hasSavedKeys()) {
                toast.error("No API Keys found. Go to Settings to configure them.");
                return;
            }
            // Unlock keys first
            setIsPasscodeOpen(true);
            return;
        }

        startRunner('PAPER');
    };

    const startRunner = (mode: 'PAPER' | 'LIVE', unlockedKeys?: KeyMap) => {
        if (!runnerRef.current || !selectedStrategy) return;

        if (mode === 'LIVE' && unlockedKeys) {
            apiKeysRef.current = unlockedKeys;
        }

        // Load Alert Config
        const savedConfig = localStorage.getItem('quant_live_notification_config');
        let alertConfig: AlertConfig | undefined = undefined;
        if (savedConfig) {
            try {
                alertConfig = JSON.parse(savedConfig);
            } catch (e) {
                console.error("Failed to parse alert config", e);
            }
        }

        const config: BacktestConfig = {
            symbol,
            timeframe,
            initialCapital: 10000,
        };

        const realtimeConfig = {
            ...config,
            intervalSeconds: 10,
            executionMode: mode
        };

        toast.success(`Started ${mode} monitoring ${symbol} ${timeframe}`);

        runnerRef.current.start(
            realtimeConfig,
            selectedStrategy,
            strategyParams,
            alertConfig
        );
    };

    const handleUnlockAndStart = () => {
        const keys = SecurityManager.loadKeys(passcode);
        if (keys) {
            setPasscode("");
            setIsPasscodeOpen(false);
            startRunner('LIVE', keys);
        } else {
            toast.error("Invalid Passcode");
        }
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
        <div className="flex h-[calc(100vh-4rem)] w-full bg-background overflow-hidden">
            {/* Left Sidebar: Configuration & Controls */}
            <aside className="w-[340px] 2xl:w-[400px] border-r bg-card/50 backdrop-blur-xl flex flex-col z-30 transition-all duration-300 shadow-md">
                <div className="h-14 px-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tracking-wider uppercase text-foreground/80">Strategy Lab</span>
                        {realtimeState?.status === 'running' && (
                            <Badge variant="destructive" className="animate-pulse px-1.5 py-0.5 text-[9px] font-mono tracking-widest">LIVE</Badge>
                        )}
                    </div>
                    <AlertSettings
                        onSave={setAlertConfig}
                        defaultConfig={alertConfig}
                    />
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-6">
                        {/* 1. Strategy Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Strategy</label>
                            <StrategySelector
                                selectedStrategyId={selectedStrategyId}
                                onSelect={setSelectedStrategyId}
                            />
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleSaveOpen}>
                                    <Save className="w-3.5 h-3.5 mr-2" />
                                    Save
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleLoadStrategies}>
                                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                    Load
                                </Button>
                            </div>
                            {/* Share Button (Only for saved strategies) */}
                            {selectedStrategy && selectedStrategy.id.length > 20 && ( // Simple heuristic for UUID vs string ID
                                <div className="mt-2 text-center">
                                    <ShareDialog
                                        strategy={selectedStrategy}
                                        onUpdate={() => {
                                            window.dispatchEvent(new Event('strategy-saved'));
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <Separator className="bg-border/50" />

                        {/* 2. Market Config */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Market Data</label>
                            <div className="flex flex-col gap-4">
                                <Select value={symbol} onValueChange={setSymbol}>
                                    <SelectTrigger className="h-9 w-full bg-background/50">
                                        <SelectValue placeholder="Symbol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUPPORTED_SYMBOLS.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <TimeframeSelector selectedTimeframe={timeframe} onSelect={setTimeframe} />

                                {/* Date Range Picker */}
                                <div className="space-y-2 pt-2">
                                    <label className="text-xs font-medium text-muted-foreground">Date Range (Optional)</label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            placeholder="Start"
                                            className="h-9 bg-background/50 text-xs"
                                        />
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            placeholder="End"
                                            className="h-9 bg-background/50 text-xs"
                                        />
                                    </div>
                                    {(startDate || endDate) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-6 px-2"
                                            onClick={() => { setStartDate(''); setEndDate(''); }}
                                        >
                                            Clear dates
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* 3. Parameters */}
                        {selectedStrategy && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Parameters</label>
                                </div>
                                <div className="border rounded-lg p-3 bg-muted/30">
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
                            </div>
                        )}

                        {/* 4. Actions */}
                        <div className="grid grid-cols-1 gap-3 pt-2">
                            <Button
                                className="w-full relative overflow-hidden group"
                                size="lg"
                                onClick={handleRunBacktest}
                                disabled={isRunning || !selectedStrategy}
                            >
                                <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                                <span className="relative flex items-center justify-center">
                                    {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                    Run Backtest
                                </span>
                            </Button>

                            <Button
                                className="w-full"
                                size="lg"
                                variant={realtimeState?.status === 'running' ? "destructive" : "secondary"}
                                onClick={handleToggleRealtime}
                                disabled={!selectedStrategy}
                            >
                                {realtimeState?.status === 'running' ? "Stop Monitoring" : (isLiveMode ? "Start Live Trading" : "Start Paper Trading")}
                            </Button>

                            <div className="flex items-center justify-between px-2 pt-2">
                                <Label htmlFor="live-mode" className={`text-xs font-semibold ${isLiveMode ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    {isLiveMode ? "LIVE EXECUTION ENABLED" : "Paper Trading Mode"}
                                </Label>
                                <Switch
                                    id="live-mode"
                                    checked={isLiveMode}
                                    onCheckedChange={setIsLiveMode}
                                    disabled={realtimeState?.status === 'running'}
                                />
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Real-time Logs Footer */}
                {realtimeState && (
                    <div className="h-32 border-t bg-black/90 p-2 font-mono text-[10px]">
                        <div className="flex justify-between items-center mb-1 text-muted-foreground">
                            <span>Real-time Logs</span>
                            <span className={realtimeState.status === 'running' ? 'text-green-500' : 'text-red-500'}>●</span>
                        </div>
                        <ScrollArea className="h-[calc(100%-1.5rem)]">
                            {realtimeState.logs.map((log, i) => (
                                <div key={i} className="text-green-400/90 py-0.5 border-b border-green-900/20">{log}</div>
                            ))}
                        </ScrollArea>
                    </div>
                )}
            </aside>

            {/* Main Content: Chart & Analytics */}
            <main className="flex-1 flex flex-col min-w-0 bg-muted/5 h-full relative">
                {/* Main Graph Area */}
                <div className="flex-1 min-h-0 relative flex flex-col">
                    <Tabs defaultValue="chart" className="flex-1 flex flex-col h-full">
                        {/* Tabs Bar */}
                        <div className="h-12 border-b bg-background/40 backdrop-blur-md px-4 flex items-center">
                            <TabsList className="bg-background/60 backdrop-blur-md border shadow-sm h-9">
                                <TabsTrigger value="chart" className="text-xs h-7 px-4">Chart</TabsTrigger>
                                <TabsTrigger value="analysis" className="text-xs h-7 px-4">Analysis</TabsTrigger>
                                <TabsTrigger value="summary" className="text-xs h-7 px-4">Summary</TabsTrigger>
                                <TabsTrigger value="trades" className="text-xs h-7 px-4">Trades</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Metrics Bar - Fixed Area */}
                        {result && (
                            <div className="border-b bg-background/30 backdrop-blur-md px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <MetricsCards metrics={result.metrics} isLoading={isRunning} />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSaveResult}
                                        disabled={isSavingResult}
                                        className="shrink-0 h-8 px-3"
                                    >
                                        {isSavingResult ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4 mr-2" />
                                        )}
                                        Save Result
                                    </Button>
                                </div>
                            </div>
                        )}

                        <TabsContent value="chart" className="flex-1 h-full m-0 data-[state=inactive]:hidden flex flex-col">
                            <div className="flex-1 relative w-full h-full bg-gradient-to-b from-background/50 to-muted/20 p-4">
                                {result ? (
                                    <div className="h-full flex flex-col gap-1">
                                        {/* Main Chart */}
                                        <div className={`min-h-0`}>
                                            <BacktestChart
                                                candles={result.candles}
                                                signals={result.signals}
                                                overlays={overlays}
                                            />
                                        </div>
                                        {/* Indicator Chart - Closer with minimal gap */}
                                        {indicatorChartProps && (
                                            <div className="flex-1 min-h-[120px] max-h-[180px] relative bg-background/20 rounded-md border border-border/30">
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
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                                        <div className="p-4 rounded-full bg-muted/50">
                                            <Play className="w-12 h-12 opacity-20" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium text-center">Ready to Backtest</h3>
                                            <p className="text-sm opacity-70 text-center">Configure your strategy and press Run</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="analysis" className="flex-1 h-full m-0 data-[state=inactive]:hidden p-6 overflow-auto">
                            <div className="max-w-4xl mx-auto py-8">
                                <h2 className="text-2xl font-bold mb-6">Strategy Analysis</h2>
                                {result ? (
                                    <AnalysisTab
                                        metrics={result.metrics}
                                        trades={result.trades}
                                    />
                                ) : <div className="text-center text-muted-foreground py-20">No results to analyze</div>}
                            </div>
                        </TabsContent>


                        <TabsContent value="summary" className="flex-1 h-full m-0 data-[state=inactive]:hidden p-6 overflow-auto">
                            <div className="max-w-4xl mx-auto py-8">
                                <h2 className="text-2xl font-bold mb-6">Performance Summary</h2>
                                {result ? (
                                    <SummaryTab
                                        trades={result.trades}
                                        initialCapital={result.config.initialCapital}
                                    />
                                ) : <div className="text-center text-muted-foreground py-20">No results</div>}
                            </div>
                        </TabsContent>

                        <TabsContent value="trades" className="flex-1 h-full m-0 data-[state=inactive]:hidden p-6 overflow-auto">
                            <div className="max-w-4xl mx-auto py-8">
                                <h2 className="text-2xl font-bold mb-6">Trade Logs</h2>
                                {result ? (
                                    <TradeLogTable trades={result.trades} />
                                ) : <div className="text-center text-muted-foreground py-20">No results</div>}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            <SaveStrategyDialog
                open={isSaveDialogOpen}
                onOpenChange={setIsSaveDialogOpen}
                onSave={handleConfirmSave}
                defaultName={selectedStrategy?.name}
            />

            {error && (
                <div className="fixed bottom-4 right-4 z-50">
                    <Card className="border-red-500/50 bg-red-500/10 backdrop-blur text-red-500 shadow-xl">
                        <CardContent className="p-4">
                            {error}
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Passcode Dialog */}
            <Dialog open={isPasscodeOpne} onOpenChange={setIsPasscodeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unlock API Keys</DialogTitle>
                        <DialogDescription>
                            Enter your security passcode to decrypt keys and start LIVE trading.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            type="password"
                            placeholder="Passcode"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlockAndStart()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasscodeOpen(false)}>Cancel</Button>
                        <Button onClick={handleUnlockAndStart}>Unlock & Start</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
