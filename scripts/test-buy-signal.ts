#!/usr/bin/env npx tsx
/**
 * Test Telegram Signal Notification
 * Simulates a real buy signal alert
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
function loadEnv(filePath: string): Record<string, string> {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const env: Record<string, string> = {};
        content.split('\n').forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) return;
            const key = trimmed.slice(0, eqIndex).trim();
            let val = trimmed.slice(eqIndex + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            env[key] = val;
        });
        return env;
    } catch {
        return {};
    }
}

const envPath = path.resolve(process.cwd(), '.env.local');
const env = loadEnv(envPath);
for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) {
        process.env[key] = value;
    }
}

const chatId = process.argv[2] || '5506164898';
const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set');
    process.exit(1);
}

console.log(`\n🚀 Sending BUY signal notification to Telegram...`);
console.log(`📱 Chat ID: ${chatId}\n`);

async function getCurrentPrice(): Promise<number> {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const data = await response.json();
        return parseFloat(data.price);
    } catch {
        return 96234.50; // Fallback price
    }
}

async function sendBuySignal() {
    const currentPrice = await getCurrentPrice();

    const message = [
        '🟢 *매수 시그널*',
        '',
        '전략: *EMA Cross Strategy*',
        '심볼: `BTCUSDT`',
        `가격: *$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`,
        `시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
        '',
        '📊 *사유*',
        '• Fast EMA(12)가 Slow EMA(26)를 상향 돌파',
        '• RSI(14): 58.3 (중립 구간)',
        '• 거래량 급증: +45%',
        '',
        '💡 *추천 액션*',
        `• 진입가: $${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        `• 손절가: $${(currentPrice * 0.98).toLocaleString('en-US', { minimumFractionDigits: 2 })} (-2%)`,
        `• 목표가: $${(currentPrice * 1.05).toLocaleString('en-US', { minimumFractionDigits: 2 })} (+5%)`,
    ].join('\n');

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

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
            console.error('❌ Telegram API error:', errorData);
            process.exit(1);
        }

        const result = await response.json();
        console.log('✅ BUY signal sent successfully!');
        console.log(`📬 Message ID: ${result.result.message_id}`);
        console.log(`💰 Price: $${currentPrice.toLocaleString('en-US')}`);
        console.log('\n📱 Check your Telegram app!\n');
    } catch (error) {
        console.error('❌ Error sending signal:', error);
        process.exit(1);
    }
}

sendBuySignal();
