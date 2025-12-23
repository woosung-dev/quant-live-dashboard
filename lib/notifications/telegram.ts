/**
 * Telegram Notification Service
 * @description Send trading signals to Telegram using Bot API
 */

export interface TelegramConfig {
    botToken: string;
    chatId: string;
}

export interface TelegramSignal {
    symbol: string;
    type: 'buy' | 'sell';
    price: number;
    reason: string;
    strategyName: string;
    timestamp?: number;
}

/**
 * Format signal for Telegram message
 */
export function formatSignalMessage(signal: TelegramSignal): string {
    const emoji = signal.type === 'buy' ? '🟢' : '🔴';
    const action = signal.type === 'buy' ? '매수' : '매도';

    const lines = [
        `${emoji} *${action} 시그널*`,
        '',
        `전략: *${signal.strategyName}*`,
        `심볼: \`${signal.symbol}\``,
        `가격: *$${signal.price.toLocaleString()}*`,
        `시간: ${new Date(signal.timestamp || Date.now()).toLocaleString('ko-KR')}`,
        '',
        `사유: ${signal.reason}`,
    ];

    return lines.join('\n');
}

/**
 * Send message to Telegram
 */
export async function sendTelegramMessage(
    chatId: string,
    message: string,
    botToken?: string
): Promise<{ success: boolean; error?: string }> {
    // Use server-side bot token from env if not provided
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        return {
            success: false,
            error: 'TELEGRAM_BOT_TOKEN is not configured'
        };
    }

    if (!chatId) {
        return {
            success: false,
            error: 'Chat ID is required'
        };
    }

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[Telegram] API error:', errorData);
            return {
                success: false,
                error: errorData.description || `HTTP ${response.status}`,
            };
        }

        return { success: true };
    } catch (error) {
        console.error('[Telegram] Send error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Send signal notification to Telegram
 */
export async function sendTelegramSignal(
    chatId: string,
    signal: TelegramSignal,
    botToken?: string
): Promise<{ success: boolean; error?: string }> {
    const message = formatSignalMessage(signal);
    return sendTelegramMessage(chatId, message, botToken);
}

/**
 * Test Telegram connection
 */
export async function testTelegramConnection(
    chatId: string,
    botToken?: string
): Promise<{ success: boolean; error?: string }> {
    const testMessage = [
        '🔔 *테스트 알림*',
        '',
        'Quant Live Dashboard에서 보낸 테스트 메시지입니다.',
        '텔레그램 알림이 정상적으로 작동합니다! ✅',
    ].join('\n');

    return sendTelegramMessage(chatId, testMessage, botToken);
}
