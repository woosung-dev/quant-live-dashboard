/**
 * 지표 시스템 타입 정의
 * @description TradingView 스타일 지표 시스템을 위한 타입
 */

import type { Candle } from "../../types";

/** 지표 카테고리 */
export type IndicatorCategory =
  | "Trend"
  | "Oscillators"
  | "Volatility"
  | "Volume"
  | "Momentum"
  | "Other";

/** 지표 입력 파라미터 타입 */
export type InputType = "number" | "source" | "select" | "boolean";

/** 지표 입력 파라미터 정의 */
export interface IndicatorInputDef {
  name: string;
  label: string;
  type: InputType;
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
  description?: string;
}

/** 지표 메타데이터 */
export interface IndicatorMeta {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  overlay: boolean; // true = 메인 차트 오버레이, false = 별도 패널
  inputs: IndicatorInputDef[];
  description: string;
  plots: PlotConfig[];
}

/** 플롯(라인) 설정 */
export interface PlotConfig {
  id: string;
  name: string;
  type: "line" | "histogram" | "area" | "circles";
  color: string;
  lineWidth?: number;
}

/** 플롯 데이터 포인트 */
export interface PlotPoint {
  time: number;
  value: number;
}

/** 지표 계산 결과 */
export interface IndicatorResult {
  indicatorId: string;
  indicatorMeta: IndicatorMeta;
  inputs: Record<string, unknown>;
  plots: Record<string, PlotPoint[]>;
}

/** 활성 지표 (차트에 표시 중인 지표) */
export interface ActiveIndicator {
  instanceId: string; // 고유 인스턴스 ID
  indicatorId: string;
  indicatorMeta: IndicatorMeta;
  inputs: Record<string, unknown>;
  colors: Record<string, string>; // 플롯별 색상
  visible: boolean;
  result?: IndicatorResult; // 계산 결과
}

/** 조건 연산자 */
export type ConditionOperator =
  | "crosses_above" // 상향 돌파
  | "crosses_below" // 하향 돌파
  | "greater_than" // 초과
  | "less_than" // 미만
  | "greater_equal" // 이상
  | "less_equal" // 이하
  | "equals" // 동일
  | "enters_zone" // 영역 진입 (예: RSI > 70)
  | "exits_zone"; // 영역 이탈 (예: RSI <= 70)

/** 지표 조건 */
export interface IndicatorCondition {
  id: string;
  // 왼쪽 피연산자
  leftType: "indicator" | "price";
  leftIndicatorInstanceId?: string;
  leftPlotId?: string; // 예: 'plot0', 'k', 'd' 등
  leftPriceType?: "close" | "open" | "high" | "low";
  // 연산자
  operator: ConditionOperator;
  // 오른쪽 피연산자
  rightType: "indicator" | "price" | "value";
  rightIndicatorInstanceId?: string;
  rightPlotId?: string;
  rightPriceType?: "close" | "open" | "high" | "low";
  rightValue?: number;
  // 영역 조건용
  zoneValue?: number; // 예: 70 (과매수), 30 (과매도)
}

/** 조건 그룹 */
export interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: IndicatorCondition[];
}

/** 전략 조건 설정 */
export interface StrategyConditions {
  entry: {
    long: ConditionGroup[];
    short: ConditionGroup[];
  };
  exit: {
    long: ConditionGroup[];
    short: ConditionGroup[];
  };
}

/** 조건 기반 전략 */
export interface ConditionBasedStrategy {
  id: string;
  name: string;
  type: "CONDITION_BASED";
  indicators: ActiveIndicator[];
  conditions: StrategyConditions;
  riskManagement?: {
    stopLossPercent?: number;
    takeProfitPercent?: number;
    trailingStop?: boolean;
  };
}
