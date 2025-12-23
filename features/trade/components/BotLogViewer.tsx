"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface BotLog {
    id: string;
    timestamp: string;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'TRADE';
    action: string;
    details?: {
        price?: number;
        quantity?: number;
        reason?: string;
        pnl?: number;
        [key: string]: any;
    };
}

interface BotLogViewerProps {
    botId: string;
}

export function BotLogViewer({ botId }: BotLogViewerProps) {
    const [logs, setLogs] = useState<BotLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const limit = 20;

    const fetchLogs = async () => {
        try {
            const offset = page * limit;
            const levelParam = levelFilter !== 'all' ? `&level=${levelFilter}` : '';
            const res = await fetch(`/api/bots/${botId}/logs?limit=${limit}&offset=${offset}${levelParam}`);

            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setTotal(data.total || 0);
            }
        } catch (e) {
            console.error('Failed to fetch logs:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, [botId, page, levelFilter]);

    const getLevelBadgeVariant = (level: string) => {
        switch (level) {
            case 'ERROR': return 'destructive';
            case 'WARNING': return 'secondary';
            case 'TRADE': return 'default';
            default: return 'outline';
        }
    };

    const formatDetails = (log: BotLog) => {
        if (!log.details) return '-';

        const parts: string[] = [];
        if (log.details.price) parts.push(`$${log.details.price.toLocaleString()}`);
        if (log.details.quantity) parts.push(`×${log.details.quantity}`);
        if (log.details.pnl !== undefined) {
            const pnlColor = log.details.pnl >= 0 ? 'text-green-500' : 'text-red-500';
            parts.push(`PnL: <span class="${pnlColor}">${log.details.pnl >= 0 ? '+' : ''}$${log.details.pnl.toFixed(2)}</span>`);
        }
        if (log.details.reason) parts.push(log.details.reason);

        return parts.length > 0 ? parts.join(' • ') : '-';
    };

    const totalPages = Math.ceil(total / limit);

    if (loading && logs.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">Loading logs...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="TRADE">Trade</SelectItem>
                            <SelectItem value="INFO">Info</SelectItem>
                            <SelectItem value="WARNING">Warning</SelectItem>
                            <SelectItem value="ERROR">Error</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                        {total} total logs
                    </span>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Logs Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Time</TableHead>
                            <TableHead className="w-[100px]">Level</TableHead>
                            <TableHead className="w-[150px]">Action</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                    No logs found
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">
                                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getLevelBadgeVariant(log.level)}>
                                            {log.level}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{log.action}</TableCell>
                                    <TableCell
                                        className="text-sm text-muted-foreground"
                                        dangerouslySetInnerHTML={{ __html: formatDetails(log) }}
                                    />
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
