"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Share2, Lock, Globe } from "lucide-react";
import { updateStrategyVisibility } from "../lib/api";
import { toast } from "sonner";
import { Strategy } from "@/features/backtest/types";

interface ShareDialogProps {
    strategy: Strategy;
    onUpdate?: (updated: Partial<Strategy>) => void;
}

export function ShareDialog({ strategy, onUpdate }: ShareDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPublic, setIsPublic] = useState(strategy.isPublic || false);
    const [description, setDescription] = useState(strategy.description || "");
    const [tags, setTags] = useState(strategy.tags?.join(", ") || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const tagArray = tags.split(",").map(t => t.trim()).filter(Boolean);

        const success = await updateStrategyVisibility(
            strategy.id,
            isPublic,
            description,
            tagArray
        );

        if (success) {
            toast.success("Visibility updated successfully!");
            onUpdate?.({
                isPublic,
                description,
                tags: tagArray
            });
            setOpen(false);
        } else {
            toast.error("Failed to update visibility");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    {strategy.isPublic ? <Globe className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Strategy</DialogTitle>
                    <DialogDescription>
                        Publish your strategy to the Community Explorer.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                        <Label htmlFor="public-mode" className="flex flex-col space-y-1">
                            <span>Public Access</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Allow anyone to view and fork this strategy.
                            </span>
                        </Label>
                        <Switch
                            id="public-mode"
                            checked={isPublic}
                            onCheckedChange={setIsPublic}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Explain your strategy logic..."
                            value={description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tags">Tags (comma separated)</Label>
                        <Input
                            id="tags"
                            placeholder="BTC, Trend, RISKY"
                            value={tags}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
