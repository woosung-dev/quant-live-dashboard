import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for Pro plan

/**
 * Cron API: 캔들 데이터 일일 업데이트
 * Vercel Cron에서 매일 09:00 UTC에 호출됨
 */

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT'];
const TIMEFRAMES = ['15m', '1h', '4h', '12h', '1d'];
const BATCH_SIZE = 1000;

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

type BinanceKline = [
    number, string, string, string, string, string,
    number, string, number, string, string, string
];

async function fetchCandlesFromBinance(
    symbol: string,
    interval: string,
    startTime: number
): Promise<Candle[]> {
    const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval,
        limit: BATCH_SIZE.toString(),
        startTime: startTime.toString(),
    });

    const response = await fetch(`${BINANCE_API_BASE}/klines?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
    }

    const data: BinanceKline[] = await response.json();

    return data.map((kline) => ({
        time: Math.floor(kline[0] / 1000),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
    }));
}

export async function GET(req: NextRequest) {
    // Optional: Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('[Cron] Candle update started');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: { symbol: string; timeframe: string; count: number }[] = [];

    try {
        for (const symbol of SYMBOLS) {
            for (const timeframe of TIMEFRAMES) {
                // 마지막 캔들 시간 조회
                const { data: lastCandle } = await supabase
                    .from('candle_cache')
                    .select('time')
                    .eq('symbol', symbol)
                    .eq('timeframe', timeframe)
                    .order('time', { ascending: false })
                    .limit(1);

                const lastTime = lastCandle?.[0]?.time
                    ? (lastCandle[0].time * 1000) + 1
                    : Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago if no data

                // 새 캔들 가져오기
                const candles = await fetchCandlesFromBinance(symbol, timeframe, lastTime);

                if (candles.length > 0) {
                    const rows = candles.map(c => ({
                        symbol,
                        timeframe,
                        time: c.time,
                        open: c.open,
                        high: c.high,
                        low: c.low,
                        close: c.close,
                        volume: c.volume,
                    }));

                    const { error } = await supabase
                        .from('candle_cache')
                        .upsert(rows, {
                            onConflict: 'symbol,timeframe,time',
                            ignoreDuplicates: true
                        });

                    if (error) {
                        console.error(`[Cron] Insert error for ${symbol}/${timeframe}:`, error);
                    }

                    results.push({ symbol, timeframe, count: candles.length });
                    console.log(`[Cron] ${symbol}/${timeframe}: +${candles.length} candles`);
                }

                // Rate limit delay
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        const totalCount = results.reduce((sum, r) => sum + r.count, 0);
        console.log(`[Cron] Complete: ${totalCount} total candles`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results,
            totalCount,
        });

    } catch (error: any) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
