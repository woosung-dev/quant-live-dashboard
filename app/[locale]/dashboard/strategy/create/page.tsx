"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Wand2 } from "lucide-react";
import Link from "next/link";
import { StrategyBuilder, StrategyBuilderConfig, configToDescription } from "@/features/backtest/components/StrategyBuilder";

export default function CreateStrategyPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'builder' | 'code'>('builder');

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [code, setCode] = useState("");
    const [builderConfig, setBuilderConfig] = useState<StrategyBuilderConfig>({
        name: '',
        conditions: []
    });

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("전략 이름을 입력해주세요");
            return;
        }

        setSaving(true);
        try {
            const strategyData: any = {
                name: name.trim(),
                description: description.trim(),
                type: mode === 'builder' ? 'BUILDER' : 'PINE_SCRIPT'
            };

            if (mode === 'builder') {
                strategyData.builder_config = builderConfig;
                // 빌더 설명 자동 생성
                if (!description) {
                    strategyData.description = configToDescription(builderConfig);
                }
            } else {
                strategyData.code = code;
            }

            const res = await fetch('/api/strategies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(strategyData)
            });

            if (res.status === 401) {
                toast.error("로그인이 필요합니다");
                router.push('/login');
                return;
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save strategy');
            }

            const data = await res.json();
            toast.success("전략이 저장되었습니다!");
            router.push(`/dashboard/strategy-lab`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mx-auto py-6 max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/strategy-lab">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">새 전략 만들기</h1>
                        <p className="text-muted-foreground">비주얼 빌더 또는 Pine Script로 전략을 생성하세요</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving || !name.trim()}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "저장 중..." : "저장"}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">전략 이름 *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="나만의 RSI 전략"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">설명 (선택)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="전략에 대한 설명..."
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            <Tabs value={mode} onValueChange={(v) => setMode(v as 'builder' | 'code')}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="builder" className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" /> 비주얼 빌더
                    </TabsTrigger>
                    <TabsTrigger value="code">Pine Script</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="mt-6">
                    <StrategyBuilder config={builderConfig} onChange={setBuilderConfig} />
                </TabsContent>

                <TabsContent value="code" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pine Script 코드</CardTitle>
                            <CardDescription>TradingView Pine Script 코드를 입력하세요</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder={`//@version=5
strategy("My Strategy", overlay=true)

// Your strategy logic here...
`}
                                className="font-mono min-h-[400px]"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
