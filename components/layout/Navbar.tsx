'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, LayoutDashboard, Plus } from 'lucide-react';

export const Navbar = () => {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/dashboard" className="text-xl font-bold tracking-tighter">
                    QUANT<span className="text-primary">.LIVE</span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link
                        href="/dashboard"
                        className="text-sm font-medium text-gray-400 hover:text-foreground transition-colors flex items-center gap-2"
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};
