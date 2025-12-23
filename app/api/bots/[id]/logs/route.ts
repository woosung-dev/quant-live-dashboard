import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params for pagination
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const level = searchParams.get('level'); // Filter by level

    // Verify bot ownership
    const { data: bot, error: botError } = await supabase
        .from('bot_instances')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (botError || !bot) {
        return NextResponse.json({ error: 'Bot not found or unauthorized' }, { status: 404 });
    }

    // Build query
    let query = supabase
        .from('bot_logs')
        .select('*', { count: 'exact' })
        .eq('bot_id', id)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

    if (level) {
        query = query.eq('level', level);
    }

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        logs: data || [],
        total: count || 0,
        limit,
        offset
    });
}
