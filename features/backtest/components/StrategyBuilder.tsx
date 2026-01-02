"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight } from "lucide-react";

// 지원 지표
const INDICATORS = [
    { id: 'rsi', name: 'RSI', params: ['period'] },
    { id: 'ema', name: 'EMA', params: ['period'] },
    { id: 'sma', name: 'SMA', params: ['period'] },
    { id: 'macd', name: 'MACD', params: ['fast', 'slow', 'signal'] },
    { id: 'bollinger', name: 'Bollinger Bands', params: ['period', 'stdDev'] },
    { id: 'atr', name: 'ATR', params: ['period'] },
];

// 조건 연산자
const OPERATORS = [
    { id: 'gt', label: '> (greater than)' },
    { id: 'lt', label: '< (less than)' },
    { id: 'gte', label: '>= (greater or equal)' },
    { id: 'lte', label: '<= (less or equal)' },
    { id: 'cross_above', label: 'Cross Above' },
    { id: 'cross_below', label: 'Cross Below' },
];

// 비교 대상
const COMPARE_TARGETS = [
    { id: 'value', label: 'Fixed Value' },
    { id: 'price', label: 'Close Price' },
    { id: 'upper_band', label: 'Upper Band' },
    { id: 'lower_band', label: 'Lower Band' },
    { id: 'signal_line', label: 'Signal Line' },
];

export interface StrategyCondition {
    id: string;
    indicator: string;
    indicatorParams: Record<string, number>;
    operator: string;
    compareTarget: string;
    compareValue?: number;
    action: 'buy' | 'sell';
}

export interface StrategyBuilderConfig {
    name: string;
    conditions: StrategyCondition[];
}

interface StrategyBuilderProps {
    config: StrategyBuilderConfig;
    onChange: (config: StrategyBuilderConfig) => void;
}

export function StrategyBuilder({ config, onChange }: StrategyBuilderProps) {
    const addCondition = (action: 'buy' | 'sell') => {
        const newCondition: StrategyCondition = {
            id: `cond_${Date.now()}`,
            indicator: 'rsi',
            indicatorParams: { period: 14 },
            operator: 'lt',
            compareTarget: 'value',
            compareValue: 30,
            action
        };
        onChange({
            ...config,
            conditions: [...config.conditions, newCondition]
        });
    };

    const updateCondition = (id: string, updates: Partial<StrategyCondition>) => {
        onChange({
            ...config,
            conditions: config.conditions.map(c => 
                c.id === id ? { ...c, ...updates } : c
            )
        });
    };

    const removeCondition = (id: string) => {
        onChange({
            ...config,
            conditions: config.conditions.filter(c => c.id !== id)
        });
    };

    const buyConditions = config.conditions.filter(c => c.action === 'buy');
    const sellConditions = config.conditions.filter(c => c.action === 'sell');

    return (
        <div className="space-y-6">
            {/* Buy Conditions */}
            <Card className="border-green-500/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-green-500 flex items-center gap-2">
                            📈 매수 조건
                        </CardTitle>
                        <Button size="sm" variant="outline" onClick={() => addCondition('buy')}>
                            <Plus className="h-4 w-4 mr-1" /> 조건 추가
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {buyConditions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            매수 조건을 추가하세요
                        </p>
                    ) : (
                        buyConditions.map(cond => (
                            <ConditionRow
                                key={cond.id}
                                condition={cond}
                                onUpdate={(updates) => updateCondition(cond.id, updates)}
                                onRemove={() => removeCondition(cond.id)}
                            />
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Sell Conditions */}
            <Card className="border-red-500/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-red-500 flex items-center gap-2">
                            📉 매도 조건
                        </CardTitle>
                        <Button size="sm" variant="outline" onClick={() => addCondition('sell')}>
                            <Plus className="h-4 w-4 mr-1" /> 조건 추가
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {sellConditions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            매도 조건을 추가하세요
                        </p>
                    ) : (
                        sellConditions.map(cond => (
                            <ConditionRow
                                key={cond.id}
                                condition={cond}
                                onUpdate={(updates) => updateCondition(cond.id, updates)}
                                onRemove={() => removeCondition(cond.id)}
                            />
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

interface ConditionRowProps {
    condition: StrategyCondition;
    onUpdate: (updates: Partial<StrategyCondition>) => void;
    onRemove: () => void;
}

function ConditionRow({ condition, onUpdate, onRemove }: ConditionRowProps) {
    const indicator = INDICATORS.find(i => i.id === condition.indicator);

    return (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg flex-wrap">
            {/* Indicator */}
            <Select value={condition.indicator} onValueChange={(v) => onUpdate({ indicator: v })}>
                <SelectTrigger className="w-32">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {INDICATORS.map(ind => (
                        <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Indicator Params */}
            {indicator?.params.map(param => (
                <div key={param} className="flex items-center gap-1">
                    <Label className="text-xs text-muted-foreground">{param}:</Label>
                    <Input
                        type="number"
                        className="w-16 h-8"
                        value={condition.indicatorParams[param] || ''}
                        onChange={(e) => onUpdate({
                            indicatorParams: {
                                ...condition.indicatorParams,
                                [param]: Number(e.target.value)
                            }
                        })}
                    />
                </div>
            ))}

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            {/* Operator */}
            <Select value={condition.operator} onValueChange={(v) => onUpdate({ operator: v })}>
                <SelectTrigger className="w-40">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {OPERATORS.map(op => (
                        <SelectItem key={op.id} value={op.id}>{op.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Compare Target */}
            <Select value={condition.compareTarget} onValueChange={(v) => onUpdate({ compareTarget: v })}>
                <SelectTrigger className="w-32">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {COMPARE_TARGETS.map(ct => (
                        <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Compare Value (if fixed value) */}
            {condition.compareTarget === 'value' && (
                <Input
                    type="number"
                    className="w-20 h-8"
                    value={condition.compareValue || ''}
                    onChange={(e) => onUpdate({ compareValue: Number(e.target.value) })}
                    placeholder="값"
                />
            )}

            {/* Remove Button */}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function configToDescription(config: StrategyBuilderConfig): string {
    const lines: string[] = [];
    
    config.conditions.forEach(cond => {
        const indicator = INDICATORS.find(i => i.id === cond.indicator)?.name || cond.indicator;
        const operator = OPERATORS.find(o => o.id === cond.operator)?.label || cond.operator;
        const target = COMPARE_TARGETS.find(t => t.id === cond.compareTarget)?.label || cond.compareTarget;
        const value = cond.compareTarget === 'value' ? ` ${cond.compareValue}` : '';
        const action = cond.action === 'buy' ? 'BUY' : 'SELL';
        
        lines.push(`${action} when ${indicator} ${operator} ${target}${value}`);
    });
    
    return lines.join('\n');
}

export default StrategyBuilder;
