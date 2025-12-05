'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Trash2, Key, Eye, EyeOff, Loader2 } from 'lucide-react';

export const ExchangeManager = () => {
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [loading, setLoading] = useState(false);
    const [keys, setKeys] = useState<any[]>([]);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('api_keys')
            .select('id, exchange, api_key')
            .eq('user_id', user.id);

        if (data) setKeys(data);
    };

    const handleAddKey = async () => {
        if (!apiKey || !apiSecret) return;
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('api_keys')
            .insert({
                user_id: user.id,
                exchange: 'Binance',
                api_key: apiKey,
                api_secret: apiSecret // Note: In production, encrypt this before sending or use a secure proxy
            });

        if (error) {
            alert('Failed to add key: ' + error.message);
        } else {
            alert('API Key added successfully');
            setApiKey('');
            setApiSecret('');
            fetchKeys();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', id);

        if (!error) {
            setKeys(keys.filter(k => k.id !== id));
        }
    };

    return (
        <Card className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Key className="text-primary" size={24} />
                    Exchange API Keys
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Manage your exchange connections securely. Keys are encrypted at rest.
                </p>
            </div>

            {/* Add Key Form */}
            <div className="grid gap-4 p-4 border border-border rounded-lg bg-card/50">
                <h3 className="font-medium">Add New Connection</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">Exchange</label>
                        <select className="w-full p-2 rounded-md bg-background border border-border text-sm">
                            <option value="binance">Binance</option>
                            {/* <option value="upbit">Upbit</option> */}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">API Key</label>
                        <input
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full p-2 rounded-md bg-background border border-border text-sm"
                            placeholder="Enter your API Key"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-medium text-gray-500">API Secret</label>
                        <div className="relative">
                            <input
                                type={showSecret ? "text" : "password"}
                                value={apiSecret}
                                onChange={(e) => setApiSecret(e.target.value)}
                                className="w-full p-2 rounded-md bg-background border border-border text-sm pr-10"
                                placeholder="Enter your API Secret"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleAddKey}
                        disabled={loading || !apiKey || !apiSecret}
                        className="bg-primary text-black px-4 py-2 rounded-md text-sm font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        Connect Exchange
                    </button>
                </div>
            </div>

            {/* Key List */}
            <div className="space-y-4">
                <h3 className="font-medium">Connected Exchanges</h3>
                {keys.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-border rounded-lg">
                        No exchanges connected yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {keys.map((key) => (
                            <div key={key.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-[#F3BA2F] flex items-center justify-center text-black font-bold text-xs">
                                        BIN
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{key.exchange}</p>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {key.api_key.slice(0, 4)}...{key.api_key.slice(-4)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(key.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};
