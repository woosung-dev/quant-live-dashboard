import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 백테스트 결과 저장 요청 타입
interface SaveBacktestRequest {
  strategyName: string;
  strategyCode?: string;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  metrics: Record<string, unknown>;
  trades: unknown[];
}

// GET: 사용자의 백테스트 결과 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const symbol = searchParams.get('symbol');
    const strategyName = searchParams.get('strategyName');

    // 쿼리 빌드
    let query = supabase
      .from('backtest_results')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    if (strategyName) {
      query = query.ilike('strategy_name', `%${strategyName}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching backtest results:', error);
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
    }

    return NextResponse.json({
      results: data,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Backtest results GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 새 백테스트 결과 저장
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SaveBacktestRequest = await request.json();

    // 필수 필드 검증
    if (!body.strategyName || !body.symbol || !body.timeframe) {
      return NextResponse.json(
        { error: 'Missing required fields: strategyName, symbol, timeframe' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('backtest_results')
      .insert({
        user_id: user.id,
        strategy_name: body.strategyName,
        strategy_code: body.strategyCode || null,
        symbol: body.symbol,
        timeframe: body.timeframe,
        start_date: body.startDate,
        end_date: body.endDate,
        initial_capital: body.initialCapital || 10000,
        metrics: body.metrics || {},
        trades: body.trades || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving backtest result:', error);
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
    }

    return NextResponse.json({ result: data }, { status: 201 });
  } catch (error) {
    console.error('Backtest results POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
