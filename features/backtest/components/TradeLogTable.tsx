"use client";

import { Trade } from "@/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface TradeLogTableProps {
    trades: Trade[];
}

export function TradeLogTable({ trades }: TradeLogTableProps) {
    if (!trades || trades.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Trade Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                        No trades executed yet.
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Sort trades by entry time descending (newest first)
    const sortedTrades = [...trades].sort((a, b) => b.entryTime - a.entryTime);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Trade Log ({trades.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Profit</TableHead>
                                <TableHead className="text-right">Return</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTrades.map((trade, index) => {
                                const isWin = trade.pnl > 0;
                                return (
                                    <TableRow key={index}>
                                        <TableCell className="font-mono text-xs">
                                            {format(trade.entryTime * 1000, "yyyy-MM-dd HH:mm")}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-0.5 rounded textxs font-medium ${trade.type === "long"
                                                        ? "bg-green-500/10 text-green-500"
                                                        : "bg-red-500/10 text-red-500"
                                                    }`}
                                            >
                                                {trade.type.toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {trade.entryPrice.toFixed(2)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-mono ${isWin ? "text-green-500" : "text-red-500"
                                                }`}
                                        >
                                            {trade.pnl > 0 ? "+" : ""}
                                            {trade.pnl.toFixed(2)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-mono ${isWin ? "text-green-500" : "text-red-500"
                                                }`}
                                        >
                                            {trade.pnl > 0 ? "+" : ""}
                                            {trade.pnlPercent.toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
