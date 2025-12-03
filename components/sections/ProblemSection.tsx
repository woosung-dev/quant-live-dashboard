'use client';

import { motion } from 'framer-motion';
import { TrendingDown, AlertTriangle, ZapOff } from 'lucide-react';

const problems = [
    {
        icon: TrendingDown,
        title: "과최적화 (Overfitting)",
        desc: "과거 데이터에만 완벽하게 맞춘 전략은 실제 시장의 변동성을 견디지 못하고 실패합니다.",
        color: "text-red-500"
    },
    {
        icon: AlertTriangle,
        title: "슬리피지 & 지연시간",
        desc: "실제 매매는 즉각적이지 않습니다. 숨겨진 비용과 딜레이가 당신의 수익을 갉아먹습니다.",
        color: "text-yellow-500"
    },
    {
        icon: ZapOff,
        title: "시장 노이즈",
        desc: "정적인 백테스트는 실시간 가격 움직임의 미세한 노이즈와 혼란을 무시합니다.",
        color: "text-orange-500"
    }
];

export const ProblemSection = () => {
    return (
        <section className="py-24 px-4 bg-background relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        왜 <span className="text-down">95%</span>의 전략은 실패할까요?
                    </h2>
                    <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                        전통적인 백테스트는 망가졌습니다. 라이브 트레이딩의 가혹한 현실을 무시한 채 거짓된 안정감만 줍니다.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {problems.map((p, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="p-8 rounded-2xl bg-card border border-border hover:border-down/50 transition-colors group"
                        >
                            <div className={`w-12 h-12 rounded-full bg-card-foreground/5 flex items-center justify-center mb-6 ${p.color} group-hover:scale-110 transition-transform`}>
                                <p.icon size={24} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">{p.title}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {p.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
