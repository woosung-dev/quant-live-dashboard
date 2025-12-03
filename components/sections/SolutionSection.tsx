'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Settings } from 'lucide-react';

export const SolutionSection = () => {
    const [fastPeriod, setFastPeriod] = useState(9);
    const [slowPeriod, setSlowPeriod] = useState(21);
    const [isSimulating, setIsSimulating] = useState(false);

    const handleSimulate = () => {
        setIsSimulating(true);
        setTimeout(() => setIsSimulating(false), 2000); // Fake loading for demo
    };

    return (
        <section className="py-24 px-4 bg-card border-t border-border">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

                {/* Left: Content */}
                <div className="space-y-8">
                    <h2 className="text-4xl md:text-5xl font-bold">
                        <span className="text-primary">해결책</span>: <br />
                        실시간 검증
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        추측하지 말고 확인하세요. 우리 플랫폼은 실시간 시장 데이터를 전략 엔진에 직접 스트리밍하여, 틱 단위로 PnL, 낙폭(Drawdown), 승률을 계산합니다.
                    </p>

                    <ul className="space-y-4">
                        {['제로 레이턴시 체결 시뮬레이션', '현실적인 슬리피지 모델링', '즉각적인 시각적 피드백'].map((item, i) => (
                            <li key={i} className="flex items-center space-x-3">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span className="text-foreground">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right: Interactive UI */}
                <div className="bg-background rounded-2xl border border-border p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />

                    <div className="mb-8 flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Settings size={20} className="text-primary" />
                            전략 파라미터
                        </h3>
                        <span className="text-xs font-mono text-gray-500">SMA CROSSOVER</span>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">단기 이평선 (Fast MA)</label>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                value={fastPeriod}
                                onChange={(e) => setFastPeriod(Number(e.target.value))}
                                className="w-full accent-primary h-2 bg-card rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs font-mono">
                                <span>5</span>
                                <span className="text-primary font-bold">{fastPeriod}</span>
                                <span>50</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">장기 이평선 (Slow MA)</label>
                            <input
                                type="range"
                                min="10"
                                max="200"
                                value={slowPeriod}
                                onChange={(e) => setSlowPeriod(Number(e.target.value))}
                                className="w-full accent-primary h-2 bg-card rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs font-mono">
                                <span>10</span>
                                <span className="text-primary font-bold">{slowPeriod}</span>
                                <span>200</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSimulate}
                            className="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                        >
                            {isSimulating ? (
                                <span className="animate-pulse">시뮬레이션 중...</span>
                            ) : (
                                <>
                                    <Play size={18} fill="currentColor" />
                                    백테스트 실행
                                </>
                            )}
                        </button>
                    </div>

                    {/* Mini Result Graph Placeholder */}
                    <div className="mt-8 h-40 bg-card rounded-lg border border-border flex items-center justify-center relative overflow-hidden">
                        {/* Fake Graph Line */}
                        <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none">
                            <path d="M0,100 Q50,50 100,80 T200,40 T300,60 T400,20" fill="none" stroke="#00ff94" strokeWidth="2" className="opacity-50" />
                            <path d="M0,100 L400,100 L400,20 L0,20 Z" fill="url(#grad)" className="opacity-10" />
                            <defs>
                                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#00ff94" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#00ff94" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="z-10 text-center">
                            <div className="text-2xl font-bold text-white">+124.5%</div>
                            <div className="text-xs text-gray-500">예상 연수익률</div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
