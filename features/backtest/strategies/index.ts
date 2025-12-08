/**
 * 전략 레지스트리
 * @description 사용 가능한 모든 전략을 관리하고 제공
 */

import { Strategy } from '@/types';
import { rsiDivergenceStrategy } from './rsi-divergence';
import { emaCrossStrategy } from './ema-cross';
import { macdStrategy } from './macd';

/** 사용 가능한 모든 전략 목록 */
export const strategies: Strategy[] = [
    rsiDivergenceStrategy,
    emaCrossStrategy,
    macdStrategy,
];

/** 전략 ID로 전략 찾기 */
export function getStrategyById(id: string): Strategy | undefined {
    return strategies.find(s => s.id === id);
}

/** 전략 ID 목록 */
export function getStrategyIds(): string[] {
    return strategies.map(s => s.id);
}

/** 전략 선택 옵션 (드롭다운용) */
export function getStrategyOptions(): { value: string; label: string; description: string }[] {
    return strategies.map(s => ({
        value: s.id,
        label: s.name,
        description: s.description,
    }));
}

/** 기본 전략 */
export const defaultStrategy = rsiDivergenceStrategy;

/** 개별 전략 export */
export { rsiDivergenceStrategy } from './rsi-divergence';
export { emaCrossStrategy } from './ema-cross';
export { macdStrategy } from './macd';
