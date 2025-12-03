'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export const CTASection = () => {
    return (
        <section className="py-32 px-4 bg-background relative overflow-hidden flex items-center justify-center">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full transform scale-150" />

            <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
                <h2 className="text-5xl md:text-7xl font-bold tracking-tighter">
                    배포할 <span className="text-primary">준비</span>가 되셨나요?
                </h2>
                <p className="text-xl text-gray-400">
                    희망 회로를 멈추고, 데이터로 트레이딩하세요.
                    <br />
                    상위 1% 알고리즘 트레이더와 함께하세요.
                </p>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group px-10 py-5 bg-white text-black font-bold text-xl rounded-full flex items-center gap-3 mx-auto hover:bg-gray-200 transition-colors"
                >
                    무료 시뮬레이션 시작
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
            </div>
        </section>
    );
};
