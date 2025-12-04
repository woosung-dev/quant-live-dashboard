'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StrategyCard } from '@/components/dashboard/StrategyCard';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Strategy {
    id: string;
    name: string;
    type: string;
    created_at: string;
}

export default function DashboardPage() {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchStrategies = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('strategies')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setStrategies(data);
            setLoading(false);
        };

        fetchStrategies();
    }, []);

    const handleCreate = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('strategies')
            .insert({
                user_id: user.id,
                name: 'New Strategy',
                type: 'SMA_CROSS',
                parameters: { fast: 9, slow: 21 }
            })
            .select()
            .single();

        if (data) {
            router.push(`/dashboard/strategy/${data.id}`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-gray-500" size={32} />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Strategies</h1>
                <button
                    onClick={handleCreate}
                    className="bg-primary text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} />
                    New Strategy
                </button>
            </div>

            {strategies.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-xl">
                    <p className="text-gray-400 mb-4">No strategies found.</p>
                    <button
                        onClick={handleCreate}
                        className="text-primary hover:underline"
                    >
                        Create your first strategy
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {strategies.map(strategy => (
                        <StrategyCard
                            key={strategy.id}
                            id={strategy.id}
                            name={strategy.name}
                            type={strategy.type}
                            createdAt={strategy.created_at}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
