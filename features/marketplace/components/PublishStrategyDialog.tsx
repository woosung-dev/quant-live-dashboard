"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";

interface PublishStrategyDialogProps {
    strategyId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const COMMON_TAGS = [
    'scalping', 'swing', 'trend-following', 'mean-reversion',
    'breakout', 'btc', 'eth', 'altcoins', 'momentum', 'rsi', 'ema', 'macd'
];

export function PublishStrategyDialog({ strategyId, isOpen, onClose, onSuccess }: PublishStrategyDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const addCustomTag = () => {
        const tag = customTag.trim().toLowerCase();
        if (tag && !selectedTags.includes(tag)) {
            setSelectedTags([...selectedTags, tag]);
            setCustomTag('');
        }
    };

    const handlePublish = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/strategies/${strategyId}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    tags: selectedTags
                })
            });

            if (res.ok) {
                toast.success('Strategy published to marketplace!');
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to publish strategy');
            }
        } catch (e) {
            toast.error('Failed to publish strategy');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Publish Strategy to Marketplace</DialogTitle>
                    <DialogDescription>
                        Share your strategy with the community
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            placeholder="e.g., EMA Crossover Pro"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe your strategy..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label>Tags</Label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_TAGS.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => toggleTag(tag)}
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Selected Tags */}
                    {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedTags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    #{tag}
                                    <X
                                        className="w-3 h-3 ml-1 cursor-pointer"
                                        onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                                    />
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Custom Tag */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add custom tag..."
                            value={customTag}
                            onChange={(e) => setCustomTag(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                        />
                        <Button variant="outline" onClick={addCustomTag}>
                            Add
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handlePublish} disabled={submitting || !title.trim()}>
                        Publish
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
