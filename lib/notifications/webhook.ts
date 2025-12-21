/**
 * Webhook Notification System
 * Send trading signals to Discord, Slack, and custom webhooks
 */

export interface WebhookPayload {
    type: 'signal' | 'alert' | 'backtest_complete';
    title: string;
    message: string;
    data?: {
        symbol?: string;
        signalType?: 'buy' | 'sell';
        price?: number;
        reason?: string;
        strategyName?: string;
        profit?: number;
        timestamp?: number;
    };
}

export interface WebhookConfig {
    url: string;
    type: 'discord' | 'slack' | 'custom';
    enabled: boolean;
    name?: string;
}

/**
 * Format payload for Discord webhook
 */
function formatDiscordPayload(payload: WebhookPayload): object {
    const color = payload.data?.signalType === 'buy' ? 0x00ff94 :
        payload.data?.signalType === 'sell' ? 0xff0055 : 0x5865F2;

    const fields = [];

    if (payload.data?.symbol) {
        fields.push({ name: '📊 Symbol', value: payload.data.symbol, inline: true });
    }
    if (payload.data?.signalType) {
        fields.push({
            name: '📈 Signal',
            value: payload.data.signalType.toUpperCase(),
            inline: true
        });
    }
    if (payload.data?.price) {
        fields.push({
            name: '💰 Price',
            value: `$${payload.data.price.toLocaleString()}`,
            inline: true
        });
    }
    if (payload.data?.reason) {
        fields.push({ name: '📝 Reason', value: payload.data.reason, inline: false });
    }
    if (payload.data?.profit !== undefined) {
        const profitStr = payload.data.profit >= 0
            ? `+$${payload.data.profit.toLocaleString()}`
            : `-$${Math.abs(payload.data.profit).toLocaleString()}`;
        fields.push({ name: '💵 Profit', value: profitStr, inline: true });
    }

    return {
        embeds: [{
            title: payload.title,
            description: payload.message,
            color: color,
            fields: fields,
            footer: {
                text: 'QUANT.LIVE',
            },
            timestamp: new Date(payload.data?.timestamp || Date.now()).toISOString(),
        }],
    };
}

/**
 * Format payload for Slack webhook
 */
function formatSlackPayload(payload: WebhookPayload): object {
    const emoji = payload.data?.signalType === 'buy' ? '🟢' :
        payload.data?.signalType === 'sell' ? '🔴' : 'ℹ️';

    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: `${emoji} ${payload.title}`,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: payload.message,
            },
        },
    ];

    if (payload.data) {
        const fields = [];
        if (payload.data.symbol) {
            fields.push({ type: 'mrkdwn', text: `*Symbol:* ${payload.data.symbol}` });
        }
        if (payload.data.signalType) {
            fields.push({ type: 'mrkdwn', text: `*Signal:* ${payload.data.signalType.toUpperCase()}` });
        }
        if (payload.data.price) {
            fields.push({ type: 'mrkdwn', text: `*Price:* $${payload.data.price.toLocaleString()}` });
        }

        if (fields.length > 0) {
            blocks.push({
                type: 'section',
                // @ts-expect-error - Slack block kit fields
                fields: fields,
            });
        }
    }

    blocks.push({
        type: 'context',
        // @ts-expect-error - Slack block kit elements
        elements: [
            {
                type: 'mrkdwn',
                text: `Sent by QUANT.LIVE • ${new Date().toLocaleString('ko-KR')}`,
            },
        ],
    });

    return { blocks };
}

/**
 * Send webhook notification
 */
export async function sendWebhook(
    config: WebhookConfig,
    payload: WebhookPayload
): Promise<{ success: boolean; error?: string }> {
    if (!config.enabled) {
        return { success: false, error: 'Webhook is disabled' };
    }

    try {
        let body: object;

        switch (config.type) {
            case 'discord':
                body = formatDiscordPayload(payload);
                break;
            case 'slack':
                body = formatSlackPayload(payload);
                break;
            case 'custom':
            default:
                body = payload;
                break;
        }

        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Webhook] ${config.type} error:`, response.status, errorText);
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`
            };
        }

        return { success: true };
    } catch (error) {
        console.error('[Webhook] Send error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Send signal notification to multiple webhooks
 */
export async function broadcastSignal(
    configs: WebhookConfig[],
    signal: {
        symbol: string;
        type: 'buy' | 'sell';
        price: number;
        reason: string;
        strategyName: string;
    }
): Promise<{ sent: number; failed: number }> {
    const enabledConfigs = configs.filter(c => c.enabled);

    if (enabledConfigs.length === 0) {
        return { sent: 0, failed: 0 };
    }

    const payload: WebhookPayload = {
        type: 'signal',
        title: `${signal.type === 'buy' ? '🟢 매수' : '🔴 매도'} 시그널`,
        message: `${signal.strategyName} 전략에서 ${signal.symbol} ${signal.type === 'buy' ? '매수' : '매도'} 시그널이 발생했습니다.`,
        data: {
            symbol: signal.symbol,
            signalType: signal.type,
            price: signal.price,
            reason: signal.reason,
            strategyName: signal.strategyName,
            timestamp: Date.now(),
        },
    };

    const results = await Promise.all(
        enabledConfigs.map(config => sendWebhook(config, payload))
    );

    return {
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
    };
}

/**
 * Send backtest completion notification
 */
export async function notifyBacktestComplete(
    configs: WebhookConfig[],
    result: {
        strategyName: string;
        symbol: string;
        netProfit: number;
        netProfitPercent: number;
        winRate: number;
        totalTrades: number;
    }
): Promise<{ sent: number; failed: number }> {
    const enabledConfigs = configs.filter(c => c.enabled);

    if (enabledConfigs.length === 0) {
        return { sent: 0, failed: 0 };
    }

    const profitEmoji = result.netProfit >= 0 ? '📈' : '📉';

    const payload: WebhookPayload = {
        type: 'backtest_complete',
        title: `${profitEmoji} 백테스트 완료`,
        message: [
            `**${result.strategyName}** 전략의 ${result.symbol} 백테스트가 완료되었습니다.`,
            ``,
            `• 수익: ${result.netProfit >= 0 ? '+' : ''}${result.netProfitPercent.toFixed(2)}%`,
            `• 승률: ${result.winRate.toFixed(1)}%`,
            `• 거래 수: ${result.totalTrades}회`,
        ].join('\n'),
        data: {
            symbol: result.symbol,
            strategyName: result.strategyName,
            profit: result.netProfit,
            timestamp: Date.now(),
        },
    };

    const results = await Promise.all(
        enabledConfigs.map(config => sendWebhook(config, payload))
    );

    return {
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
    };
}
