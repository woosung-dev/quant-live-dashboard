'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';

interface StrategyEditorProps {
    initialName: string;
    initialParams: any;
    onSave: (name: string, params: any) => Promise<void>;
}

export const StrategyEditor = ({ initialName, initialParams, onSave }: StrategyEditorProps) => {
    const [name, setName] = useState(initialName);
    const [params, setParams] = useState(initialParams);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(name, params);
        setSaving(false);
    };

    return (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Strategy Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold border-b border-border pb-2">Parameters</h3>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Fast MA Period</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="2"
                            max="50"
                            value={params.fast || 9}
                            onChange={(e) => setParams({ ...params, fast: Number(e.target.value) })}
                            className="flex-1 accent-primary h-2 bg-background rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-mono w-8 text-right">{params.fast || 9}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Slow MA Period</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="10"
                            max="200"
                            value={params.slow || 21}
                            onChange={(e) => setParams({ ...params, slow: Number(e.target.value) })}
                            className="flex-1 accent-primary h-2 bg-background rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-mono w-8 text-right">{params.slow || 21}</span>
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Changes</>}
            </button>
        </div>
    );
};
