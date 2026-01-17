"use client";

import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, TrendingUp, Activity, BarChart2, Volume2, Gauge } from "lucide-react";
import type { IndicatorMeta, IndicatorCategory, IndicatorInputDef } from "@/features/backtest/lib/indicators/types";
import { 
  searchIndicators, 
  getIndicatorsByCategory, 
  getPopularIndicators,
} from "@/features/backtest/lib/indicators/registry";

interface IndicatorSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectIndicator: (indicator: IndicatorMeta, inputs: Record<string, unknown>) => void;
}

const CATEGORY_ICONS: Record<IndicatorCategory, React.ReactNode> = {
  Trend: <TrendingUp className="w-4 h-4" />,
  Oscillators: <Activity className="w-4 h-4" />,
  Volatility: <BarChart2 className="w-4 h-4" />,
  Volume: <Volume2 className="w-4 h-4" />,
  Momentum: <Gauge className="w-4 h-4" />,
  Other: <BarChart2 className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  Trend: "트렌드",
  Oscillators: "오실레이터",
  Volatility: "변동성",
  Volume: "거래량",
  Momentum: "모멘텀",
  Other: "기타",
};

export function IndicatorSearchModal({ open, onClose, onSelectIndicator }: IndicatorSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IndicatorCategory | "popular">("popular");
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorMeta | null>(null);
  const [inputs, setInputs] = useState<Record<string, unknown>>({});

  // 카테고리별 지표 그룹
  const indicatorsByCategory = useMemo(() => getIndicatorsByCategory(), []);
  const popularIndicators = useMemo(() => getPopularIndicators(), []);

  // 검색 결과
  const filteredIndicators = useMemo(() => {
    if (searchQuery.trim()) {
      return searchIndicators(searchQuery);
    }
    
    if (selectedCategory === "popular") {
      return popularIndicators;
    }
    
    return indicatorsByCategory[selectedCategory] || [];
  }, [searchQuery, selectedCategory, indicatorsByCategory, popularIndicators]);

  // 지표 선택 시 기본 입력값 설정
  const handleSelectIndicator = useCallback((indicator: IndicatorMeta) => {
    setSelectedIndicator(indicator);
    const defaultInputs: Record<string, unknown> = {};
    indicator.inputs.forEach(input => {
      defaultInputs[input.name] = input.defaultValue;
    });
    setInputs(defaultInputs);
  }, []);

  // 입력값 변경
  const handleInputChange = useCallback((name: string, value: unknown) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  }, []);

  // 차트에 추가
  const handleAdd = useCallback(() => {
    if (selectedIndicator) {
      onSelectIndicator(selectedIndicator, inputs);
      setSelectedIndicator(null);
      setInputs({});
      setSearchQuery("");
      onClose();
    }
  }, [selectedIndicator, inputs, onSelectIndicator, onClose]);

  // 모달 닫기
  const handleClose = useCallback(() => {
    setSelectedIndicator(null);
    setInputs({});
    setSearchQuery("");
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            지표 추가
          </DialogTitle>
        </DialogHeader>

        {/* 검색 입력 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="지표 검색 (RSI, MACD, Bollinger...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* 카테고리 탭 + 지표 목록 */}
          <div className="flex-1 min-w-0">
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as IndicatorCategory | "popular")}>
              <TabsList className="w-full justify-start gap-1 h-auto flex-wrap">
                <TabsTrigger value="popular" className="text-xs">
                  ⭐ 인기
                </TabsTrigger>
                {(Object.keys(CATEGORY_LABELS) as IndicatorCategory[]).map((category) => (
                  <TabsTrigger key={category} value={category} className="text-xs gap-1">
                    {CATEGORY_ICONS[category]}
                    {CATEGORY_LABELS[category]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-2">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 pr-4">
                    {filteredIndicators.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        검색 결과가 없습니다
                      </p>
                    ) : (
                      filteredIndicators.map((indicator) => (
                        <button
                          key={indicator.id}
                          onClick={() => handleSelectIndicator(indicator)}
                          className={`w-full text-left p-3 rounded-lg border transition-all
                            ${selectedIndicator?.id === indicator.id 
                              ? 'border-emerald-500 bg-emerald-500/10' 
                              : 'border-transparent hover:bg-muted/50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{indicator.name}</p>
                              <p className="text-xs text-muted-foreground">{indicator.shortName}</p>
                            </div>
                            <Badge variant={indicator.overlay ? "outline" : "secondary"} className="text-xs">
                              {indicator.overlay ? "오버레이" : "패널"}
                            </Badge>
                          </div>
                          {indicator.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {indicator.description}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* 파라미터 설정 패널 */}
          {selectedIndicator && (
            <div className="w-64 border-l pl-4">
              <h4 className="font-medium text-sm mb-3">{selectedIndicator.name} 설정</h4>
              
              <div className="space-y-3">
                {selectedIndicator.inputs.map((input) => (
                  <div key={input.name}>
                    <Label className="text-xs text-muted-foreground">{input.label}</Label>
                    {input.type === 'number' ? (
                      <Input
                        type="number"
                        value={inputs[input.name] as number || input.defaultValue as number}
                        onChange={(e) => handleInputChange(input.name, Number(e.target.value))}
                        min={input.min}
                        max={input.max}
                        step={input.step}
                        className="h-8 mt-1"
                      />
                    ) : input.type === 'source' ? (
                      <select
                        value={inputs[input.name] as string || 'close'}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                        className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-sm"
                      >
                        <option value="close">종가 (Close)</option>
                        <option value="open">시가 (Open)</option>
                        <option value="high">고가 (High)</option>
                        <option value="low">저가 (Low)</option>
                        <option value="hl2">HL2</option>
                        <option value="hlc3">HLC3</option>
                        <option value="ohlc4">OHLC4</option>
                      </select>
                    ) : input.type === 'select' && input.options ? (
                      <select
                        value={inputs[input.name] as string || input.defaultValue as string}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                        className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-sm"
                      >
                        {input.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleAdd} 
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                차트에 추가
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default IndicatorSearchModal;
