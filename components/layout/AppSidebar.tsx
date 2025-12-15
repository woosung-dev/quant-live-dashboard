"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    FlaskConical,
    Activity,
    PieChart,
    Settings,
    LogOut,
    ChevronRight,
    Menu,
    Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle"; // Assuming path
import { useTranslations } from "next-intl"; // Ideally use translations if avail
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AppSidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    // Helper for checking active route (naive)
    const isActive = (path: string) => pathname?.includes(path);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const navItems = [
        {
            title: "Overview",
            href: "/dashboard",
            icon: LayoutDashboard,
            exact: true
        },
        {
            title: "Strategy Lab",
            href: "/dashboard/strategy-lab",
            icon: FlaskConical
        },
        {
            title: "Explorer",
            href: "/dashboard/explorer",
            icon: Globe
        },
        {
            title: "Live Trading",
            href: "/dashboard/live",
            icon: Activity
        },
        {
            title: "Portfolio",
            href: "/dashboard/portfolio",
            icon: PieChart
        },
        {
            title: "Settings",
            href: "/dashboard/settings",
            icon: Settings
        }
    ];

    return (
        <div className={cn("relative flex flex-col h-screen border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className, collapsed ? "w-[80px]" : "w-[240px]", "transition-all duration-300")}>

            {/* Header */}
            <div className="flex items-center h-16 px-4 border-b">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    {!collapsed && <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">QuantLive</span>}
                    {collapsed && <span className="text-emerald-500">Q</span>}
                </Link>
                <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={() => setCollapsed(!collapsed)}>
                    <Menu className="w-4 h-4" />
                </Button>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 flex flex-col gap-1 px-2">
                {navItems.map((item) => {
                    const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={active ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-2 mb-1",
                                    active && "bg-secondary/50 font-medium",
                                    collapsed && "justify-center px-0"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", active && "text-primary")} />
                                {!collapsed && <span>{item.title}</span>}
                            </Button>
                        </Link>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t space-y-2">
                <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
                    <ThemeToggle />
                    <Button variant="outline" size="icon" onClick={() => setCollapsed(!collapsed)} className="hidden md:flex">
                        <ChevronRight className={cn("w-4 h-4 transition-transform", !collapsed && "rotate-180")} />
                    </Button>
                </div>

                <Button variant="ghost" className={cn("w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20", collapsed && "justify-center")} onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {!collapsed && "Sign Out"}
                </Button>
            </div>
        </div>
    );
}
