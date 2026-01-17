/**
 * 지표 계산기
 * @description lightweight-charts-indicators를 사용하여 지표 값 계산
 */

import type { Candle } from '../../types';
import type { IndicatorResult, IndicatorMeta, PlotPoint, ActiveIndicator } from './types';
import { getIndicatorById } from './registry';

// LCI에서 동적 import
let lciIndicators: Record<string, {
  calculate: (bars: Bar[], inputs: Record<string, unknown>) => {
    plots: Record<string, Array<{ time: number; value: number }>>;
  };
}> | null = null;

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * LCI 지표 모듈 동적 로드
 */
async function loadLciIndicators() {
  if (lciIndicators) return lciIndicators;
  
  try {
    const lci = await import('lightweight-charts-indicators');
    lciIndicators = lci as unknown as typeof lciIndicators;
    return lciIndicators;
  } catch (error) {
    console.error('Failed to load lightweight-charts-indicators:', error);
    return null;
  }
}

/**
 * Candle 배열을 Bar 형식으로 변환
 */
function candlesToBars(candles: Candle[]): Bar[] {
  return candles.map(c => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

/**
 * 지표 계산
 * @param indicatorId 지표 ID
 * @param candles 캔들 데이터
 * @param inputs 입력 파라미터
 */
export async function calculateIndicator(
  indicatorId: string,
  candles: Candle[],
  inputs: Record<string, unknown>
): Promise<IndicatorResult | null> {
  const indicatorMeta = getIndicatorById(indicatorId);
  if (!indicatorMeta) {
    console.error(`Indicator not found: ${indicatorId}`);
    return null;
  }

  const lci = await loadLciIndicators();
  if (!lci) {
    return null;
  }

  // 지표 ID를 PascalCase로 변환하여 LCI 모듈에서 찾기
  const pascalCaseId = indicatorId
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
  
  const indicatorModule = (lci as Record<string, unknown>)[pascalCaseId] || 
                          (lci as Record<string, unknown>)[indicatorId.toUpperCase()] ||
                          (lci as Record<string, unknown>)[indicatorId];

  if (!indicatorModule || typeof (indicatorModule as { calculate?: unknown }).calculate !== 'function') {
    console.warn(`Indicator module not found for: ${indicatorId}, trying fallback calculation`);
    return calculateFallback(indicatorMeta, candles, inputs);
  }

  try {
    const bars = candlesToBars(candles);
    const result = (indicatorModule as { calculate: (bars: Bar[], inputs: Record<string, unknown>) => { plots: Record<string, Array<{ time: number; value: number }>> } }).calculate(bars, inputs);
    
    // 결과를 우리 형식으로 변환
    const plots: Record<string, PlotPoint[]> = {};
    
    if (result.plots) {
      for (const [plotId, plotData] of Object.entries(result.plots)) {
        if (Array.isArray(plotData)) {
          plots[plotId] = plotData
            .filter((p): p is { time: number; value: number } => 
              p && typeof p.time === 'number' && typeof p.value === 'number' && !isNaN(p.value)
            )
            .map(p => ({ time: p.time, value: p.value }));
        }
      }
    }

    return {
      indicatorId,
      indicatorMeta,
      inputs,
      plots,
    };
  } catch (error) {
    console.error(`Error calculating ${indicatorId}:`, error);
    return calculateFallback(indicatorMeta, candles, inputs);
  }
}

/**
 * 기본 지표 계산 (LCI 모듈을 찾지 못한 경우)
 */
async function calculateFallback(
  indicatorMeta: IndicatorMeta,
  candles: Candle[],
  inputs: Record<string, unknown>
): Promise<IndicatorResult | null> {
  // 기존 technicalindicators 라이브러리로 폴백
  const indicators = await import('../indicators');
  const { 
    calculateRSI, 
    calculateEMA, 
    calculateSMA, 
    calculateMACD, 
    calculateBollingerBands,
    calculateStochastic 
  } = indicators;

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const times = candles.map(c => c.time);

  const plots: Record<string, PlotPoint[]> = {};

  try {
    switch (indicatorMeta.id) {
      case 'rsi': {
        const period = (inputs.length as number) || (inputs.period as number) || 14;
        const values = calculateRSI(closes, period);
        plots['plot0'] = values
          .map((v, i) => ({ time: times[i], value: v }))
          .filter(p => !isNaN(p.value) && p.value !== undefined);
        break;
      }
      case 'ema': {
        const period = (inputs.len as number) || (inputs.period as number) || 20;
        const values = calculateEMA(closes, period);
        plots['plot0'] = values
          .map((v, i) => ({ time: times[i], value: v }))
          .filter(p => !isNaN(p.value) && p.value !== undefined);
        break;
      }
      case 'sma': {
        const period = (inputs.len as number) || (inputs.period as number) || 20;
        const values = calculateSMA(closes, period);
        plots['plot0'] = values
          .map((v, i) => ({ time: times[i], value: v }))
          .filter(p => !isNaN(p.value) && p.value !== undefined);
        break;
      }
      case 'macd': {
        const fast = (inputs.fastLength as number) || 12;
        const slow = (inputs.slowLength as number) || 26;
        const signal = (inputs.signalLength as number) || 9;
        const values = calculateMACD(closes, fast, slow, signal);
        
        plots['histogram'] = values
          .map((v, i) => ({ time: times[i], value: v.histogram ?? 0 }))
          .filter(p => !isNaN(p.value));
        plots['macd'] = values
          .map((v, i) => ({ time: times[i], value: v.MACD ?? 0 }))
          .filter(p => !isNaN(p.value));
        plots['signal'] = values
          .map((v, i) => ({ time: times[i], value: v.signal ?? 0 }))
          .filter(p => !isNaN(p.value));
        break;
      }
      case 'bollingerbands':
      case 'bb': {
        const period = (inputs.length as number) || 20;
        const mult = (inputs.mult as number) || 2;
        const values = calculateBollingerBands(closes, period, mult);
        
        plots['upper'] = values
          .map((v, i) => ({ time: times[i], value: v.upper }))
          .filter(p => !isNaN(p.value) && p.value !== 0);
        plots['middle'] = values
          .map((v, i) => ({ time: times[i], value: v.middle }))
          .filter(p => !isNaN(p.value) && p.value !== 0);
        plots['lower'] = values
          .map((v, i) => ({ time: times[i], value: v.lower }))
          .filter(p => !isNaN(p.value) && p.value !== 0);
        break;
      }
      case 'stoch': {
        const period = (inputs.length as number) || 14;
        const signalPeriod = (inputs.smoothK as number) || 3;
        const values = calculateStochastic(highs, lows, closes, period, signalPeriod);
        
        plots['k'] = values
          .map((v, i) => ({ time: times[i], value: v.k ?? 0 }))
          .filter(p => !isNaN(p.value));
        plots['d'] = values
          .map((v, i) => ({ time: times[i], value: v.d ?? 0 }))
          .filter(p => !isNaN(p.value));
        break;
      }
      default:
        console.warn(`No fallback available for: ${indicatorMeta.id}`);
        return null;
    }

    return {
      indicatorId: indicatorMeta.id,
      indicatorMeta,
      inputs,
      plots,
    };
  } catch (error) {
    console.error(`Fallback calculation failed for ${indicatorMeta.id}:`, error);
    return null;
  }
}

/**
 * 여러 지표 일괄 계산
 */
export async function calculateIndicators(
  activeIndicators: ActiveIndicator[],
  candles: Candle[]
): Promise<IndicatorResult[]> {
  const results: IndicatorResult[] = [];

  for (const active of activeIndicators) {
    const result = await calculateIndicator(
      active.indicatorId,
      candles,
      active.inputs
    );
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * 특정 시간에서의 지표 값 조회
 */
export function getIndicatorValueAtTime(
  result: IndicatorResult,
  plotId: string,
  time: number
): number | undefined {
  const plot = result.plots[plotId];
  if (!plot) return undefined;

  const point = plot.find(p => p.time === time);
  return point?.value;
}

/**
 * 가장 최근 지표 값 조회
 */
export function getLatestIndicatorValue(
  result: IndicatorResult,
  plotId: string
): number | undefined {
  const plot = result.plots[plotId];
  if (!plot || plot.length === 0) return undefined;

  return plot[plot.length - 1].value;
}
