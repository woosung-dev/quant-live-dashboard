/**
 * 백테스팅 엔진 핵심 타입 정의
 * @description Quant Live Dashboard - Backtesting Engine Types
 */

/** 지원 타임프레임 */
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' | '1w';

/** Binance 타임프레임 매핑 */
export const TIMEFRAME_MAP: Record<Timeframe, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '2h': '2h',
    '4h': '4h',
    '6h': '6h',
    '12h': '12h',
    '1d': '1d',
    '1w': '1w',
};

/** 타임프레임 레이블 (UI용) */
export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
    '1m': '1분',
    '5m': '5분',
    '15m': '15분',
    '30m': '30분',
    '1h': '1시간',
    '2h': '2시간',
    '4h': '4시간',
    '6h': '6시간',
    '12h': '12시간',
    '1d': '1일',
    '1w': '1주',
};

/** 백테스트 설정 */
export interface BacktestConfig {
    symbol: string;
    timeframe: Timeframe;
    startDate?: Date;
    endDate?: Date;
    limit?: number;           // 기본 1000
    initialCapital: number;   // 기본 10000
}

/** 전략 파라미터 정의 */
export interface ParameterDefinition {
    name: string;
    label: string;
    type: 'number' | 'select' | 'boolean';
    defaultValue: number | string | boolean;
    min?: number;
    max?: number;
    step?: number;
    options?: { label: string; value: string }[];
}

/** 전략 인터페이스 */
export interface Strategy {
    id: string;
    name: string;
    description: string;
    parameters: ParameterDefinition[];
    execute: (candles: Candle[], params: Record<string, unknown>) => Signal[];
}

/** 캔들 데이터 */
export interface Candle {
    time: number;      // Unix timestamp (seconds)
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/** 시그널 */
export interface Signal {
    time: number;
    type: 'buy' | 'sell';
    price: number;
    reason?: string;
}

/** 거래 기록 */
export interface Trade {
    id: number;
    type: 'long' | 'short';
    entryTime: number;
    entryPrice: number;
    exitTime: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    pnlPercent: number;
    cumulativePnl: number;
}

/** 수익 곡선 포인트 */
export interface EquityPoint {
    time: number;
    equity: number;
    drawdown: number;
}

/** 성과 지표 */
export interface PerformanceMetrics {
    netProfit: number;
    netProfitPercent: number;
    grossProfit: number;
    grossLoss: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    avgWinPercent: number;
    avgLossPercent: number;
    maxWin: number;
    maxLoss: number;
    avgTradeDuration: number;  // milliseconds
}

/** 백테스트 결과 */
export interface BacktestResult {
    config: BacktestConfig;
    strategy: Strategy;
    candles: Candle[];
    signals: Signal[];
    trades: Trade[];
    equityCurve: EquityPoint[];
    metrics: PerformanceMetrics;
    executionTime: number;  // ms
}

/** Binance Kline API 응답 타입 */
export type BinanceKline = [
    number,   // Open time (ms)
    string,   // Open
    string,   // High
    string,   // Low
    string,   // Close
    string,   // Volume
    number,   // Close time (ms)
    string,   // Quote asset volume
    number,   // Number of trades
    string,   // Taker buy base asset volume
    string,   // Taker buy quote asset volume
    string,   // Ignore
];

/** 지원 심볼 목록 */
export const SUPPORTED_SYMBOLS = [
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'XRPUSDT',
    'SOLUSDT',
    'ADAUSDT',
    'DOGEUSDT',
    'MATICUSDT',
    'DOTUSDT',
    'LTCUSDT',
] as const;

export type SupportedSymbol = typeof SUPPORTED_SYMBOLS[number];
