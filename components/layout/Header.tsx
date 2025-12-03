'use client'

import { motion } from 'framer-motion'

export const Header = () => {
    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5"
        >
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="text-xl font-bold tracking-tighter">
                    QUANT<span className="text-primary">LIVE</span>
                </div>

                <nav className="hidden md:flex gap-6 text-sm text-gray-400">
                    <a href="#" className="hover:text-white transition-colors">Features</a>
                    <a href="#" className="hover:text-white transition-colors">Pricing</a>
                    <a href="#" className="hover:text-white transition-colors">Docs</a>
                </nav>

                <div className="flex gap-4">
                    <button className="text-sm font-bold hover:text-primary transition-colors">
                        Login
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold transition-colors">
                        Get Started
                    </button>
                </div>
            </div>
        </motion.header>
    )
}
