-- 전략 마켓플레이스 테이블
-- Phase D: Strategy Marketplace

-- 1. 공개 전략 테이블
CREATE TABLE IF NOT EXISTS public.public_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[],  -- ['scalping', 'trend-following', etc.]
    published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    downloads INTEGER DEFAULT 0,
    avg_rating NUMERIC DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,  -- 검증된 전략
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 전략 평점 테이블
CREATE TABLE IF NOT EXISTS public.strategy_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_strategy_id UUID REFERENCES public.public_strategies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(public_strategy_id, user_id)  -- 사용자당 1개 평점만
);

-- 3. 전략 댓글 테이블
CREATE TABLE IF NOT EXISTS public.strategy_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_strategy_id UUID REFERENCES public.public_strategies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_public_strategies_avg_rating 
    ON public.public_strategies(avg_rating DESC);

CREATE INDEX IF NOT EXISTS idx_public_strategies_downloads 
    ON public.public_strategies(downloads DESC);

CREATE INDEX IF NOT EXISTS idx_public_strategies_published_at 
    ON public.public_strategies(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_strategies_tags 
    ON public.public_strategies USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_strategy_comments_public_strategy_id 
    ON public.strategy_comments(public_strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategy_ratings_public_strategy_id 
    ON public.strategy_ratings(public_strategy_id);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.public_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: public_strategies
CREATE POLICY "Anyone can view public strategies" 
    ON public.public_strategies FOR SELECT 
    USING (true);

CREATE POLICY "Users can publish their own strategies" 
    ON public.public_strategies FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public strategies" 
    ON public.public_strategies FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own public strategies" 
    ON public.public_strategies FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS 정책: strategy_ratings
CREATE POLICY "Anyone can view ratings" 
    ON public.strategy_ratings FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can rate" 
    ON public.strategy_ratings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" 
    ON public.strategy_ratings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" 
    ON public.strategy_ratings FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS 정책: strategy_comments
CREATE POLICY "Anyone can view comments" 
    ON public.strategy_comments FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can create comments" 
    ON public.strategy_comments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
    ON public.strategy_comments FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
    ON public.strategy_comments FOR DELETE 
    USING (auth.uid() = user_id);

-- 트리거: 평점 평균 자동 업데이트
CREATE OR REPLACE FUNCTION update_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.public_strategies
    SET 
        avg_rating = (
            SELECT COALESCE(AVG(rating), 0) 
            FROM public.strategy_ratings 
            WHERE public_strategy_id = COALESCE(NEW.public_strategy_id, OLD.public_strategy_id)
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM public.strategy_ratings 
            WHERE public_strategy_id = COALESCE(NEW.public_strategy_id, OLD.public_strategy_id)
        )
    WHERE id = COALESCE(NEW.public_strategy_id, OLD.public_strategy_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.strategy_ratings
FOR EACH ROW EXECUTE FUNCTION update_avg_rating();

-- 트리거: updated_at 자동 업데이트
CREATE TRIGGER update_public_strategies_updated_at
    BEFORE UPDATE ON public.public_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_ratings_updated_at
    BEFORE UPDATE ON public.strategy_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_comments_updated_at
    BEFORE UPDATE ON public.strategy_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 코멘트
COMMENT ON TABLE public.public_strategies IS '공개된 전략 마켓플레이스';
COMMENT ON TABLE public.strategy_ratings IS '전략 평점 시스템';
COMMENT ON TABLE public.strategy_comments IS '전략 댓글 시스템';
