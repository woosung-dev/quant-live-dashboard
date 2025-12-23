#!/usr/bin/env npx tsx
/**
 * 히스토리컬 캔들 데이터 수집 스크립트
 * @description Binance API에서 과거 캔들 데이터를 수집하여 Supabase에 저장
 * 
 * 사용법:
 *   npx tsx scripts/collect-historical-data.ts
 *   npx tsx scripts/collect-historical-data.ts --symbol BTCUSDT --timeframe 1h
 *   npx tsx scripts/collect-historical-data.ts --all
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 설정
// ============================================

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const BATCH_SIZE = 1000; // Binance API 최대 limit
const RATE_LIMIT_DELAY = 200; // ms between requests (to avoid rate limiting)

// 수집할 심볼 목록
const SYMBOLS = ['BTCUSDT', 'ETHUSDT'];

// 수집할 타임프레임 목록
const TIMEFRAMES = ['15m', '1h', '4h', '12h', '1d'];

// 시작 날짜 (Binance BTC/USDT 상장일: 2017-08-17)
const START_DATE = new Date('2017-08-17T00:00:00Z');

// ============================================
// 환경 변수 로드
// ============================================

function loadEnv(filePath: string): Record<string, string> {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const env: Record<string, string> = {};
        content.split('\n').forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) return;
            const key = trimmed.slice(0, eqIndex).trim();
            let val = trimmed.slice(eqIndex + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            env[key] = val;
        });
        return env;
    } catch {
        return {};
    }
}

// .env.local 로드
const envPath = path.resolve(process.cwd(), '.env.local');
const env = loadEnv(envPath);
Object.assign(process.env, env);

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL and Key must be defined in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// 타입 정의
// ============================================

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

// ============================================
// 유틸리티 함수
// ============================================

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function log(msg: string, color: string = RESET) {
    console.log(`${color}${msg}${RESET}`);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toISOString().slice(0, 10);
}

// ============================================
// Binance API 함수
// ============================================

async function fetchCandlesFromBinance(
    symbol: string,
    interval: string,
    startTime: number,
    endTime?: number
): Promise<Candle[]> {
    const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval,
        limit: BATCH_SIZE.toString(),
        startTime: startTime.toString(),
    });

    if (endTime) {
        params.append('endTime', endTime.toString());
    }

    const url = `${BINANCE_API_BASE}/klines?${params.toString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: BinanceKline[] = await response.json();

        return data.map((kline) => ({
            time: Math.floor(kline[0] / 1000), // ms -> seconds
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
        }));
    } catch (error) {
        log(`  ⚠️ API Error: ${error}`, YELLOW);
        return [];
    }
}

// ============================================
// Supabase 함수
// ============================================

async function getLastCandleTime(
    symbol: string,
    timeframe: string
): Promise<number | null> {
    const { data, error } = await supabase
        .from('candle_cache')
        .select('time')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('time', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        return null;
    }

    return data[0].time * 1000; // seconds -> ms
}

async function insertCandles(
    symbol: string,
    timeframe: string,
    candles: Candle[]
): Promise<number> {
    if (candles.length === 0) return 0;

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

    // Batch insert in chunks of 500 to avoid payload limits
    const CHUNK_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
            .from('candle_cache')
            .upsert(chunk, {
                onConflict: 'symbol,timeframe,time',
                ignoreDuplicates: true
            });

        if (error) {
            log(`  ⚠️ Insert Error: ${error.message}`, YELLOW);
        } else {
            insertedCount += chunk.length;
        }
    }

    return insertedCount;
}

// ============================================
// 메인 수집 함수
// ============================================

async function collectHistoricalData(
    symbol: string,
    timeframe: string
): Promise<number> {
    log(`\n📊 Collecting ${symbol} / ${timeframe}...`, CYAN);

    const endTime = Date.now();
    let startTime = START_DATE.getTime();

    // 이미 수집된 데이터가 있는지 확인
    const lastTime = await getLastCandleTime(symbol, timeframe);
    if (lastTime) {
        startTime = lastTime + 1; // 다음 캔들부터 수집
        log(`  📌 Resuming from ${formatDate(startTime)}`, YELLOW);
    } else {
        log(`  📌 Starting from ${formatDate(startTime)}`, YELLOW);
    }

    let totalCandles = 0;
    let currentStart = startTime;
    let iteration = 0;

    while (currentStart < endTime) {
        iteration++;
        const candles = await fetchCandlesFromBinance(symbol, timeframe, currentStart, endTime);

        if (candles.length === 0) {
            break;
        }

        const insertedCount = await insertCandles(symbol, timeframe, candles);
        totalCandles += insertedCount;

        const latestTime = candles[candles.length - 1].time * 1000;

        // 진행 상황 출력 (10 iterations마다)
        if (iteration % 10 === 0) {
            log(`  ⏳ ${formatDate(currentStart)} → ${formatDate(latestTime)} (${formatNumber(totalCandles)} candles)`, RESET);
        }

        // 다음 시작 시간 계산
        currentStart = latestTime + 1;

        // Rate limit 방지
        await sleep(RATE_LIMIT_DELAY);

        // 더 이상 수집할 데이터가 없으면 종료
        if (candles.length < BATCH_SIZE) {
            break;
        }
    }

    log(`  ✅ Collected ${formatNumber(totalCandles)} candles`, GREEN);
    return totalCandles;
}

// ============================================
// CLI 파싱
// ============================================

function parseArgs(): {
    symbols: string[];
    timeframes: string[];
} {
    const args = process.argv.slice(2);

    let symbols = SYMBOLS;
    let timeframes = TIMEFRAMES;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--symbol' && args[i + 1]) {
            symbols = [args[i + 1].toUpperCase()];
            i++;
        } else if (args[i] === '--timeframe' && args[i + 1]) {
            timeframes = [args[i + 1].toLowerCase()];
            i++;
        } else if (args[i] === '--all') {
            // 기본값 사용
        }
    }

    return { symbols, timeframes };
}

// ============================================
// 메인 실행
// ============================================

async function main() {
    console.log('\n' + '='.repeat(60));
    log('🚀 Historical Candle Data Collector', CYAN);
    console.log('='.repeat(60));

    const { symbols, timeframes } = parseArgs();

    log(`\n📌 Symbols: ${symbols.join(', ')}`, RESET);
    log(`📌 Timeframes: ${timeframes.join(', ')}`, RESET);
    log(`📌 Start Date: ${formatDate(START_DATE.getTime())}`, RESET);
    log(`📌 Supabase: ${supabaseUrl.slice(0, 30)}...`, RESET);

    const startAll = Date.now();
    let grandTotal = 0;

    for (const symbol of symbols) {
        for (const timeframe of timeframes) {
            const count = await collectHistoricalData(symbol, timeframe);
            grandTotal += count;
        }
    }

    const elapsed = ((Date.now() - startAll) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    log(`✅ COMPLETE: ${formatNumber(grandTotal)} total candles in ${elapsed}s`, GREEN);
    console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
    log(`\n❌ Fatal Error: ${error}`, RED);
    process.exit(1);
});
