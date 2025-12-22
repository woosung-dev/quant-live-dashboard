'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    Bell,
    Globe,
    Sun,
    Moon,
    User,
    Settings,
    LogOut,
    ChevronDown,
    LayoutDashboard,
    FlaskConical,
    Activity,
    PieChart,
    TrendingUp,
    X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from '@/components/ui/sheet';

// Navigation items - Exchange style
const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Strategy Lab', href: '/dashboard/strategy-lab', icon: FlaskConical },
    { label: 'Live Trading', href: '/dashboard/live', icon: Activity },
    { label: 'Portfolio', href: '/dashboard/portfolio', icon: PieChart },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const languages = [
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'ko', label: 'KO', flag: '🇰🇷' },
];

export function DashboardHeader() {
    const pathname = usePathname();
    const locale = useLocale();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Check if current path matches nav item
    const isActive = (href: string) => {
        const cleanPath = pathname?.replace(`/${locale}`, '') || '/dashboard';
        if (href === '/dashboard') {
            return cleanPath === '/dashboard';
        }
        return cleanPath.startsWith(href);
    };

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    const handleLanguageChange = (newLocale: string) => {
        const cleanPath = pathname?.replace(`/${locale}`, '') || '/dashboard';
        router.replace(cleanPath, { locale: newLocale });
        setLangOpen(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 md:px-6">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-2 mr-6">
                    <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
                        <TrendingUp className="text-white" size={16} />
                    </div>
                    <span className="hidden sm:inline text-lg font-bold tracking-tighter">
                        QUANT<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">.LIVE</span>
                    </span>
                </Link>

                {/* Desktop Navigation - Exchange Style Tabs */}
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    }`}
                            >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Section */}
                <div className="flex items-center gap-1 md:gap-2">
                    {/* Notifications */}
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
                    </button>

                    {/* Language Switcher */}
                    <div
                        className="relative hidden sm:block"
                        onMouseEnter={() => setLangOpen(true)}
                        onMouseLeave={() => setLangOpen(false)}
                    >
                        <button
                            className="flex items-center gap-1 p-2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Change language"
                        >
                            <Globe className="h-5 w-5" />
                            <span className="text-xs">{currentLang.flag}</span>
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

                    {/* Theme Toggle */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Toggle theme"
                    >
                        {mounted ? (
                            theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
                        ) : (
                            <div className="h-5 w-5" />
                        )}
                    </button>

                    {/* User Menu - Desktop */}
                    <div
                        className="relative hidden sm:block"
                        onMouseEnter={() => setProfileOpen(true)}
                        onMouseLeave={() => setProfileOpen(false)}
                    >
                        <button
                            className="flex items-center gap-2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/50"
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                            </div>
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        <AnimatePresence>
                            {profileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full right-0 mt-1 z-50"
                                >
                                    <div className="bg-popover/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl p-1 min-w-[160px]">
                                        <Link
                                            href="/dashboard/settings"
                                            className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-accent/50 transition-colors"
                                        >
                                            <Settings className="h-4 w-4" />
                                            <span>Settings</span>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            <span>Sign out</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile Menu Button */}
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <button
                                className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Open menu"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[280px] p-0">
                            <SheetHeader className="p-4 border-b border-border/50">
                                <div className="flex items-center justify-between">
                                    <SheetTitle className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded flex items-center justify-center">
                                            <TrendingUp className="text-white" size={14} />
                                        </div>
                                        <span className="font-bold">QUANT.LIVE</span>
                                    </SheetTitle>
                                    <SheetClose asChild>
                                        <button className="p-1 text-muted-foreground hover:text-foreground">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </SheetClose>
                                </div>
                            </SheetHeader>

                            {/* Mobile Navigation */}
                            <nav className="flex flex-col p-2">
                                {navItems.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active
                                                    ? 'text-emerald-400 bg-emerald-500/10'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                                }`}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Mobile Language & Logout */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 space-y-2">
                                {/* Language */}
                                <div className="flex items-center justify-between px-2 py-2">
                                    <span className="text-sm text-muted-foreground">Language</span>
                                    <div className="flex gap-1">
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => handleLanguageChange(lang.code)}
                                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${locale === lang.code
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                {lang.flag} {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Sign out</span>
                                </button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
