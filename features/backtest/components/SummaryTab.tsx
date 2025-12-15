"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trade } from "@/types";
import { cn } from "@/lib/utils";

interface SummaryTabProps {
    trades: Trade[];
    initialCapital: number;
}

export function SummaryTab({ trades, initialCapital }: SummaryTabProps) {
    // Helper to calculate metrics for a subset of trades
    const calculateMetrics = (subset: Trade[]) => {
        if (subset.length === 0) {
            return {
                netProfit: 0,
                totalProfit: 0,
                totalLoss: 0,
                count: 0,
                winRate: 0,
                profitFactor: 0,
            };
        }

        let netProfit = 0;
        let totalProfit = 0;
        let totalLoss = 0;
        let wins = 0;

        subset.forEach(t => {
            netProfit += t.pnl;
            if (t.pnl > 0) {
                totalProfit += t.pnl;
                wins++;
            } else {
                totalLoss += Math.abs(t.pnl);
            }
        });

        const winRate = (wins / subset.length) * 100;
        const profitFactor = totalLoss === 0 ? (totalProfit > 0 ? 999 : 0) : totalProfit / totalLoss;

        return {
            netProfit,
            totalProfit,
            totalLoss,
            count: subset.length,
            winRate,
            profitFactor,
        };
    };

    const total = calculateMetrics(trades);
    const longs = calculateMetrics(trades.filter(t => t.type === 'long'));
    const shorts = calculateMetrics(trades.filter(t => t.type === 'short'));

    // Formatting Helpers
    const fmtCurrency = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtPct = (val: number) => val.toFixed(2) + "%";
    const colorClass = (val: number) => (val > 0 ? "text-green-500" : val < 0 ? "text-red-500" : "");

    interface ResultRow {
        label: string;
        total: number | string;
        long: number | string;
        short: number | string;
        isCurrency?: boolean;
        isPercent?: boolean;
        isFixed?: boolean;
        color?: boolean;
    }

    const rows: ResultRow[] = [
        { label: "초기 자본 (Initial Capital)", total: initialCapital, long: "-", short: "-" },
        {
            label: "순이익 (Net Profit)",
            total: total.netProfit, long: longs.netProfit, short: shorts.netProfit,
            isCurrency: true, color: true
        },
        {
            label: "총 수익 (Gross Profit)",
            total: total.totalProfit, long: longs.totalProfit, short: shorts.totalProfit,
            isCurrency: true, color: true
        },
        {
            label: "총 손실 (Gross Loss)",
            total: -total.totalLoss, long: -longs.totalLoss, short: -shorts.totalLoss,
            isCurrency: true, color: true
        },
        {
            label: "거래 횟수 (Total Trades)",
            total: total.count, long: longs.count, short: shorts.count
        },
        {
            label: "승률 (Win Rate)",
            total: total.winRate, long: longs.winRate, short: shorts.winRate,
            isPercent: true, color: true
        },
        {
            label: "손익비 (Profit Factor)",
            total: total.profitFactor, long: longs.profitFactor, short: shorts.profitFactor,
            isFixed: true, color: true
        },
    ];

    return (
        <Card>
            <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">성과 요약 (Performance Summary)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[40%] pl-6">항목 (Metric)</TableHead>
                            <TableHead className="text-right">전체 (Total)</TableHead>
                            <TableHead className="text-right">매수 (Long)</TableHead>
                            <TableHead className="text-right pr-6">매도 (Short)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, i) => (
                            <TableRow key={i} className="hover:bg-muted/50">
                                <TableCell className="font-medium pl-6 text-muted-foreground">{row.label}</TableCell>
                                <TableCell className="text-right font-mono">
                                    <span className={row.color ? colorClass(row.total as number) : ""}>
                                        {formatValue(row.total, row)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                    <span className={row.color ? colorClass(typeof row.long === 'number' ? row.long : 0) : ""}>
                                        {formatValue(row.long, row)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right pr-6 font-mono text-muted-foreground">
                                    <span className={row.color ? colorClass(typeof row.short === 'number' ? row.short : 0) : ""}>
                                        {formatValue(row.short, row)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    function formatValue(val: string | number, row: ResultRow) {
        if (typeof val === 'string') return val;
        if (row.isCurrency) return (val > 0 ? '+' : '') + fmtCurrency(val);
        if (row.isPercent) return fmtPct(val);
        if (row.isFixed) return val.toFixed(2);
        return val.toLocaleString();
    }
}
