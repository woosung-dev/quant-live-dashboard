#!/usr/bin/env npx tsx
/**
 * Test Telegram Integration
 * Usage: npx tsx scripts/test-telegram.ts <CHAT_ID>
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
// Only assign env vars that are not already set
for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) {
        process.env[key] = value;
    }
}

const chatId = process.argv[2];

if (!chatId) {
    console.error('❌ Chat ID is required');
    console.log('Usage: npx tsx scripts/test-telegram.ts <CHAT_ID>');
    process.exit(1);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env.local');
    process.exit(1);
}

console.log(`\n🔄 Testing Telegram notification...`);
console.log(`📱 Chat ID: ${chatId}`);
console.log(`🤖 Bot Token: ${botToken.slice(0, 10)}***\n`);

// Test message
const testMessage = [
    '🟢 *매수 시그널*',
    '',
    '전략: *Test Strategy*',
    '심볼: `BTCUSDT`',
    '가격: *$96,234*',
    `시간: ${new Date().toLocaleString('ko-KR')}`,
    '',
    '사유: This is a test message from the Telegram integration test script.',
].join('\n');

async function sendTestMessage() {
    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: testMessage,
                parse_mode: 'Markdown',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Telegram API error:', errorData);
            process.exit(1);
        }

        const result = await response.json();
        console.log('✅ Test message sent successfully!');
        console.log(`📬 Message ID: ${result.result.message_id}`);
        console.log('\nCheck your Telegram app to see the message.\n');
    } catch (error) {
        console.error('❌ Error sending test message:', error);
        process.exit(1);
    }
}

sendTestMessage();
