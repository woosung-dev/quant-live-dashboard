"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Upload, DollarSign, Tag, X } from "lucide-react";
import Link from "next/link";

interface UserStrategy {
    id: string;
    name: string;
    description: string;
    type: string;
    is_public: boolean;
}

const PRESET_TAGS = [
    "RSI", "MACD", "EMA", "Bollinger", "Scalping", "Swing", 
    "Day Trading", "High Frequency", "Mean Reversion", "Trend Following"
];

export default function PublishStrategyPage() {
    const router = useRouter();
    const t = useTranslations('Dashboard');

    const [strategies, setStrategies] = useState<UserStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);

    // Form State
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [price, setPrice] = useState(0);

    useEffect(() => {
        fetchStrategies();
    }, []);

    const fetchStrategies = async () => {
        try {
            const res = await fetch('/api/strategies');
            if (res.ok) {
                const data = await res.json();
                setStrategies(data.strategies || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = (tag: string) => {
        if (!tags.includes(tag)) {
            setTags([...tags, tag]);
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handlePublish = async () => {
        if (!selectedStrategyId || !title.trim()) {
            toast.error("전략과 제목을 입력해주세요");
            return;
        }

        setPublishing(true);
        try {
            const res = await fetch('/api/strategies/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy_id: selectedStrategyId,
                    title: title.trim(),
                    description: description.trim(),
                    tags,
                    is_premium: isPremium,
                    price: isPremium ? price : 0
                })
            });

            if (res.status === 401) {
                toast.error("로그인이 필요합니다");
                router.push('/login');
                return;
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to publish');
            }

            toast.success("전략이 성공적으로 게시되었습니다!");
            router.push('/dashboard/marketplace');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setPublishing(false);
        }
    };

    const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);

    return (
        <div className="container mx-auto py-6 max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/strategy-lab">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">전략 게시</h1>
                    <p className="text-muted-foreground">마켓플레이스에 전략을 공유하세요</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>게시할 전략 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                        <SelectTrigger>
                            <SelectValue placeholder="전략을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            {strategies.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name} {s.is_public && <Badge variant="outline" className="ml-2">Published</Badge>}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedStrategy && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">{selectedStrategy.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedStrategy.type}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>게시 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">제목 *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="전략 제목을 입력하세요"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">설명</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="전략에 대한 설명을 입력하세요"
                            rows={4}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>태그</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="gap-1">
                                    {tag}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                                </Badge>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {PRESET_TAGS.filter(t => !tags.includes(t)).map(tag => (
                                <Badge 
                                    key={tag} 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => handleAddTag(tag)}
                                >
                                    + {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        가격 설정
                    </CardTitle>
                    <CardDescription>무료로 공유하거나 유료로 판매할 수 있습니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>유료 전략</Label>
                            <p className="text-xs text-muted-foreground">활성화하면 가격을 설정할 수 있습니다</p>
                        </div>
                        <Switch checked={isPremium} onCheckedChange={setIsPremium} />
                    </div>

                    {isPremium && (
                        <div className="space-y-2">
                            <Label htmlFor="price">가격 (USD)</Label>
                            <Input
                                id="price"
                                type="number"
                                min={0}
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground">
                                ※ 결제 시스템은 추후 연동 예정입니다
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Button 
                className="w-full" 
                size="lg" 
                onClick={handlePublish}
                disabled={publishing || !selectedStrategyId || !title.trim()}
            >
                <Upload className="mr-2 h-4 w-4" />
                {publishing ? "게시 중..." : "마켓플레이스에 게시"}
            </Button>
        </div>
    );
}
