'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export const PublicNavbar = () => {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="text-black" size={20} />
                    </div>
                    <span className="text-xl font-bold tracking-tighter">
                        QUANT<span className="text-primary">.LIVE</span>
                    </span>
                </Link>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-8">
                    <Link
                        href="/#features"
                        className="text-sm font-medium text-gray-400 hover:text-foreground transition-colors"
                    >
                        Features
                    </Link>
                    <Link
                        href="/pricing"
                        className="text-sm font-medium text-gray-400 hover:text-foreground transition-colors"
                    >
                        Pricing
                    </Link>
                    <Link
                        href="/docs"
                        className="text-sm font-medium text-gray-400 hover:text-foreground transition-colors"
                    >
                        Docs
                    </Link>
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-gray-400 hover:text-foreground transition-colors"
                    >
                        Login
                    </Link>
                    <Link
                        href="/signup"
                        className="px-4 py-2 bg-primary text-black font-bold text-sm rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        </nav>
    );
};
