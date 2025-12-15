'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, Webhook, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AlertConfig, sendBrowserNotification } from '@/features/backtest/lib/realtime/notification';
import { toast } from 'sonner';

const STORAGE_KEY = 'quant_live_notification_config';

interface AlertSettingsProps {
    defaultConfig?: AlertConfig;
    onSave?: (config: AlertConfig) => void;
}

export function AlertSettings({ defaultConfig, onSave }: AlertSettingsProps = {}) {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState<AlertConfig>({
        type: 'webhook',
        url: '',
        enableBrowser: false,
        ...defaultConfig
    });

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setConfig(prev => ({ ...prev, ...parsed }));
                if (onSave) onSave({ ...config, ...parsed });
            } catch (e) {
                console.error('Failed to parse notification config', e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        if (onSave) onSave(config);
        toast.success('Settings saved successfully');
        setOpen(false);

        if (config.enableBrowser && 'Notification' in window) {
            Notification.requestPermission().then((permission) => {
                if (permission !== 'granted') {
                    toast.warning('Browser notifications are not permitted by the system');
                }
            });
        }
    };

    const testNotification = async () => {
        if (config.enableBrowser) {
            await sendBrowserNotification('Test Notification', 'This is a test notification from Quant Live.');
        }
        toast.info('Test alert triggered');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notification Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure how you want to be alerted when trading signals occur.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Browser Notifications */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label className="text-base">Browser Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Alerts in your browser.
                            </p>
                        </div>
                        <Switch
                            checked={config.enableBrowser || false}
                            onCheckedChange={(checked) => setConfig({ ...config, enableBrowser: checked })}
                        />
                    </div>

                    {/* Webhook Notifications */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                                <Label className="text-base flex items-center gap-2">
                                    <Webhook className="w-4 h-4" /> Webhook Integration
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Send alerts to Discord/Slack.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="webhook-url">Webhook URL</Label>
                            <Input
                                id="webhook-url"
                                placeholder="https://discord.com/api/webhooks/..."
                                value={config.url}
                                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-between">
                    <Button variant="outline" onClick={testNotification}>Test Alert</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
