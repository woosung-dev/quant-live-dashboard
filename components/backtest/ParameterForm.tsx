"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ParameterDefinition } from "@/types";
import { useEffect, useState } from "react";

interface ParameterFormProps {
    parameters: ParameterDefinition[];
    values: Record<string, any>;
    onChange: (values: Record<string, any>) => void;
    disabled?: boolean;
}

export function ParameterForm({
    parameters,
    values,
    onChange,
    disabled,
}: ParameterFormProps) {
    const handleChange = (name: string, value: any) => {
        onChange({
            ...values,
            [name]: value,
        });
    };

    if (!parameters || parameters.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg">
                설정할 파라미터가 없습니다.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {parameters.map((param) => (
                <div key={param.name} className="space-y-2">
                    <Label htmlFor={param.name} className="text-xs font-medium text-muted-foreground">
                        {param.label}
                    </Label>

                    {param.type === 'number' && (
                        <div className="flex items-center gap-2">
                            <Input
                                id={param.name}
                                type="number"
                                value={values[param.name] ?? param.defaultValue}
                                min={param.min}
                                max={param.max}
                                step={param.step || 1}
                                onChange={(e) => handleChange(param.name, Number(e.target.value))}
                                disabled={disabled}
                                className="h-8"
                            />
                            {param.min !== undefined && param.max !== undefined && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    ({param.min} ~ {param.max})
                                </span>
                            )}
                        </div>
                    )}

                    {param.type === 'select' && param.options && (
                        <Select
                            value={String(values[param.name] ?? param.defaultValue)}
                            onValueChange={(val) => handleChange(param.name, val)}
                            disabled={disabled}
                        >
                            <SelectTrigger id={param.name} className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {param.options.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {param.type === 'boolean' && (
                        <div className="flex items-center gap-2">
                            <Switch
                                id={param.name}
                                checked={values[param.name] ?? param.defaultValue}
                                onCheckedChange={(checked) => handleChange(param.name, checked)}
                                disabled={disabled}
                            />
                            <span className="text-sm">
                                {values[param.name] ? 'On' : 'Off'}
                            </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
