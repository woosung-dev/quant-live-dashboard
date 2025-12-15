"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Trash2, Activity, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Bot {
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
        last_check_at?: string;
        last_signal_at?: string;
        position?: string;
        pnl?: number;
    } | null;
}

export function CloudBotList() {
    const [bots, setBots] = useState<Bot[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBots = async () => {
        try {
            const res = await fetch('/api/bots');
            if (res.ok) {
                const data = await res.json();
                setBots(data.bots || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBots();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchBots, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleToggle = async (id: string) => {
        try {
            const res = await fetch(`/api/bots/${id}/toggle`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setBots(bots.map(b => b.id === id ? { ...b, status: data.status } : b));
                toast.success(`Bot is now ${data.status}`);
            }
        } catch (e) {
            toast.error("Failed to toggle bot");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this bot?")) return;
        try {
            const res = await fetch(`/api/bots/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setBots(bots.filter(b => b.id !== id));
                toast.success("Bot deleted");
            }
        } catch (e) {
            toast.error("Failed to delete bot");
        }
    };

    if (loading) return <div>Loading bots...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bots.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                    No cloud bots active. Deploy one from the Strategy Lab.
                </div>
            )}

            {bots.map(bot => (
                <Card key={bot.id} className={`border-l-4 ${bot.status === 'ACTIVE' ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{bot.name}</CardTitle>
                                <CardDescription>{bot.strategy?.name || "Unknown Strategy"}</CardDescription>
                            </div>
                            <Badge variant={bot.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {bot.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Zap className="w-3 h-3" /> {bot.config.symbol}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="w-3 h-3" /> {bot.config.timeframe}
                                </div>
                            </div>

                            <div className="bg-muted p-2 rounded text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span>Last Check:</span>
                                    <span>
                                        {bot.bot_state?.last_check_at
                                            ? formatDistanceToNow(new Date(bot.bot_state.last_check_at), { addSuffix: true })
                                            : 'Never'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Position:</span>
                                    <span className={bot.bot_state?.position === 'LONG' ? 'text-green-500' : 'text-muted-foreground'}>
                                        {bot.bot_state?.position || 'NONE'}
                                    </span>
                                </div>
                                {bot.bot_state?.pnl !== undefined && (
                                    <div className="flex justify-between font-mono">
                                        <span>PnL:</span>
                                        <span className={bot.bot_state.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                            {bot.bot_state.pnl.toFixed(2)} USDT
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    variant={bot.status === 'ACTIVE' ? "secondary" : "default"}
                                    size="sm"
                                    onClick={() => handleToggle(bot.id)}
                                >
                                    {bot.status === 'ACTIVE' ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                    {bot.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(bot.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
