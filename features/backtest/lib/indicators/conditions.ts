/**
 * 조건 평가기
 * @description 지표 기반 조건을 평가하여 시그널 생성
 */

import type { Candle
 } from '../../types';
import type { 
  IndicatorCondition, 
  ConditionGroup, 
  StrategyConditions, 
  IndicatorResult,
  ConditionOperator,
  PlotPoint,
} from './types';
import type { Signal } from '../../types';

/**
 * 특정 시간에서의 값 조회
 */
function getValueAtTime(
  plots: Record<string, PlotPoint[]>,
  plotId: string,
  time: number
): number | undefined {
  const plot = plots[plotId];
  if (!plot) return undefined;
  const point = plot.find(p => p.time === time);
  return point?.value;
}

/**
 * 이전 시간에서의 값 조회
 */
function getPrevValueAtTime(
  plots: Record<string, PlotPoint[]>,
  plotId: string,
  time: number
): number | undefined {
  const plot = plots[plotId];
  if (!plot) return undefined;
  const index = plot.findIndex(p => p.time === time);
  if (index <= 0) return undefined;
  return plot[index - 1]?.value;
}

/**
 * 가격 값 조회
 */
function getPriceValue(
  candles: Candle[],
  time: number,
  priceType: 'close' | 'open' | 'high' | 'low'
): number | undefined {
  const candle = candles.find(c => c.time === time);
  if (!candle) return undefined;
  return candle[priceType];
}

/**
 * 이전 가격 값 조회
 */
function getPrevPriceValue(
  candles: Candle[],
  time: number,
  priceType: 'close' | 'open' | 'high' | 'low'
): number | undefined {
  const index = candles.findIndex(c => c.time === time);
  if (index <= 0) return undefined;
  return candles[index - 1]?.[priceType];
}

/**
 * 조건 연산자 평가
 */
function evaluateOperator(
  operator: ConditionOperator,
  currentLeft: number | undefined,
  currentRight: number | undefined,
  prevLeft?: number | undefined,
  prevRight?: number | undefined,
  zoneValue?: number
): boolean {
  if (currentLeft === undefined || currentRight === undefined) {
    return false;
  }

  switch (operator) {
    case 'greater_than':
      return currentLeft > currentRight;
    
    case 'less_than':
      return currentLeft < currentRight;
    
    case 'greater_equal':
      return currentLeft >= currentRight;
    
    case 'less_equal':
      return currentLeft <= currentRight;
    
    case 'equals':
      return Math.abs(currentLeft - currentRight) < 0.0001;
    
    case 'crosses_above':
      // 이전에는 아래에 있었고 현재는 위에 있음
      if (prevLeft === undefined || prevRight === undefined) return false;
      return prevLeft <= prevRight && currentLeft > currentRight;
    
    case 'crosses_below':
      // 이전에는 위에 있었고 현재는 아래에 있음
      if (prevLeft === undefined || prevRight === undefined) return false;
      return prevLeft >= prevRight && currentLeft < currentRight;
    
    case 'enters_zone':
      // 영역 진입 (예: RSI가 70 이상으로 진입)
      if (prevLeft === undefined || zoneValue === undefined) return false;
      return prevLeft < zoneValue && currentLeft >= zoneValue;
    
    case 'exits_zone':
      // 영역 이탈 (예: RSI가 70 이하로 이탈)
      if (prevLeft === undefined || zoneValue === undefined) return false;
      return prevLeft >= zoneValue && currentLeft < zoneValue;
    
    default:
      return false;
  }
}

/**
 * 단일 조건 평가
 */
function evaluateSingleCondition(
  condition: IndicatorCondition,
  time: number,
  candles: Candle[],
  indicatorResults: Map<string, IndicatorResult>
): boolean {
  // 왼쪽 값 가져오기
  let currentLeft: number | undefined;
  let prevLeft: number | undefined;

  if (condition.leftType === 'indicator') {
    const result = indicatorResults.get(condition.leftIndicatorInstanceId || '');
    if (!result) return false;
    currentLeft = getValueAtTime(result.plots, condition.leftPlotId || 'plot0', time);
    prevLeft = getPrevValueAtTime(result.plots, condition.leftPlotId || 'plot0', time);
  } else if (condition.leftType === 'price') {
    currentLeft = getPriceValue(candles, time, condition.leftPriceType || 'close');
    prevLeft = getPrevPriceValue(candles, time, condition.leftPriceType || 'close');
  }

  // 오른쪽 값 가져오기
  let currentRight: number | undefined;
  let prevRight: number | undefined;

  if (condition.rightType === 'indicator') {
    const result = indicatorResults.get(condition.rightIndicatorInstanceId || '');
    if (!result) return false;
    currentRight = getValueAtTime(result.plots, condition.rightPlotId || 'plot0', time);
    prevRight = getPrevValueAtTime(result.plots, condition.rightPlotId || 'plot0', time);
  } else if (condition.rightType === 'price') {
    currentRight = getPriceValue(candles, time, condition.rightPriceType || 'close');
    prevRight = getPrevPriceValue(candles, time, condition.rightPriceType || 'close');
  } else if (condition.rightType === 'value') {
    currentRight = condition.rightValue;
    prevRight = condition.rightValue;
  }

  return evaluateOperator(
    condition.operator,
    currentLeft,
    currentRight,
    prevLeft,
    prevRight,
    condition.zoneValue
  );
}

/**
 * 조건 그룹 평가
 */
function evaluateConditionGroup(
  group: ConditionGroup,
  time: number,
  candles: Candle[],
  indicatorResults: Map<string, IndicatorResult>
): boolean {
  if (group.conditions.length === 0) {
    return false;
  }

  const results = group.conditions.map(condition =>
    evaluateSingleCondition(condition, time, candles, indicatorResults)
  );

  if (group.logic === 'AND') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

/**
 * 여러 조건 그룹 평가 (OR 조합)
 */
function evaluateConditionGroups(
  groups: ConditionGroup[],
  time: number,
  candles: Candle[],
  indicatorResults: Map<string, IndicatorResult>
): boolean {
  if (groups.length === 0) {
    return false;
  }

  return groups.some(group =>
    evaluateConditionGroup(group, time, candles, indicatorResults)
  );
}

/**
 * 전략 조건을 평가하여 시그널 생성
 */
export function evaluateConditions(
  conditions: StrategyConditions,
  candles: Candle[],
  indicatorResults: IndicatorResult[]
): Signal[] {
  const signals: Signal[] = [];
  
  // instanceId -> IndicatorResult 매핑
  const indicatorMap = new Map<string, IndicatorResult>();
  indicatorResults.forEach(result => {
    indicatorMap.set(result.indicatorId, result);
  });

  // 현재 포지션 추적
  let inLongPosition = false;
  let inShortPosition = false;

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const time = candle.time;

    // 롱 진입 조건 체크
    if (!inLongPosition && !inShortPosition) {
      const longEntry = evaluateConditionGroups(
        conditions.entry.long,
        time,
        candles,
        indicatorMap
      );
      
      if (longEntry) {
        signals.push({
          time,
          type: 'buy',
          price: candle.close,
          reason: 'Long entry condition met',
        });
        inLongPosition = true;
      }
    }

    // 숏 진입 조건 체크
    if (!inLongPosition && !inShortPosition) {
      const shortEntry = evaluateConditionGroups(
        conditions.entry.short,
        time,
        candles,
        indicatorMap
      );
      
      if (shortEntry) {
        signals.push({
          time,
          type: 'sell',
          price: candle.close,
          reason: 'Short entry condition met',
        });
        inShortPosition = true;
      }
    }

    // 롱 청산 조건 체크
    if (inLongPosition) {
      const longExit = evaluateConditionGroups(
        conditions.exit.long,
        time,
        candles,
        indicatorMap
      );
      
      if (longExit) {
        signals.push({
          time,
          type: 'sell',
          price: candle.close,
          reason: 'Long exit condition met',
        });
        inLongPosition = false;
      }
    }

    // 숏 청산 조건 체크
    if (inShortPosition) {
      const shortExit = evaluateConditionGroups(
        conditions.exit.short,
        time,
        candles,
        indicatorMap
      );
      
      if (shortExit) {
        signals.push({
          time,
          type: 'buy',
          price: candle.close,
          reason: 'Short exit condition met',
        });
        inShortPosition = false;
      }
    }
  }

  return signals;
}

/**
 * 조건 연산자 라벨
 */
export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  'crosses_above': '상향 돌파 (↗)',
  'crosses_below': '하향 돌파 (↘)',
  'greater_than': '초과 (>)',
  'less_than': '미만 (<)',
  'greater_equal': '이상 (≥)',
  'less_equal': '이하 (≤)',
  'equals': '동일 (=)',
  'enters_zone': '영역 진입',
  'exits_zone': '영역 이탈',
};

/**
 * RSI 과매수/과매도 조건 프리셋
 */
export function createRSIOverboughtCondition(
  indicatorInstanceId: string,
  threshold: number = 70
): IndicatorCondition {
  return {
    id: `rsi_overbought_${Date.now()}`,
    leftType: 'indicator',
    leftIndicatorInstanceId: indicatorInstanceId,
    leftPlotId: 'plot0',
    operator: 'exits_zone',
    rightType: 'value',
    rightValue: threshold,
    zoneValue: threshold,
  };
}

export function createRSIOversoldCondition(
  indicatorInstanceId: string,
  threshold: number = 30
): IndicatorCondition {
  return {
    id: `rsi_oversold_${Date.now()}`,
    leftType: 'indicator',
    leftIndicatorInstanceId: indicatorInstanceId,
    leftPlotId: 'plot0',
    operator: 'exits_zone',
    rightType: 'value',
    rightValue: threshold,
    zoneValue: threshold,
  };
}

/**
 * 이동평균 크로스오버 조건 프리셋
 */
export function createMACrossoverCondition(
  fastIndicatorInstanceId: string,
  slowIndicatorInstanceId: string,
  type: 'golden' | 'death'
): IndicatorCondition {
  return {
    id: `ma_crossover_${type}_${Date.now()}`,
    leftType: 'indicator',
    leftIndicatorInstanceId: fastIndicatorInstanceId,
    leftPlotId: 'plot0',
    operator: type === 'golden' ? 'crosses_above' : 'crosses_below',
    rightType: 'indicator',
    rightIndicatorInstanceId: slowIndicatorInstanceId,
    rightPlotId: 'plot0',
  };
}
