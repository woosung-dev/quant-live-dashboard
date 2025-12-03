export interface TradeData {
    p: string; // Price
    q: string; // Quantity
    T: number; // Timestamp
    s: string; // Symbol
}

export interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface SimulationResult {
    totalPnL: number;
    winRate: number;
    trades: number;
    equityCurve: { time: number; value: number }[];
}
