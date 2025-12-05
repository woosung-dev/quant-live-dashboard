'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save } from 'lucide-react';

interface StrategyEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
    onRunBacktest: () => void;
    onSave: () => void;
}

export const StrategyEditor: React.FC<StrategyEditorProps> = ({
    code,
    onChange,
    onRunBacktest,
    onSave
}) => {
    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-[#1e1e1e]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                <span className="text-xs text-gray-400 font-mono">strategy.js</span>
                <div className="flex gap-2">
                    <button
                        onClick={onSave}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-300 hover:text-white hover:bg-[#333] rounded transition-colors"
                    >
                        <Save size={14} />
                        Save
                    </button>
                    <button
                        onClick={onRunBacktest}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-primary text-black rounded hover:bg-opacity-90 transition-colors"
                    >
                        <Play size={14} />
                        Run Backtest
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-[400px]">
                <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={onChange}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                    }}
                />
            </div>
        </div>
    );
};
