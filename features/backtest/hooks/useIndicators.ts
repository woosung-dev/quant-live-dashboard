"use client";

import { useState, useCallback, useMemo } from "react";
import type { ActiveIndicator, IndicatorMeta, IndicatorResult, PlotConfig } from "@/features/backtest/lib/indicators/types";
import { calculateIndicators } from "@/features/backtest/lib/indicators/calculator";
import type { Candle } from "@/features/backtest/types";

// 기본 색상 팔레트
const DEFAULT_COLORS = [
  '#2962FF', '#FF6D00', '#00C853', '#D500F9', '#FFD600', '#00BCD4',
  '#E91E63', '#9C27B0', '#3F51B5', '#009688', '#8BC34A', '#FF5722',
];

let colorIndex = 0;

function getNextColor(): string {
  const color = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];
  colorIndex++;
  return color;
}

interface UseIndicatorsOptions {
  candles: Candle[];
}

interface UseIndicatorsReturn {
  /** 활성 지표 목록 */
  activeIndicators: ActiveIndicator[];
  /** 지표 계산 결과 */
  indicatorResults: IndicatorResult[];
  /** 로딩 상태 */
  isCalculating: boolean;
  /** 에러 */
  error: string | null;
  /** 지표 추가 */
  addIndicator: (indicator: IndicatorMeta, inputs: Record<string, unknown>) => void;
  /** 지표 제거 */
  removeIndicator: (instanceId: string) => void;
  /** 표시 토글 */
  toggleVisibility: (instanceId: string) => void;
  /** 색상 업데이트 */
  updateColors: (instanceId: string, colors: Record<string, string>) => void;
  /** 입력값 업데이트 */
  updateInputs: (instanceId: string, inputs: Record<string, unknown>) => void;
  /** 모든 지표 초기화 */
  clearAllIndicators: () => void;
  /** 지표 재계산 */
  recalculateIndicators: () => Promise<void>;
}

export function useIndicators({ candles }: UseIndicatorsOptions): UseIndicatorsReturn {
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>([]);
  const [indicatorResults, setIndicatorResults] = useState<IndicatorResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 지표 추가
  const addIndicator = useCallback((indicator: IndicatorMeta, inputs: Record<string, unknown>) => {
    const instanceId = `${indicator.id}_${Date.now()}`;
    
    // 플롯별 기본 색상 할당
    const colors: Record<string, string> = {};
    indicator.plots.forEach((plot) => {
      colors[plot.id] = plot.color || getNextColor();
    });

    const newIndicator: ActiveIndicator = {
      instanceId,
      indicatorId: indicator.id,
      indicatorMeta: indicator,
      inputs,
      colors,
      visible: true,
    };

    setActiveIndicators(prev => [...prev, newIndicator]);
  }, []);

  // 지표 제거
  const removeIndicator = useCallback((instanceId: string) => {
    setActiveIndicators(prev => prev.filter(i => i.instanceId !== instanceId));
    setIndicatorResults(prev => prev.filter(r => r.indicatorId !== instanceId));
  }, []);

  // 표시 토글
  const toggleVisibility = useCallback((instanceId: string) => {
    setActiveIndicators(prev => 
      prev.map(i => 
        i.instanceId === instanceId 
          ? { ...i, visible: !i.visible }
          : i
      )
    );
  }, []);

  // 색상 업데이트
  const updateColors = useCallback((instanceId: string, colors: Record<string, string>) => {
    setActiveIndicators(prev =>
      prev.map(i =>
        i.instanceId === instanceId
          ? { ...i, colors }
          : i
      )
    );
  }, []);

  // 입력값 업데이트
  const updateInputs = useCallback((instanceId: string, inputs: Record<string, unknown>) => {
    setActiveIndicators(prev =>
      prev.map(i =>
        i.instanceId === instanceId
          ? { ...i, inputs }
          : i
      )
    );
  }, []);

  // 모든 지표 초기화
  const clearAllIndicators = useCallback(() => {
    setActiveIndicators([]);
    setIndicatorResults([]);
    colorIndex = 0;
  }, []);

  // 지표 재계산
  const recalculateIndicators = useCallback(async () => {
    if (candles.length === 0 || activeIndicators.length === 0) {
      setIndicatorResults([]);
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const results = await calculateIndicators(activeIndicators, candles);
      setIndicatorResults(results);
    } catch (err) {
      console.error('Failed to calculate indicators:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate indicators');
    } finally {
      setIsCalculating(false);
    }
  }, [candles, activeIndicators]);

  // 오버레이 지표 (메인 차트에 표시)
  const overlayIndicators = useMemo(() => 
    activeIndicators.filter(i => i.indicatorMeta.overlay && i.visible),
    [activeIndicators]
  );

  // 패널 지표 (별도 차트에 표시)
  const panelIndicators = useMemo(() =>
    activeIndicators.filter(i => !i.indicatorMeta.overlay && i.visible),
    [activeIndicators]
  );

  return {
    activeIndicators,
    indicatorResults,
    isCalculating,
    error,
    addIndicator,
    removeIndicator,
    toggleVisibility,
    updateColors,
    updateInputs,
    clearAllIndicators,
    recalculateIndicators,
  };
}

export default useIndicators;
