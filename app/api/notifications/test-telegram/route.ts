import { NextRequest, NextResponse } from 'next/server';
import { testTelegramConnection } from '@/lib/notifications/telegram';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/test-telegram
 * Test telegram notification connection
 */
export async function POST(req: NextRequest) {
    try {
        const { chatId } = await req.json();

        if (!chatId) {
            return NextResponse.json(
                { success: false, error: 'Chat ID is required' },
                { status: 400 }
            );
        }

        const result = await testTelegramConnection(chatId);

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[API] Test telegram error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
