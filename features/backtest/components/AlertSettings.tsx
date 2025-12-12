"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, TestTube } from "lucide-react";
import { AlertConfig, sendWebhookAlert } from "../lib/realtime/notification";
import { useToast } from "@/components/ui/use-toast";

interface AlertSettingsProps {
    onSave: (config: AlertConfig) => void;
    defaultConfig?: AlertConfig;
}

export function AlertSettings({ onSave, defaultConfig }: AlertSettingsProps) {
    const [open, setOpen] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState(defaultConfig?.url || "");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSave = () => {
        if (!webhookUrl) return;
        onSave({
            type: "webhook",
            url: webhookUrl,
        });
        setOpen(false);
    };

    const handleTest = async () => {
        if (!webhookUrl) return;
        setIsLoading(true);
        try {
            const success = await sendWebhookAlert(
                { type: "webhook", url: webhookUrl },
                {
                    strategyName: "Test Strategy",
                    symbol: "BTCUSDT",
                    timeframe: "1m",
                    type: "buy",
                    price: 99999,
                    time: Date.now(),
                }
            );

            if (success) {
                toast({
                    title: "Test Alert Sent",
                    description: "Please check your webhook destination.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Test Failed",
                    description: "Could not send webhook. Check URL and CORS.",
                });
            }
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Bell className="h-4 w-4" />
                    Alerts
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Alert Settings</DialogTitle>
                    <DialogDescription>
                        Configure webhook URL to receive real-time trading signals.
                        Supports Slack, Discord, and generic webhooks.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="webhook" className="text-right">
                            Webhook URL
                        </Label>
                        <Input
                            id="webhook"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://hooks.slack.com/..."
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={handleTest} disabled={!webhookUrl || isLoading}>
                        <TestTube className="mr-2 h-4 w-4" />
                        Test
                    </Button>
                    <Button type="submit" onClick={handleSave}>Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
