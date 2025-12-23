"use client";

import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BotLogViewer } from "./BotLogViewer";
import { Play, Pause, X, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface BotDetail {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'ERROR';
    config: {
        symbol: string;
        timeframe: string;
    };
    created_at: string;
    strategy: {
        name: string;
    };
    bot_state?: {
        position?: string;
        entry_price?: number;
        current_price?: number;
        pnl?: number;
        total_trades?: number;
        winning_trades?: number;
        last_check_at?: string;
        last_signal_at?: string;
    } | null;
}

interface BotDetailPanelProps {
    botId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export function BotDetailPanel({ botId, isOpen, onClose, onToggle, onDelete }: BotDetailPanelProps) {
    const [bot, setBot] = useState<BotDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!botId || !isOpen) return;

        const fetchBotDetail = async () => {
            try {
                const res = await fetch(`/api/bots/${botId}`);
                if (res.ok) {
                    const data = await res.json();
                    setBot(data.bot);
                }
            } catch (e) {
                console.error('Failed to fetch bot details:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchBotDetail();
        // Refresh every 5 seconds
        const interval = setInterval(fetchBotDetail, 5000);
        return () => clearInterval(interval);
    }, [botId, isOpen]);

    if (!botId) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[600px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center justify-between">
                        <span>{bot?.name || 'Bot Details'}</span>
                        {bot && (
                            <Badge variant={bot.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {bot.status}
                            </Badge>
                        )}
                    </SheetTitle>
                    <SheetDescription>
                        {bot?.strategy?.name || 'Loading...'}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="py-10 text-center text-muted-foreground">Loading...</div>
                ) : bot ? (
                    <div className="space-y-6 pt-6">
                        {/* Quick Actions */}
                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                variant={bot.status === 'ACTIVE' ? 'secondary' : 'default'}
                                onClick={() => onToggle(bot.id)}
                            >
                                {bot.status === 'ACTIVE' ? (
                                    <>
                                        <Pause className="w-4 h-4 mr-2" />
                                        Pause Bot
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Bot
                                    </>
                                )}
                            </Button>
                            <Button variant="destructive" onClick={() => { onDelete(bot.id); onClose(); }}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <Separator />

                        {/* Performance Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted p-4 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">Symbol</div>
                                <div className="text-lg font-bold">{bot.config.symbol}</div>
                            </div>
                            <div className="bg-muted p-4 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">Timeframe</div>
                                <div className="text-lg font-bold">{bot.config.timeframe}</div>
                            </div>
                        </div>

                        {bot.bot_state && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted p-4 rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">Position</div>
                                        <div className="text-lg font-bold flex items-center gap-2">
                                            {bot.bot_state.position === 'LONG' ? (
                                                <>
                                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                                    <span className="text-green-500">LONG</span>
                                                </>
                                            ) : bot.bot_state.position === 'SHORT' ? (
                                                <>
                                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                                    <span className="text-red-500">SHORT</span>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">NONE</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-muted p-4 rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">PnL</div>
                                        <div className={`text-lg font-bold font-mono ${(bot.bot_state.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {(bot.bot_state.pnl || 0) >= 0 ? '+' : ''}
                                            ${(bot.bot_state.pnl || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted p-4 rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
                                        <div className="text-lg font-bold">{bot.bot_state.total_trades || 0}</div>
                                    </div>
                                    <div className="bg-muted p-4 rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                                        <div className="text-lg font-bold">
                                            {bot.bot_state.total_trades && bot.bot_state.total_trades > 0
                                                ? ((bot.bot_state.winning_trades || 0) / bot.bot_state.total_trades * 100).toFixed(1)
                                                : '0.0'}%
                                        </div>
                                    </div>
                                </div>

                                {bot.bot_state.last_check_at && (
                                    <div className="text-xs text-muted-foreground">
                                        Last checked: {format(new Date(bot.bot_state.last_check_at), 'PPpp')}
                                    </div>
                                )}
                            </>
                        )}

                        <Separator />

                        {/* Tabs for Logs and Settings */}
                        <Tabs defaultValue="logs" className="w-full">
                            <TabsList className="w-full grid grid-cols-2">
                                <TabsTrigger value="logs">
                                    <Activity className="w-4 h-4 mr-2" />
                                    Logs
                                </TabsTrigger>
                                <TabsTrigger value="info">Info</TabsTrigger>
                            </TabsList>
                            <TabsContent value="logs" className="mt-4">
                                <BotLogViewer botId={bot.id} />
                            </TabsContent>
                            <TabsContent value="info" className="mt-4 space-y-4">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Bot ID</div>
                                    <div className="text-sm font-mono bg-muted p-2 rounded">{bot.id}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Created At</div>
                                    <div className="text-sm">{format(new Date(bot.created_at), 'PPpp')}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Configuration</div>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                        {JSON.stringify(bot.config, null, 2)}
                                    </pre>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="py-10 text-center text-muted-foreground">Bot not found</div>
                )}
            </SheetContent>
        </Sheet>
    );
}
