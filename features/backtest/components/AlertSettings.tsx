'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Webhook, Save } from 'lucide-react';
import { AlertConfig, sendBrowserNotification } from '@/features/backtest/lib/realtime/notification';
import { toast } from 'sonner';

const STORAGE_KEY = 'quant_live_notification_config';

interface AlertSettingsProps {
    defaultConfig?: AlertConfig;
    onSave?: (config: AlertConfig) => void;
}

export function AlertSettings({ defaultConfig, onSave }: AlertSettingsProps = {}) {
    const [config, setConfig] = useState<AlertConfig>({
        type: 'webhook',
        url: '',
        enableBrowser: false,
        ...defaultConfig
    });

    useEffect(() => {
        // Load local storage if no default config or just to sync
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setConfig(prev => ({ ...prev, ...parsed }));
                if (onSave) onSave({ ...config, ...parsed }); // Notify parent of loaded config
            } catch (e) {
                console.error('Failed to parse notification config', e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

        if (onSave) {
            onSave(config);
        }

        toast.success('Settings saved successfully');

        // Test notification permission if enabled
        if (config.enableBrowser) {
            if ('Notification' in window) {
                Notification.requestPermission().then((permission) => {
                    if (permission !== 'granted') {
                        toast.warning('Browser notifications are not permitted by the system');
                    }
                });
            }
        }
    };

    const testNotification = async () => {
        if (config.enableBrowser) {
            await sendBrowserNotification('Test Notification', 'This is a test notification from Quant Live.');
        }
        toast.info('Test alert triggered (check browser/webhook)');
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Settings
                </CardTitle>
                <CardDescription>
                    Configure how you want to be alerted when trading signals occur.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Browser Notifications */}
                <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                        <Label className="text-base">Browser Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                            Receive alerts directly in your browser while the tab is open.
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
                                Send alerts to Discord, Slack, or any custom webhook URL.
                            </p>
                        </div>
                    </div>

                    <div className="ml-1 pl-4 border-l-2 border-muted space-y-2">
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <Input
                            id="webhook-url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={config.url}
                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Leave empty to disable webhook alerts.</p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={testNotification}>
                        Test Alert
                    </Button>
                    <Button onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" /> Save Settings
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
