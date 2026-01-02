"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Unlock, Zap, Trash2, CheckCircle2, Cloud, HardDrive } from "lucide-react";
import { SecurityManager, KeyMap } from "../lib/security";
import { ExchangeService, ExchangeId } from "../lib/exchange";
import { toast } from "sonner";

interface ApiKeyManagerProps {
    onKeysChange?: (hasKeys: boolean) => void;
}

export function ApiKeyManager({ onKeysChange }: ApiKeyManagerProps) {
    const t = useTranslations('KeyManager');
    const [passcode, setPasscode] = useState("");
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [keys, setKeys] = useState<KeyMap>({});
    const [cloudKeys, setCloudKeys] = useState<{ exchange: string; configured: boolean }[]>([]);

    // Form State
    const [selectedExchange, setSelectedExchange] = useState<ExchangeId>('binance');
    const [apiKey, setApiKey] = useState("");
    const [secret, setSecret] = useState("");
    const [testnet, setTestnet] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initial Check for Local Keys
    useEffect(() => {
        const hasKeys = SecurityManager.hasSavedKeys();
        if (hasKeys) {
            // Prompt unlock
        }
    }, []);

    // Initial Fetch for Cloud Keys
    const fetchCloudKeys = useCallback(async () => {
        try {
            const res = await fetch('/api/settings/keys');
            if (res.ok) {
                const data = await res.json();
                setCloudKeys(data.keys || []);
            }
        } catch (e) {
            console.error("Failed to fetch cloud keys", e);
        }
    }, []);

    useEffect(() => {
        fetchCloudKeys();
    }, [fetchCloudKeys]);

    const handleUnlock = () => {
        if (!passcode) return;
        const loadedKeys = SecurityManager.loadKeys(passcode);
        if (loadedKeys) {
            setKeys(loadedKeys);
            setIsUnlocked(true);
            toast.success("Local keys unlocked");
            onKeysChange?.(true);
        } else {
            toast.error("Invalid passcode");
        }
    };

    const handleInitialSetup = () => {
        if (!passcode || passcode.length < 4) {
            toast.error("Passcode must be >= 4 chars");
            return;
        }
        setIsUnlocked(true);
        setKeys({});
    };

    const handleSaveKeyLocal = async () => {
        if (!validateForm()) return;
        setLoading(true);
        if (await validateConnection()) {
            const newKeys = {
                ...keys,
                [selectedExchange]: { apiKey, secret } // Add testnet flag in future
            };
            SecurityManager.saveKeys(newKeys, passcode);
            setKeys(newKeys);
            resetForm();
            toast.success(`Saved locally for ${selectedExchange}`);
        }
        setLoading(false);
    };

    const handleSaveKeyCloud = async () => {
        if (!validateForm()) return;
        setLoading(true);

        // 1. Validate Connection locally first (sanity check)
        // Note: validating with client-side CCXT is good, but we are sending to server.
        // It confirms keys are valid before encryption.
        if (await validateConnection()) {
            try {
                const res = await fetch('/api/settings/keys', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exchange: selectedExchange,
                        apiKey,
                        secret
                    })
                });

                if (!res.ok) throw new Error("Server failed to save");

                toast.success("Keys encrypted & saved to Cloud!");
                fetchCloudKeys();
                resetForm();
            } catch (e) {
                toast.error("Failed to save to cloud");
            }
        }
        setLoading(false);
    };

    const validateForm = () => {
        if (!apiKey || !secret) {
            toast.error("Fill in API Key and Secret");
            return false;
        }
        return true;
    };

    const validateConnection = async () => {
        const service = new ExchangeService();
        try {
            const connected = await service.connect({ id: selectedExchange, apiKey, secret, testnet });
            if (!connected) return false;
            const valid = await service.validateConnection();
            if (!valid) {
                toast.error("Invalid API credentials");
                return false;
            }
            return true;
        } catch (e) {
            toast.error("Validation error");
            return false;
        }
    };

    const handleRemoveKeyLocal = (id: string) => {
        const newKeys = { ...keys };
        delete newKeys[id];
        setKeys(newKeys);
        SecurityManager.saveKeys(newKeys, passcode);
        toast.info("Local key removed");
    };

    const handleRemoveKeyCloud = async (exchange: string) => {
        try {
            await fetch(`/api/settings/keys?exchange=${exchange}`, { method: 'DELETE' });
            toast.info("Cloud key removed");
            fetchCloudKeys();
        } catch (e) {
            toast.error("Failed to remove cloud key");
        }
    };

    const resetForm = () => {
        setApiKey("");
        setSecret("");
    };

    const handleLock = () => {
        setIsUnlocked(false);
        setKeys({});
        setPasscode("");
    };

    const hasStoredLocalKeys = SecurityManager.hasSavedKeys();

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    {t('title')}
                </CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="local" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="local" className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4" />
                            {t('localTab')}
                        </TabsTrigger>
                        <TabsTrigger value="cloud" className="flex items-center gap-2">
                            <Cloud className="w-4 h-4" />
                            {t('cloudTab')}
                        </TabsTrigger>
                    </TabsList>

                    {/* LOCAL TAB */}
                    <TabsContent value="local" className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-md mb-4 border border-dashed">
                            <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t.raw('localInfo') }} />
                        </div>

                        {!isUnlocked ? (
                            <div className="space-y-4 max-w-sm mx-auto py-4">
                                <Label>{hasStoredLocalKeys ? t('unlockPrompt') : t('initPrompt')}</Label>
                                <Input
                                    type="password"
                                    value={passcode}
                                    onChange={e => setPasscode(e.target.value)}
                                    placeholder={t('enterPasscode')}
                                    onKeyDown={e => e.key === 'Enter' && (hasStoredLocalKeys ? handleUnlock() : handleInitialSetup())}
                                />
                                <Button className="w-full" onClick={hasStoredLocalKeys ? handleUnlock : handleInitialSetup}>
                                    {hasStoredLocalKeys ? t('unlockVault') : t('setPasscode')}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Local Keys List */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>{t('activeConnections')}</Label>
                                        <Button variant="ghost" size="sm" onClick={handleLock} className="h-6 text-xs">
                                            {t('lock')}
                                        </Button>
                                    </div>
                                    {Object.entries(keys).map(([id, data]) => (
                                        <div key={id} className="flex items-center justify-between p-3 border rounded-md bg-green-500/10 border-green-500/20">
                                            <Badge variant="outline">{id}</Badge>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveKeyLocal(id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    {Object.keys(keys).length === 0 && <p className="text-sm text-muted-foreground">{t('noLocalKeys')}</p>}
                                </div>

                                {/* Form */}
                                <div className="border-t pt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Select value={selectedExchange} onValueChange={(v) => setSelectedExchange(v as ExchangeId)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="binance">Binance</SelectItem>
                                                <SelectItem value="bybit">Bybit</SelectItem>
                                                <SelectItem value="okx">OKX</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center space-x-2">
                                            <Switch id="local-testnet" checked={testnet} onCheckedChange={setTestnet} />
                                            <Label htmlFor="local-testnet">{t('testnet')}</Label>
                                        </div>
                                    </div>
                                    <Input placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                                    <Input type="password" placeholder="Secret" value={secret} onChange={e => setSecret(e.target.value)} />
                                    <Button className="w-full" onClick={handleSaveKeyLocal} disabled={loading}>
                                        {loading ? t('verifying') : t('saveLocally')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* CLOUD TAB */}
                    <TabsContent value="cloud" className="space-y-4">
                        <div className="bg-blue-500/10 p-4 rounded-md mb-4 border border-blue-500/20">
                            <p className="text-sm text-blue-400" dangerouslySetInnerHTML={{ __html: t.raw('cloudInfo') }} />
                        </div>

                        {/* Cloud Keys List */}
                        <div className="space-y-2">
                            <Label>{t('cloudConnections')}</Label>
                            {cloudKeys.map((k) => (
                                <div key={k.exchange} className="flex items-center justify-between p-3 border rounded-md bg-blue-500/10 border-blue-500/20">
                                    <Badge variant="outline" className="border-blue-500 text-blue-400">{k.exchange}</Badge>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveKeyCloud(k.exchange)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                            {cloudKeys.length === 0 && <p className="text-sm text-muted-foreground">{t('noCloudKeys')}</p>}
                        </div>

                        {/* Form */}
                        <div className="border-t pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Select value={selectedExchange} onValueChange={(v) => setSelectedExchange(v as ExchangeId)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="binance">Binance</SelectItem>
                                        <SelectItem value="bybit">Bybit</SelectItem>
                                        <SelectItem value="okx">OKX</SelectItem>
                                    </SelectContent>
                                </Select>
                                {/* Cloud Testnet logic pending schema update, hidden for now or assumed false */}
                            </div>
                            <Input placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                            <Input type="password" placeholder="Secret" value={secret} onChange={e => setSecret(e.target.value)} />
                            <Button className="w-full" variant="secondary" onClick={handleSaveKeyCloud} disabled={loading}>
                                {loading ? t('encrypting') : t('encryptAndUpload')}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
