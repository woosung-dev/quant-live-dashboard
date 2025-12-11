"use client";

import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

interface PineEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
}

export function PineEditor({ value, onChange }: PineEditorProps) {
    const { theme } = useTheme();

    return (
        <div className="h-[300px] border rounded-md overflow-hidden">
            <Editor
                height="100%"
                defaultLanguage="python" // Python syntax highlighting is close enough for Pine
                value={value}
                onChange={onChange}
                theme={theme === "dark" ? "vs-dark" : "light"}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                }}
            />
        </div>
    );
}
