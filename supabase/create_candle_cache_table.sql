-- 캔들 캐시 테이블
-- 히스토리컬 캔들 데이터를 저장하여 백테스팅 성능 향상

CREATE TABLE IF NOT EXISTS public.candle_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    time BIGINT NOT NULL,  -- Unix timestamp (seconds)
    open NUMERIC NOT NULL,
    high NUMERIC NOT NULL,
    low NUMERIC NOT NULL,
    close NUMERIC NOT NULL,
    volume NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for upsert
    UNIQUE(symbol, timeframe, time)
);

-- 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_candle_cache_symbol_timeframe 
    ON public.candle_cache (symbol, timeframe);

CREATE INDEX IF NOT EXISTS idx_candle_cache_time 
    ON public.candle_cache (time DESC);

CREATE INDEX IF NOT EXISTS idx_candle_cache_lookup 
    ON public.candle_cache (symbol, timeframe, time);

-- Enable RLS (Row Level Security)
ALTER TABLE public.candle_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (캔들 데이터는 공개 데이터)
CREATE POLICY "Allow public read access on candle_cache" 
    ON public.candle_cache 
    FOR SELECT 
    USING (true);

-- 서비스 역할만 쓰기 가능 (스크립트/cron에서만 데이터 삽입)
CREATE POLICY "Allow service role insert on candle_cache" 
    ON public.candle_cache 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow service role update on candle_cache" 
    ON public.candle_cache 
    FOR UPDATE 
    USING (true);

-- 테이블 코멘트
COMMENT ON TABLE public.candle_cache IS '히스토리컬 캔들 데이터 캐시 (Binance API 데이터)';
COMMENT ON COLUMN public.candle_cache.symbol IS '거래쌍 (예: BTCUSDT)';
COMMENT ON COLUMN public.candle_cache.timeframe IS '타임프레임 (예: 1h, 4h, 1d)';
COMMENT ON COLUMN public.candle_cache.time IS 'Unix timestamp (seconds)';
