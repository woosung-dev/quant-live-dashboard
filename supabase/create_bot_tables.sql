-- 봇 모니터링 시스템 테이블
-- Phase C: Bot Monitoring Dashboard

-- 1. 봇 인스턴스 테이블
CREATE TABLE IF NOT EXISTS public.bot_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PAUSED',  -- ACTIVE, PAUSED, ERROR
    config JSONB NOT NULL,  -- {symbol, timeframe, params}
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 봇 상태 테이블 (실시간 상태)
CREATE TABLE IF NOT EXISTS public.bot_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.bot_instances(id) ON DELETE CASCADE UNIQUE NOT NULL,
    position TEXT DEFAULT 'NONE',  -- NONE, LONG, SHORT
    entry_price NUMERIC,
    current_price NUMERIC,
    pnl NUMERIC DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    last_check_at TIMESTAMPTZ,
    last_signal_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. 봇 로그 테이블 (거래 이력, 이벤트)
CREATE TABLE IF NOT EXISTS public.bot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.bot_instances(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    level TEXT NOT NULL,  -- INFO, WARNING, ERROR, TRADE
    action TEXT NOT NULL,  -- SIGNAL_BUY, SIGNAL_SELL, TRADE_OPEN, TRADE_CLOSE, ERROR
    details JSONB,  -- {price, quantity, reason, pnl, etc.}
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_bot_instances_user_id 
    ON public.bot_instances(user_id);

CREATE INDEX IF NOT EXISTS idx_bot_instances_status 
    ON public.bot_instances(status);

CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_id 
    ON public.bot_logs(bot_id);

CREATE INDEX IF NOT EXISTS idx_bot_logs_timestamp 
    ON public.bot_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_bot_logs_level 
    ON public.bot_logs(level);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.bot_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: bot_instances
CREATE POLICY "Users can manage their own bots"
    ON public.bot_instances FOR ALL
    USING (auth.uid() = user_id);

-- RLS 정책: bot_state
CREATE POLICY "Users can view their own bot state"
    ON public.bot_state FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.bot_instances
        WHERE bot_instances.id = bot_state.bot_id
        AND bot_instances.user_id = auth.uid()
    ));

CREATE POLICY "Service can update bot state"
    ON public.bot_state FOR ALL
    USING (true)
    WITH CHECK (true);

-- RLS 정책: bot_logs
CREATE POLICY "Users can view their own bot logs"
    ON public.bot_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.bot_instances
        WHERE bot_instances.id = bot_logs.bot_id
        AND bot_instances.user_id = auth.uid()
    ));

CREATE POLICY "Service can insert bot logs"
    ON public.bot_logs FOR INSERT
    WITH CHECK (true);

-- 테이블 코멘트
COMMENT ON TABLE public.bot_instances IS '24/7 클라우드 봇 인스턴스';
COMMENT ON TABLE public.bot_state IS '봇 실시간 상태 및 성과';
COMMENT ON TABLE public.bot_logs IS '봇 거래 및 이벤트 로그';

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_instances_updated_at
    BEFORE UPDATE ON public.bot_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_state_updated_at
    BEFORE UPDATE ON public.bot_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
