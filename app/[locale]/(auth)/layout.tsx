'use client';

import { Link } from '@/i18n/routing';
import { TrendingUp, Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'ko', label: 'KO', flag: '🇰🇷' },
];

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [langOpen, setLangOpen] = useState(false);
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    const handleLanguageChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setLangOpen(false);
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Minimal Header */}
            <header className="flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                        <TrendingUp className="text-white" size={18} />
                    </div>
                    <span className="text-lg font-bold tracking-tighter">
                        QUANT<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">.LIVE</span>
                    </span>
                </Link>

                {/* Language Switcher */}
                <div
                    className="relative"
                    onMouseEnter={() => setLangOpen(true)}
                    onMouseLeave={() => setLangOpen(false)}
                >
                    <button
                        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/50"
                        aria-label="Change language"
                    >
                        <Globe className="h-4 w-4" />
                        <span>{currentLang.flag} {currentLang.label}</span>
                    </button>

                    <AnimatePresence>
                        {langOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.1 }}
                                className="absolute top-full right-0 mt-1 z-50"
                            >
                                <div className="bg-popover/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl p-1 min-w-[100px]">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${locale === lang.code
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'hover:bg-accent/50 text-foreground'
                                                }`}
                                        >
                                            <span>{lang.flag}</span>
                                            <span>{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                {children}
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-muted-foreground">
                © 2024 Quant.Live. All rights reserved.
            </footer>
        </div>
    );
}
