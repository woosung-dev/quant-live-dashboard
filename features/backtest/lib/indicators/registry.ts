/**
 * 지표 레지스트리
 * @description lightweight-charts-indicators 라이브러리를 래핑하여 지표 검색/조회 제공
 */

import { indicatorRegistry as lciRegistry } from 'lightweight-charts-indicators';
import type { IndicatorMeta, IndicatorCategory, IndicatorInputDef, PlotConfig } from './types';

// lightweight-charts-indicators에서 카테고리 매핑
const CATEGORY_MAP: Record<string, IndicatorCategory> = {
  'Trend': 'Trend',
  'Momentum': 'Momentum',
  'Oscillators': 'Oscillators',
  'Volatility': 'Volatility',
  'Volume': 'Volume',
  'Other': 'Other',
};

// 기본 색상 팔레트
const DEFAULT_COLORS = [
  '#2962FF', // 파랑
  '#FF6D00', // 주황
  '#00C853', // 초록
  '#D500F9', // 보라
  '#FFD600', // 노랑
  '#00BCD4', // 청록
];

/**
 * LCI 지표를 우리 형식으로 변환
 */
function transformIndicator(lciIndicator: typeof lciRegistry[number]): IndicatorMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indicator = lciIndicator as any;
  
  // 입력 파라미터 변환
  const inputs: IndicatorInputDef[] = [];
  const inputConfig = indicator.inputConfig || indicator.inputConfigs || indicator.defaultInputs;
  
  if (inputConfig && typeof inputConfig === 'object') {
    for (const [key, config] of Object.entries(inputConfig)) {
      const cfg = config as {
        name?: string;
        type?: string;
        defval?: unknown;
        minval?: number;
        maxval?: number;
        options?: string[];
      };
      
      // config가 primitive 값인 경우 (예: { len: 14 })
      if (typeof config === 'number' || typeof config === 'string' || typeof config === 'boolean') {
        inputs.push({
          name: key,
          label: key,
          type: typeof config === 'number' ? 'number' : typeof config === 'boolean' ? 'boolean' : 'source',
          defaultValue: config as number | string | boolean,
        });
      } else {
        inputs.push({
          name: key,
          label: cfg?.name || key,
          type: cfg?.type === 'integer' || cfg?.type === 'float' ? 'number' : 
                cfg?.type === 'bool' ? 'boolean' :
                cfg?.type === 'source' ? 'source' : 'number',
          defaultValue: cfg?.defval !== undefined ? cfg.defval as number | string | boolean : 14,
          min: cfg?.minval,
          max: cfg?.maxval,
          options: cfg?.options?.map((o: string) => ({ label: o, value: o })),
        });
      }
    }
  }

  // 플롯 설정 변환
  const plots: PlotConfig[] = [];
  const plotConfig = indicator.plots || indicator.plotConfig;
  
  if (plotConfig && typeof plotConfig === 'object') {
    let colorIndex = 0;
    for (const [plotId, plotCfg] of Object.entries(plotConfig)) {
      const pc = plotCfg as { title?: string; plottype?: string; color?: string };
      plots.push({
        id: plotId,
        name: pc?.title || plotId,
        type: pc?.plottype === 'histogram' ? 'histogram' : 
              pc?.plottype === 'area' ? 'area' : 
              pc?.plottype === 'circles' ? 'circles' : 'line',
        color: pc?.color || DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length],
        lineWidth: 2,
      });
      colorIndex++;
    }
  }

  // 플롯이 없으면 기본 플롯 추가
  if (plots.length === 0) {
    plots.push({
      id: 'plot0',
      name: indicator.shortName || indicator.name,
      type: 'line',
      color: DEFAULT_COLORS[0],
      lineWidth: 2,
    });
  }

  return {
    id: indicator.id,
    name: indicator.name,
    shortName: indicator.shortName || indicator.name,
    category: CATEGORY_MAP[indicator.category] || 'Other',
    overlay: indicator.overlay ?? false,
    inputs,
    description: indicator.description || '',
    plots,
  };
}

// 변환된 레지스트리 캐시
let indicatorRegistryCache: IndicatorMeta[] | null = null;

/**
 * 전체 지표 레지스트리 조회
 */
export function getIndicatorRegistry(): IndicatorMeta[] {
  if (indicatorRegistryCache) {
    return indicatorRegistryCache;
  }

  indicatorRegistryCache = lciRegistry.map(transformIndicator);
  return indicatorRegistryCache;
}

/**
 * 카테고리별 지표 그룹화
 */
export function getIndicatorsByCategory(): Record<IndicatorCategory, IndicatorMeta[]> {
  const registry = getIndicatorRegistry();
  const grouped: Record<IndicatorCategory, IndicatorMeta[]> = {
    'Trend': [],
    'Oscillators': [],
    'Volatility': [],
    'Volume': [],
    'Momentum': [],
    'Other': [],
  };

  for (const indicator of registry) {
    grouped[indicator.category].push(indicator);
  }

  return grouped;
}

/**
 * 지표 검색
 * @param query 검색어
 * @returns 매칭된 지표 목록
 */
export function searchIndicators(query: string): IndicatorMeta[] {
  const registry = getIndicatorRegistry();
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return registry;
  }

  return registry.filter(ind => 
    ind.name.toLowerCase().includes(lowerQuery) ||
    ind.shortName.toLowerCase().includes(lowerQuery) ||
    ind.id.toLowerCase().includes(lowerQuery) ||
    ind.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * ID로 지표 조회
 * @param id 지표 ID
 */
export function getIndicatorById(id: string): IndicatorMeta | undefined {
  const registry = getIndicatorRegistry();
  return registry.find(ind => ind.id === id);
}

/**
 * 카테고리별 필터링
 * @param category 카테고리
 */
export function getIndicatorsByCategory2(category: IndicatorCategory): IndicatorMeta[] {
  const registry = getIndicatorRegistry();
  return registry.filter(ind => ind.category === category);
}

/**
 * 오버레이 지표만 필터링 (메인 차트에 표시되는 지표)
 */
export function getOverlayIndicators(): IndicatorMeta[] {
  const registry = getIndicatorRegistry();
  return registry.filter(ind => ind.overlay);
}

/**
 * 패널 지표만 필터링 (별도 차트 패널에 표시되는 지표)
 */
export function getPanelIndicators(): IndicatorMeta[] {
  const registry = getIndicatorRegistry();
  return registry.filter(ind => !ind.overlay);
}

/** 인기 지표 목록 (빠른 접근용) */
export const POPULAR_INDICATORS = [
  'sma',
  'ema',
  'rsi',
  'macd',
  'bollingerbands',
  'stoch',
  'stochrsi',
  'atr',
  'adx',
  'cci',
  'williamsad',
  'obv',
  'vwap',
];

/**
 * 인기 지표 조회
 */
export function getPopularIndicators(): IndicatorMeta[] {
  const registry = getIndicatorRegistry();
  return POPULAR_INDICATORS
    .map(id => registry.find(ind => ind.id === id))
    .filter((ind): ind is IndicatorMeta => ind !== undefined);
}
