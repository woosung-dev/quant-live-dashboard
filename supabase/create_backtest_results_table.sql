-- Backtest Results Table
-- Stores user backtest history for analysis and comparison

CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_name TEXT NOT NULL,
  strategy_code TEXT,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  initial_capital DECIMAL(20, 2) NOT NULL DEFAULT 100000,
  metrics JSONB NOT NULL DEFAULT '{}',
  trades JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_backtest_results_user_id ON backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_symbol ON backtest_results(symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_results_strategy ON backtest_results(strategy_name);
CREATE INDEX IF NOT EXISTS idx_backtest_results_created ON backtest_results(created_at DESC);

-- RLS Policies
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;

-- Users can only see their own results
CREATE POLICY "Users can view own backtest results"
  ON backtest_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own backtest results"
  ON backtest_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own results
CREATE POLICY "Users can delete own backtest results"
  ON backtest_results FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_backtest_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER backtest_results_updated_at
  BEFORE UPDATE ON backtest_results
  FOR EACH ROW
  EXECUTE FUNCTION update_backtest_results_updated_at();
