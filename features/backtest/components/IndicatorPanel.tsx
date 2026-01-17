"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Eye, 
  EyeOff, 
  Trash2, 
  Settings2,
  GripVertical,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { ActiveIndicator, IndicatorMeta, PlotConfig } from "@/features/backtest/lib/indicators/types";
import { IndicatorSearchModal } from "./IndicatorSearchModal";

interface IndicatorPanelProps {
  activeIndicators: ActiveIndicator[];
  onAddIndicator: (indicator: IndicatorMeta, inputs: Record<string, unknown>) => void;
  onRemoveIndicator: (instanceId: string) => void;
  onToggleVisibility: (instanceId: string) => void;
  onUpdateColors: (instanceId: string, colors: Record<string, string>) => void;
  onUpdateInputs: (instanceId: string, inputs: Record<string, unknown>) => void;
}

// 기본 색상 팔레트
const COLOR_PALETTE = [
  '#2962FF', '#FF6D00', '#00C853', '#D500F9', '#FFD600', '#00BCD4',
  '#E91E63', '#9C27B0', '#3F51B5', '#009688', '#8BC34A', '#FF5722',
];

export function IndicatorPanel({ 
  activeIndicators, 
  onAddIndicator, 
  onRemoveIndicator,
  onToggleVisibility,
  onUpdateColors,
}: IndicatorPanelProps) {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddIndicator = useCallback((indicator: IndicatorMeta, inputs: Record<string, unknown>) => {
    onAddIndicator(indicator, inputs);
    setSearchModalOpen(false);
  }, [onAddIndicator]);

  const handleColorChange = useCallback((instanceId: string, plotId: string, color: string) => {
    const indicator = activeIndicators.find(i => i.instanceId === instanceId);
    if (indicator) {
      onUpdateColors(instanceId, { ...indicator.colors, [plotId]: color });
    }
  }, [activeIndicators, onUpdateColors]);

  const overlayIndicators = activeIndicators.filter(i => i.indicatorMeta.overlay);
  const panelIndicators = activeIndicators.filter(i => !i.indicatorMeta.overlay);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">활성 지표</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setSearchModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        <ScrollArea className="h-[300px]">
          {activeIndicators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>활성 지표가 없습니다</p>
              <Button 
                variant="link" 
                className="text-emerald-500 mt-2"
                onClick={() => setSearchModalOpen(true)}
              >
                지표 추가하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 오버레이 지표 */}
              {overlayIndicators.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    📈 오버레이 (메인 차트)
                  </p>
                  <div className="space-y-1">
                    {overlayIndicators.map((indicator) => (
                      <IndicatorItem
                        key={indicator.instanceId}
                        indicator={indicator}
                        expanded={expandedId === indicator.instanceId}
                        onToggleExpand={() => setExpandedId(
                          expandedId === indicator.instanceId ? null : indicator.instanceId
                        )}
                        onRemove={() => onRemoveIndicator(indicator.instanceId)}
                        onToggleVisibility={() => onToggleVisibility(indicator.instanceId)}
                        onColorChange={(plotId, color) => handleColorChange(indicator.instanceId, plotId, color)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 패널 지표 */}
              {panelIndicators.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    📊 패널 (별도 차트)
                  </p>
                  <div className="space-y-1">
                    {panelIndicators.map((indicator) => (
                      <IndicatorItem
                        key={indicator.instanceId}
                        indicator={indicator}
                        expanded={expandedId === indicator.instanceId}
                        onToggleExpand={() => setExpandedId(
                          expandedId === indicator.instanceId ? null : indicator.instanceId
                        )}
                        onRemove={() => onRemoveIndicator(indicator.instanceId)}
                        onToggleVisibility={() => onToggleVisibility(indicator.instanceId)}
                        onColorChange={(plotId, color) => handleColorChange(indicator.instanceId, plotId, color)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* 지표 검색 모달 */}
      <IndicatorSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectIndicator={handleAddIndicator}
      />
    </Card>
  );
}

interface IndicatorItemProps {
  indicator: ActiveIndicator;
  expanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onColorChange: (plotId: string, color: string) => void;
}

function IndicatorItem({ 
  indicator, 
  expanded,
  onToggleExpand,
  onRemove, 
  onToggleVisibility,
  onColorChange,
}: IndicatorItemProps) {
  // 입력 파라미터 요약 표시
  const inputSummary = Object.entries(indicator.inputs)
    .filter(([, v]) => typeof v === 'number')
    .map(([, v]) => v)
    .join(', ');

  return (
    <div className={`rounded-lg border transition-all ${indicator.visible ? 'bg-card' : 'bg-muted/30 opacity-60'}`}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
        
        <button 
          onClick={onToggleExpand}
          className="flex-1 text-left flex items-center gap-2"
        >
          <span className="font-medium text-sm">{indicator.indicatorMeta.shortName}</span>
          {inputSummary && (
            <span className="text-xs text-muted-foreground">({inputSummary})</span>
          )}
        </button>

        <Badge variant="outline" className="text-[10px] px-1">
          {indicator.indicatorMeta.overlay ? "오버레이" : "패널"}
        </Badge>

        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onToggleVisibility}>
          {indicator.visible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>

        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onToggleExpand}>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6 text-destructive hover:text-destructive" 
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* 확장된 설정 */}
      {expanded && (
        <div className="px-3 pb-3 border-t mt-1 pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Settings2 className="w-3 h-3" />
            색상 설정
          </p>
          <div className="flex flex-wrap gap-2">
            {indicator.indicatorMeta.plots.map((plot) => (
              <div key={plot.id} className="flex items-center gap-1">
                <span className="text-xs">{plot.name}:</span>
                <div className="flex gap-1">
                  {COLOR_PALETTE.slice(0, 6).map((color) => (
                    <button
                      key={color}
                      onClick={() => onColorChange(plot.id, color)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                        indicator.colors[plot.id] === color 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default IndicatorPanel;
