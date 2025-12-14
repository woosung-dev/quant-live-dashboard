'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import { Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                setLoading(false);
            }
        };

        checkUser();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar - Hidden on mobile by default, handled by CSS/State usually, 
                 but for checking "page routing" we just render it. 
                 Ideally use a Mobile Sheet for small screens, but Sidebar for desktop. */}
            <div className="hidden md:block">
                <AppSidebar />
            </div>

            {/* Mobile Nav could be here */}

            <main className="flex-1 max-w-full overflow-hidden">
                <div className="h-full px-4 py-8 md:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
