
export interface AlertConfig {
    type: 'webhook';
    url: string;
    messageTemplate?: string; // e.g. "Signal {{type}} at {{price}}"
}

export interface AlertPayload {
    strategyName: string;
    symbol: string;
    timeframe: string;
    type: 'buy' | 'sell';
    price: number;
    time: number;
    message?: string;
}

/**
 * Sends a webhook notification
 */
export async function sendWebhookAlert(config: AlertConfig, payload: AlertPayload): Promise<boolean> {
    if (!config.url) return false;

    try {
        const body = {
            ...payload,
            timestamp: new Date().toISOString(),
            content: config.messageTemplate || `[${payload.strategyName}] ${payload.symbol} ${payload.type.toUpperCase()} @ ${payload.price}`
        };

        // For Slack/Discord compatibility, we might need specific formats
        // This is a generic JSON post
        const isDiscord = config.url.includes('discord');
        const isSlack = config.url.includes('slack');

        let finalBody: any = body;

        if (isDiscord) {
            finalBody = {
                content: body.content,
                embeds: [{
                    title: `${payload.symbol} Signal`,
                    description: `Strategy: ${payload.strategyName}\nType: **${payload.type.toUpperCase()}**\nPrice: ${payload.price}`,
                    color: payload.type === 'buy' ? 5763719 : 15548997 // Green / Red
                }]
            };
        } else if (isSlack) {
            finalBody = {
                text: body.content
            };
        }

        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(finalBody),
        });

        if (!response.ok) {
            console.error('Webhook failed:', response.status, response.statusText);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Webhook error:', error);
        return false;
    }
}
