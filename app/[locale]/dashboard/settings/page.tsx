'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiKeyManager } from '@/features/trade/components/ApiKeyManager';
import { supabase } from '@/lib/supabase';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingTelegram, setTestingTelegram] = useState(false);

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [telegramBotToken, setTelegramBotToken] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setEmail(user.email || '');

                // Load profile data
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, telegram_bot_token, telegram_chat_id')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setFullName(profile.full_name || '');
                    setTelegramBotToken(profile.telegram_bot_token || '');
                    setTelegramChatId(profile.telegram_chat_id || '');
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Update profile
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    telegram_bot_token: telegramBotToken,
                    telegram_chat_id: telegramChatId
                })
                .eq('id', user.id);

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Profile updated successfully',
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update profile',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTestTelegram = async () => {
        if (!telegramBotToken || !telegramChatId) {
            toast({
                title: 'Error',
                description: 'Please enter both Bot Token and Chat ID',
                variant: 'destructive',
            });
            return;
        }

        setTestingTelegram(true);
        try {
            const response = await fetch('/api/notifications/test-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botToken: telegramBotToken,
                    chatId: telegramChatId,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: 'Success',
                    description: 'Test message sent! Check your Telegram.',
                });
            } else {
                throw new Error(result.error || 'Failed to send test message');
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to send test message',
                variant: 'destructive',
            });
        } finally {
            setTestingTelegram(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* Account */}
            <section>
                <h2 className="text-xl font-bold mb-4">Account</h2>
                <Card className="p-6">
                    <div className="grid gap-4 max-w-sm">
                        <div>
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div>
                            <Label>Password</Label>
                            <button className="text-primary hover:underline text-sm">
                                Change Password
                            </button>
                        </div>
                        <Button onClick={handleSaveProfile} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </Card>
            </section>

            {/* API Keys */}
            <section>
                <ApiKeyManager />
            </section>

            {/* Notifications */}
            <section>
                <h2 className="text-xl font-bold mb-4">Notifications</h2>
                <Card className="p-6 space-y-6">
                    {/* General Notifications */}
                    <div>
                        <h3 className="font-medium mb-4">General</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">Trade Executions</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Get notified when a bot executes a trade
                                    </p>
                                </div>
                                <input type="checkbox" className="toggle" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">Daily Summary</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Receive a daily PnL report via email
                                    </p>
                                </div>
                                <input type="checkbox" className="toggle" />
                            </div>
                        </div>
                    </div>

                    {/* Telegram Settings */}
                    <div className="border-t pt-6">
                        <h3 className="font-medium mb-4">Telegram Integration</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="telegramBotToken">Bot Token</Label>
                                <Input
                                    id="telegramBotToken"
                                    value={telegramBotToken}
                                    onChange={(e) => setTelegramBotToken(e.target.value)}
                                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                                    type="password"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Get your bot token from{' '}
                                    <a
                                        href="https://t.me/botfather"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        @BotFather
                                    </a>
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="telegramChatId">Chat ID</Label>
                                <Input
                                    id="telegramChatId"
                                    value={telegramChatId}
                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                    placeholder="123456789"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Start a chat with your bot and get your Chat ID
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleTestTelegram}
                                    disabled={testingTelegram}
                                >
                                    {testingTelegram ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Test Telegram
                                        </>
                                    )}
                                </Button>
                                <Button onClick={handleSaveProfile} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
}
