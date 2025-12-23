import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramSignal, TelegramSignal } from '@/lib/notifications/telegram';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/send-telegram
 * Send signal notification to Telegram
 */
export async function POST(req: NextRequest) {
    try {
        const { chatId, signal } = await req.json() as {
            chatId: string;
            signal: TelegramSignal;
        };

        if (!chatId) {
            return NextResponse.json(
                { success: false, error: 'Chat ID is required' },
                { status: 400 }
            );
        }

        if (!signal) {
            return NextResponse.json(
                { success: false, error: 'Signal data is required' },
                { status: 400 }
            );
        }

        const result = await sendTelegramSignal(chatId, signal);

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[API] Send telegram error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
