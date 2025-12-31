/**
 * 백테스팅 엔진
 * @description Binance API 연동 및 백테스트 실행 핵심 로직
 */

import {
    BacktestConfig,
    BacktestResult,
    BinanceKline,
    Candle,
    EquityPoint,
    PerformanceMetrics,
    Signal,
    Strategy,
    Timeframe,
    Trade,
    TIMEFRAME_MAP,
} from '@/types';
import { supabase } from '@/lib/supabase'; // Import Supabase client
import { runPineScript } from './pine/runner';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

/**
 * 하이브리드 캔들 로딩: DB + API 병합
 * @description 히스토리컬 데이터는 캐시에서, 최신 데이터는 API에서 가져와 병합
 * @param symbol - 거래쌍 (예: BTCUSDT)
 * @param timeframe - 타임프레임 (예: 1h, 4h, 1d)
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜 (기본: 현재)
 */
export async function fetchCandlesWithDateRange(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date = new Date()
): Promise<Candle[]> {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    // 오늘 자정 (UTC 기준)
    const todayMidnight = new Date();
    todayMidnight.setUTCHours(0, 0, 0, 0);
    const todayStart = todayMidnight.getTime();

    console.log(`[Hybrid] Fetching ${symbol}/${timeframe} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const allCandles: Candle[] = [];

    // 1. 히스토리컬 데이터 (어제까지): DB 캐시 시도 → API 폴백
    if (startTime < todayStart) {
        const historicalEndTime = Math.min(endTime, todayStart - 1);
        let cachedCandles: Candle[] = [];

        // 1a. DB 캐시에서 조회
        try {
            const { data: cachedData, error } = await supabase
                .from('candle_cache')
                .select('*')
                .eq('symbol', symbol)
                .eq('timeframe', timeframe)
                .gte('time', Math.floor(startTime / 1000))
                .lte('time', Math.floor(historicalEndTime / 1000))
                .order('time', { ascending: true });

            if (!error && cachedData && cachedData.length > 0) {
                cachedCandles = cachedData.map(c => ({
                    time: Number(c.time),
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                    volume: Number(c.volume)
                }));
                console.log(`[Hybrid] DB cache: ${cachedCandles.length} candles`);
            }
        } catch (e) {
            console.warn('[Hybrid] DB cache exception:', e);
        }

        // 1b. 캐시 미스 또는 불충분한 데이터 → API에서 가져오기
        if (cachedCandles.length === 0) {
            console.log('[Hybrid] Cache miss, fetching from API...');
            const apiCandles = await fetchCandlesFromAPI(symbol, timeframe, startTime, historicalEndTime);
            allCandles.push(...apiCandles);
            
            // 캐시에 저장 (비동기)
            if (apiCandles.length > 0) {
                cacheCandlesAsync(symbol, timeframe, apiCandles);
            }
        } else {
            allCandles.push(...cachedCandles);
        }
    }

    // 2. 최신 데이터 (오늘): API에서 실시간 조회
    if (endTime >= todayStart) {
        const apiStartTime = Math.max(startTime, todayStart);
        const todayCandles = await fetchCandlesFromAPI(symbol, timeframe, apiStartTime, endTime);
        allCandles.push(...todayCandles);
        console.log(`[Hybrid] API realtime: ${todayCandles.length} candles`);
    }

    // 3. 중복 제거 및 정렬
    const uniqueCandles = Array.from(
        new Map(allCandles.map(c => [c.time, c])).values()
    ).sort((a, b) => a.time - b.time);

    console.log(`[Hybrid] Total: ${uniqueCandles.length} unique candles`);

    return uniqueCandles;
}

/**
 * Binance API에서 캔들 데이터 가져오기 (여러 청크로 분할)
 * API limit은 1000개이므로 큰 범위는 청크로 분할
 */
async function fetchCandlesFromAPI(
    symbol: string,
    timeframe: Timeframe,
    startTime: number,
    endTime: number
): Promise<Candle[]> {
    const allCandles: Candle[] = [];
    const interval = TIMEFRAME_MAP[timeframe];
    
    // 타임프레임별 밀리초 계산
    const tfMs: Record<Timeframe, number> = {
        '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000,
        '1h': 3600000, '2h': 7200000, '4h': 14400000, '6h': 21600000,
        '12h': 43200000, '1d': 86400000, '1w': 604800000
    };
    const candleDuration = tfMs[timeframe] || 3600000;
    
    // 1000개 캔들씩 청크로 분할
    const chunkSize = 1000;
    const chunkDuration = chunkSize * candleDuration;
    
    let currentStart = startTime;
    
    while (currentStart < endTime) {
        const chunkEnd = Math.min(currentStart + chunkDuration, endTime);
        
        try {
            const params = new URLSearchParams({
                symbol: symbol.toUpperCase(),
                interval,
                startTime: currentStart.toString(),
                endTime: chunkEnd.toString(),
                limit: '1000',
            });

            const response = await fetch(`${BINANCE_API_BASE}/klines?${params.toString()}`);

            if (response.ok) {
                const data: BinanceKline[] = await response.json();
                const candles = data.map(transformKlineToCandle);
                allCandles.push(...candles);
            }
        } catch (e) {
            console.warn('[API] Fetch error:', e);
        }
        
        currentStart = chunkEnd;
        
        // Rate limit 방지 (너무 많은 요청 시)
        if (currentStart < endTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return allCandles;
}

/**
 * 캔들 데이터를 캐시에 비동기 저장
 */
async function cacheCandlesAsync(symbol: string, timeframe: string, candles: Candle[]) {
    try {
        const rows = candles.map(c => ({
            symbol,
            timeframe,
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume
        }));

        const { error } = await supabase
            .from('candle_cache')
            .upsert(rows, { onConflict: 'symbol,timeframe,time', ignoreDuplicates: true });

        if (error) console.error("[Cache] Insert Error:", error);
        else console.log(`[Cache] Saved ${rows.length} candles for ${symbol}/${timeframe}`);
    } catch (e) {
        console.warn('[Cache] Save exception:', e);
    }
}


/**
 * Binance API에서 캔들 데이터를 가져옵니다.
 * @param symbol - 거래쌍 (예: BTCUSDT)
 * @param timeframe - 타임프레임 (예: 1h, 4h, 1d)
 * @param limit - 캔들 수 (기본 1000, 최대 1000)
 * @param startTime - 시작 시간 (ms, optional)
 * @param endTime - 종료 시간 (ms, optional)
 */
export async function fetchCandles(
    symbol: string,
    timeframe: Timeframe,
    limit: number = 1000,
    startTime?: number,
    endTime?: number
): Promise<Candle[]> {
    const interval = TIMEFRAME_MAP[timeframe];
    // Convert ms inputs to seconds for DB comparison if needed, but Binance takes ms.
    // Our DB stores 'time' as Unix timestamp in seconds (per our Transform).

    // 1. Try to fetch from Cache
    // We want the LATEST 'limit' candles ending at 'endTime' (or now).
    // If startTime is provided, we want candles >= startTime.

    // Simplification: For now, let's just try to fetch the range from DB if both start/end are known,
    // or just fetch from API and upsert. Backtesting usually needs precise data.
    // Given the complexity of gap handling in cache, a robust strategy is:
    // Try fetch from DB -> If count < limit -> Fetch from API -> Upsert to DB.

    try {
        let query = supabase
            .from('candle_cache')
            .select('*')
            .eq('symbol', symbol)
            .eq('timeframe', timeframe)
            .order('time', { ascending: true });

        if (startTime) {
            query = query.gte('time', startTime ? Math.floor(startTime / 1000) : 0);
        }
        if (endTime) {
            query = query.lte('time', endTime ? Math.floor(endTime / 1000) : Number.MAX_SAFE_INTEGER);
        } else {
            // If no endTime, we usually want the latest.
            // But 'limit' implies we want the *last* N candles.
            // If we query ascending, we get the *first* N.
            // Use descending for latest, then reverse.
            if (!startTime) {
                query = supabase
                    .from('candle_cache')
                    .select('*')
                    .eq('symbol', symbol)
                    .eq('timeframe', timeframe)
                    .order('time', { ascending: false })
                    .limit(limit);
            }
        }

        const { data: cachedData, error } = await query;

        // If specific range requested (start/end), check coverage?
        // For simplified "latest" query:
        if (!error && cachedData && cachedData.length > 0) {
            // If we requested limit=500 and got 500, we're good.
            // If we got fewer, maybe gap?
            // For now, let's only use cache if we have "enough" data relative to limit.
            // Or just merge? Merging is hard.
            // Simple policy: If cache hit count >= limit, USE IT.
            if (cachedData.length >= limit) {
                console.log(`Cache Hit: ${cachedData.length} candles for ${symbol}-${timeframe}`);
                // If we fetched descending, reverse back to ascending
                const sorted = !startTime && !endTime ? cachedData.reverse() : cachedData;
                return sorted.map(c => ({
                    time: Number(c.time),
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                    volume: Number(c.volume)
                }));
            }
        }
    } catch (e) {
        console.warn("Cache Warning:", e);
    }

    const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval,
        limit: Math.min(limit, 1000).toString(),
    });

    if (startTime) {
        params.append('startTime', startTime.toString());
    }
    if (endTime) {
        params.append('endTime', endTime.toString());
    }

    const url = `${BINANCE_API_BASE}/klines?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Binance API 오류: ${response.status} ${response.statusText}`);
        }

        const data: BinanceKline[] = await response.json();
        const candles = data.map(transformKlineToCandle);

        // Async Cache Insert (Fire and Forget)
        (async () => {
            if (candles.length > 0) {
                const rows = candles.map(c => ({
                    symbol: symbol,
                    timeframe: timeframe,
                    time: c.time,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume
                }));

                const { error } = await supabase
                    .from('candle_cache')
                    .upsert(rows, { onConflict: 'symbol,timeframe,time', ignoreDuplicates: true });

                if (error) console.error("Cache Insert Error:", error);
                else console.log(`Cached ${rows.length} candles for ${symbol}`);
            }
        })();

        return candles;

    } catch (err) {
        console.error("Fetch Error:", err);
        throw err;
    }
}

/**
 * Binance Kline 데이터를 Candle 형식으로 변환합니다.
 */
function transformKlineToCandle(kline: BinanceKline): Candle {
    return {
        time: Math.floor(kline[0] / 1000), // ms -> seconds
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
    };
}

/**
 * 연속 같은 방향 신호를 필터링합니다.
 * 예: buy -> buy -> sell -> sell -> buy
 *  => buy -> sell -> buy (중복 제거)
 */
function filterDuplicateSignals(signals: Signal[]): Signal[] {
    if (signals.length === 0) return signals;
    
    // 시간순 정렬
    const sorted = [...signals].sort((a, b) => a.time - b.time);
    
    const filtered: Signal[] = [];
    let lastType: 'buy' | 'sell' | null = null;
    
    for (const signal of sorted) {
        // buy/sell 신호만 필터링 (tp/sl은 그대로 유지)
        if (signal.type === 'buy' || signal.type === 'sell') {
            if (signal.type !== lastType) {
                filtered.push(signal);
                lastType = signal.type;
            }
            // 같은 방향 연속 신호는 무시
        } else {
            // tp, sl 등 다른 타입은 그대로 추가
            filtered.push(signal);
        }
    }
    
    return filtered;
}

/**
 * 시그널을 기반으로 거래를 시뮬레이션합니다.
 * TP/SL 지원: 캔들의 high/low를 체크하여 정확한 체결 가격 기록
 */
function simulateTrades(
    candles: Candle[],
    signals: Signal[],
    initialCapital: number
): { trades: Trade[]; equityCurve: EquityPoint[] } {
    const trades: Trade[] = [];
    const equityCurve: EquityPoint[] = [];

    let capital = initialCapital;
    let tradeId = 0;
    let peakEquity = initialCapital;

    // 활성 포지션 상태
    interface ActivePosition {
        type: 'long' | 'short';
        entryPrice: number;
        entryTime: number;
        quantity: number;
        stopLoss: number;
        takeProfits: { price: number; ratio: number; hit: boolean }[];
    }
    let position: ActivePosition | null = null;

    // 시그널을 시간 기준 맵으로 변환 (빠른 조회)
    const signalMap = new Map<number, Signal>();
    signals.forEach(s => {
        // buy/sell 신호만 맵에 저장 (entry 신호)
        if (s.type === 'buy' || s.type === 'sell') {
            signalMap.set(s.time, s);
        }
    });

    // 캔들 순회 (시간순)
    for (const candle of candles) {
        const signal = signalMap.get(candle.time);

        // 1. 활성 포지션이 있으면 TP/SL 체크
        if (position) {
            let exitPrice: number | null = null;
            let exitReason: 'tp' | 'sl' | null = null;

            if (position.type === 'long') {
                // Long 포지션: SL은 low, TP는 high 체크
                
                // SL 체크 (보수적 접근: SL 먼저)
                if (position.stopLoss > 0 && candle.low <= position.stopLoss) {
                    exitPrice = position.stopLoss;
                    exitReason = 'sl';
                }
                // TP 체크 (전체 청산 - 첫 번째 TP만 사용)
                else if (position.takeProfits.length > 0) {
                    const firstTP = position.takeProfits[0];
                    if (!firstTP.hit && candle.high >= firstTP.price) {
                        exitPrice = firstTP.price;
                        exitReason = 'tp';
                    }
                }
            } else if (position.type === 'short') {
                // Short 포지션: SL은 high, TP는 low 체크
                
                // SL 체크
                if (position.stopLoss > 0 && candle.high >= position.stopLoss) {
                    exitPrice = position.stopLoss;
                    exitReason = 'sl';
                }
                // TP 체크
                else if (position.takeProfits.length > 0) {
                    const firstTP = position.takeProfits[0];
                    if (!firstTP.hit && candle.low <= firstTP.price) {
                        exitPrice = firstTP.price;
                        exitReason = 'tp';
                    }
                }
            }

            // TP/SL 청산 처리
            if (exitPrice !== null && exitReason !== null) {
                const pnl = position.type === 'long'
                    ? (exitPrice - position.entryPrice) * position.quantity
                    : (position.entryPrice - exitPrice) * position.quantity;
                const pnlPercent = position.type === 'long'
                    ? ((exitPrice - position.entryPrice) / position.entryPrice) * 100
                    : ((position.entryPrice - exitPrice) / position.entryPrice) * 100;
                
                capital += pnl;

                trades.push({
                    id: ++tradeId,
                    type: position.type,
                    entryTime: position.entryTime,
                    entryPrice: position.entryPrice,
                    exitTime: candle.time,
                    exitPrice: exitPrice,
                    exitReason: exitReason,
                    quantity: position.quantity,
                    pnl,
                    pnlPercent,
                    cumulativePnl: capital - initialCapital,
                });

                position = null;  // 포지션 종료
            }
        }

        // 2. 새 진입 신호 처리
        if (signal && !position) {
            const entryPrice = signal.price;
            const quantity = capital / entryPrice;

            // TP/SL 설정
            const takeProfits: { price: number; ratio: number; hit: boolean }[] = [];
            if (signal.takeProfit && signal.takeProfit.length > 0) {
                const ratios = signal.tpRatio || signal.takeProfit.map(() => 1 / signal.takeProfit!.length);
                signal.takeProfit.forEach((tp, i) => {
                    takeProfits.push({ price: tp, ratio: ratios[i] || 0.33, hit: false });
                });
            }

            if (signal.type === 'buy') {
                position = {
                    type: 'long',
                    entryPrice,
                    entryTime: candle.time,
                    quantity,
                    stopLoss: signal.stopLoss || 0,
                    takeProfits,
                };
            } else if (signal.type === 'sell') {
                // 반대 신호로 청산 (기존 로직 유지)
                // 현재는 short 진입으로 처리
                position = {
                    type: 'short',
                    entryPrice,
                    entryTime: candle.time,
                    quantity,
                    stopLoss: signal.stopLoss || 0,
                    takeProfits,
                };
            }
        }

        // 3. 반대 신호로 청산
        if (signal && position) {
            if ((signal.type === 'buy' && position.type === 'short') ||
                (signal.type === 'sell' && position.type === 'long')) {
                
                const exitPrice = signal.price;
                const pnl = position.type === 'long'
                    ? (exitPrice - position.entryPrice) * position.quantity
                    : (position.entryPrice - exitPrice) * position.quantity;
                const pnlPercent = position.type === 'long'
                    ? ((exitPrice - position.entryPrice) / position.entryPrice) * 100
                    : ((position.entryPrice - exitPrice) / position.entryPrice) * 100;
                
                capital += pnl;

                trades.push({
                    id: ++tradeId,
                    type: position.type,
                    entryTime: position.entryTime,
                    entryPrice: position.entryPrice,
                    exitTime: candle.time,
                    exitPrice: exitPrice,
                    exitReason: 'signal',
                    quantity: position.quantity,
                    pnl,
                    pnlPercent,
                    cumulativePnl: capital - initialCapital,
                });

                // 새 방향으로 진입
                const newQuantity = capital / exitPrice;
                const takeProfits: { price: number; ratio: number; hit: boolean }[] = [];
                if (signal.takeProfit && signal.takeProfit.length > 0) {
                    signal.takeProfit.forEach((tp, i) => {
                        takeProfits.push({ price: tp, ratio: signal.tpRatio?.[i] || 0.33, hit: false });
                    });
                }

                position = {
                    type: signal.type === 'buy' ? 'long' : 'short',
                    entryPrice: exitPrice,
                    entryTime: candle.time,
                    quantity: newQuantity,
                    stopLoss: signal.stopLoss || 0,
                    takeProfits,
                };
            }
        }

        // 수익 곡선 업데이트
        peakEquity = Math.max(peakEquity, capital);
        const drawdown = peakEquity > 0 ? ((peakEquity - capital) / peakEquity) * 100 : 0;

        equityCurve.push({
            time: candle.time,
            equity: capital,
            drawdown,
        });
    }

    return { trades, equityCurve };
}

/**
 * 거래 결과에서 성과 지표를 계산합니다.
 */
function calculateMetrics(
    trades: Trade[],
    equityCurve: EquityPoint[],
    initialCapital: number
): PerformanceMetrics {
    if (trades.length === 0) {
        return {
            netProfit: 0,
            netProfitPercent: 0,
            grossProfit: 0,
            grossLoss: 0,
            maxDrawdown: 0,
            maxDrawdownPercent: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            profitFactor: 0,
            avgWin: 0,
            avgLoss: 0,
            avgWinPercent: 0,
            avgLossPercent: 0,
            maxWin: 0,
            maxLoss: 0,
            avgTradeDuration: 0,
        };
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const netProfit = grossProfit - grossLoss;
    const netProfitPercent = (netProfit / initialCapital) * 100;

    const maxDrawdownPercent = equityCurve.length > 0
        ? Math.max(...equityCurve.map(e => e.drawdown))
        : 0;
    const maxDrawdown = (maxDrawdownPercent / 100) * initialCapital;

    const avgWin = winningTrades.length > 0
        ? grossProfit / winningTrades.length
        : 0;
    const avgLoss = losingTrades.length > 0
        ? grossLoss / losingTrades.length
        : 0;

    const avgWinPercent = winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length
        : 0;
    const avgLossPercent = losingTrades.length > 0
        ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / losingTrades.length)
        : 0;

    const maxWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map(t => t.pnl))
        : 0;
    const maxLoss = losingTrades.length > 0
        ? Math.max(...losingTrades.map(t => Math.abs(t.pnl)))
        : 0;

    const avgTradeDuration = trades.length > 0
        ? trades.reduce((sum, t) => sum + (t.exitTime - t.entryTime), 0) / trades.length * 1000 // seconds -> ms
        : 0;

    return {
        netProfit,
        netProfitPercent,
        grossProfit,
        grossLoss,
        maxDrawdown,
        maxDrawdownPercent,
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: (winningTrades.length / trades.length) * 100,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
        avgWin,
        avgLoss,
        avgWinPercent,
        avgLossPercent,
        maxWin,
        maxLoss,
        avgTradeDuration,
    };
}

/**
 * 백테스트를 실행합니다.
 * @param config - 백테스트 설정
 * @param strategy - 실행할 전략
 * @param params - 전략 파라미터
 */
export async function runBacktest(
    config: BacktestConfig,
    strategy: Strategy,
    params: Record<string, unknown>
): Promise<BacktestResult> {
    const startTime = performance.now();

    // 1. 캔들 데이터 가져오기 (하이브리드 방식)
    let candles: Candle[];

    if (config.startDate && config.endDate) {
        // 날짜 범위가 지정된 경우: 하이브리드 로딩 (DB + API)
        candles = await fetchCandlesWithDateRange(
            config.symbol,
            config.timeframe,
            config.startDate,
            config.endDate
        );
    } else if (config.startDate) {
        // 시작 날짜만 지정된 경우
        candles = await fetchCandlesWithDateRange(
            config.symbol,
            config.timeframe,
            config.startDate,
            new Date()
        );
    } else {
        // 기존 방식: 최신 N개 캔들
        candles = await fetchCandles(
            config.symbol,
            config.timeframe,
            config.limit || 1000,
            config.endDate?.getTime()
        );
    }

    // 2. 전략 실행하여 시그널 생성
    let signals: Signal[] = [];
    let indicators: Record<string, number[]> | undefined;

    if (strategy.type === 'PINE_SCRIPT' || strategy.id === 'pine-script' || (strategy.id && strategy.id.startsWith('custom-'))) {
        const code = (params.code as string) || strategy.code || "";
        if (code) {
            const pineResult = runPineScript(code, candles);
            signals = pineResult.signals;
            indicators = pineResult.indicators;
        }
    } else if (strategy.execute) {
        const result = strategy.execute(candles, params);
        signals = result.signals;
        indicators = result.indicators;
    } else {
        console.warn(`Strategy ${strategy.name} cannot be executed.`);
    }

    // 2.5 신호 필터링: 연속 같은 방향 신호 제거 (실제 거래될 신호만 유지)
    signals = filterDuplicateSignals(signals);

    // 3. 시그널 기반으로 거래 시뮬레이션
    const { trades, equityCurve } = simulateTrades(
        candles,
        signals,
        config.initialCapital
    );

    // 4. 성과 지표 계산
    const metrics = calculateMetrics(trades, equityCurve, config.initialCapital);

    const executionTime = performance.now() - startTime;

    return {
        config,
        strategy,
        candles,
        signals,
        indicators,
        trades,
        equityCurve,
        metrics,
        executionTime,
    };
}

/**
 * 캔들 데이터에서 종가 배열을 추출합니다.
 */
export function getClosePrices(candles: Candle[]): number[] {
    return candles.map(c => c.close);
}

/**
 * 캔들 데이터에서 고가 배열을 추출합니다.
 */
export function getHighPrices(candles: Candle[]): number[] {
    return candles.map(c => c.high);
}

/**
 * 캔들 데이터에서 저가 배열을 추출합니다.
 */
export function getLowPrices(candles: Candle[]): number[] {
    return candles.map(c => c.low);
}

/**
 * 캔들 데이터에서 시가 배열을 추출합니다.
 */
export function getOpenPrices(candles: Candle[]): number[] {
    return candles.map(c => c.open);
}

/**
 * 캔들 데이터에서 거래량 배열을 추출합니다.
 */
export function getVolumes(candles: Candle[]): number[] {
    return candles.map(c => c.volume);
}
