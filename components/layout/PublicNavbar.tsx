'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    ChevronDown,
    Menu,
    X,
    FlaskConical,
    BarChart3,
    Zap,
    BookOpen,
    Code,
    FileText,
    Globe,
    Sun,
    Moon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useTheme } from 'next-themes';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from '@/components/ui/sheet';

// Navigation menu structure
const navigationItems = [
    {
        label: 'Features',
        href: '/#features',
        submenu: [
            { label: 'Strategy Lab', href: '/dashboard/strategy-lab', icon: FlaskConical, description: 'Build & test strategies' },
            { label: 'Backtest Engine', href: '/dashboard/strategy-lab#backtest', icon: BarChart3, description: 'Historical performance' },
            { label: 'Live Trading', href: '/dashboard/live', icon: Zap, description: 'Real-time execution' },
        ]
    },
    {
        label: 'Docs',
        href: '/docs',
        submenu: [
            { label: 'Getting Started', href: '/docs/getting-started', icon: BookOpen, description: 'Quick start guide' },
            { label: 'API Reference', href: '/docs/api', icon: Code, description: 'Developer documentation' },
            { label: 'Pine Script Guide', href: '/docs/pine-script', icon: FileText, description: 'Strategy scripting' },
        ]
    },
    {
        label: 'Pricing',
        href: '/pricing',
    },
];

// Language options
const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

// Desktop dropdown menu component
const DesktopNavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!item.submenu) {
        return (
            <Link
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
                {item.label}
            </Link>
        );
    }

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
                {item.label}
                <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute top-full left-0 pt-2 z-50"
                    >
                        <div className="bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl shadow-black/20 p-2 min-w-[240px]">
                            {item.submenu.map((subItem) => (
                                <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                                >
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                                        <subItem.icon className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-foreground">{subItem.label}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{subItem.description}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Language switcher dropdown
const LanguageSwitcherDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    const handleLanguageChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setIsOpen(false);
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                aria-label="Change language"
            >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{currentLang.flag}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute top-full right-0 pt-2 z-50"
                    >
                        <div className="bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl shadow-black/20 p-1 min-w-[140px]">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${locale === lang.code
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
    );
};

// Mobile accordion menu item
const MobileNavItem = ({
    item,
    onClose
}: {
    item: typeof navigationItems[0];
    onClose: () => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!item.submenu) {
        return (
            <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between py-4 px-4 text-base font-medium text-foreground hover:bg-accent/30 rounded-lg transition-colors"
            >
                {item.label}
            </Link>
        );
    }

    return (
        <div className="border-b border-border/30 last:border-0">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between py-4 px-4 text-base font-medium text-foreground hover:bg-accent/30 rounded-lg transition-colors"
            >
                <span>{item.label}</span>
                <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pb-2 pl-4">
                            {item.submenu.map((subItem) => (
                                <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={onClose}
                                    className="flex items-center gap-3 py-3 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded-lg transition-colors"
                                >
                                    <subItem.icon className="h-4 w-4 text-emerald-400" />
                                    <span>{subItem.label}</span>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Mobile language selector
const MobileLanguageSelector = ({ onClose }: { onClose: () => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    const handleLanguageChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setIsExpanded(false);
        onClose();
    };

    return (
        <div className="border-b border-border/30">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between py-4 px-4 text-base font-medium text-foreground hover:bg-accent/30 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-emerald-400" />
                    <span>Language</span>
                    <span className="text-sm text-muted-foreground">({currentLang.label})</span>
                </div>
                <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pb-2 pl-4">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    className={`w-full flex items-center gap-3 py-3 px-4 text-sm rounded-lg transition-colors ${locale === lang.code
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
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
    );
};

export const PublicNavbar = () => {
    const [user, setUser] = useState<User | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    // Prevent hydration mismatch - only render theme-dependent content after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);


    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                        <TrendingUp className="text-white" size={20} />
                    </div>
                    <span className="text-xl font-bold tracking-tighter">
                        QUANT<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">.LIVE</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1">
                    {navigationItems.map((item) => (
                        <DesktopNavItem key={item.label} item={item} />
                    ))}
                </div>

                {/* Right Section: Language + Theme + Auth */}
                <div className="flex items-center gap-2">
                    {/* Language Switcher - Desktop */}
                    <div className="hidden md:block">
                        <LanguageSwitcherDropdown />
                    </div>

                    {/* Theme Toggle - Desktop */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="hidden md:flex p-2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Toggle theme"
                    >
                        {mounted ? (
                            theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
                        ) : (
                            <div className="h-5 w-5" /> // Placeholder to prevent layout shift
                        )}
                    </button>

                    {/* Auth Buttons - Desktop */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/signup"
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <button
                                className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Open menu"
                            >
                                <Menu className="h-6 w-6" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:w-[400px] p-0">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Navigation Menu</SheetTitle>
                            </SheetHeader>

                            {/* Mobile Menu Content */}
                            <div className="flex flex-col h-full">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-border/30">
                                    <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
                                            <TrendingUp className="text-white" size={20} />
                                        </div>
                                        <span className="text-lg font-bold">QUANT.LIVE</span>
                                    </Link>
                                    <SheetClose asChild>
                                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </SheetClose>
                                </div>

                                {/* Navigation Items */}
                                <div className="flex-1 overflow-y-auto py-4 px-2">
                                    {/* Language Selector */}
                                    <MobileLanguageSelector onClose={closeMobileMenu} />

                                    {/* Theme Toggle */}
                                    <div className="border-b border-border/30">
                                        <button
                                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                            className="w-full flex items-center justify-between py-4 px-4 text-base font-medium text-foreground hover:bg-accent/30 rounded-lg transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {mounted ? (
                                                    theme === 'dark' ? (
                                                        <Sun className="h-5 w-5 text-amber-400" />
                                                    ) : (
                                                        <Moon className="h-5 w-5 text-indigo-400" />
                                                    )
                                                ) : (
                                                    <div className="h-5 w-5" />
                                                )}
                                                <span>Theme</span>
                                                {mounted && (
                                                    <span className="text-sm text-muted-foreground">
                                                        ({theme === 'dark' ? 'Dark' : 'Light'})
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </div>

                                    {/* Menu Items */}
                                    {navigationItems.map((item) => (
                                        <MobileNavItem
                                            key={item.label}
                                            item={item}
                                            onClose={closeMobileMenu}
                                        />
                                    ))}
                                </div>

                                {/* Auth Section */}
                                <div className="p-4 border-t border-border/30 bg-accent/20">
                                    {user ? (
                                        <Link
                                            href="/dashboard"
                                            onClick={closeMobileMenu}
                                            className="block w-full py-3 text-center bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            Go to Dashboard
                                        </Link>
                                    ) : (
                                        <div className="space-y-3">
                                            <Link
                                                href="/login"
                                                onClick={closeMobileMenu}
                                                className="block w-full py-3 text-center text-foreground font-medium border border-border rounded-xl hover:bg-accent/50 transition-colors"
                                            >
                                                Login
                                            </Link>
                                            <Link
                                                href="/signup"
                                                onClick={closeMobileMenu}
                                                className="block w-full py-3 text-center bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                                            >
                                                Sign Up
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </nav>
    );
};
