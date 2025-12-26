import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Only check environment variables at runtime in production
    // During build time, environment variables may not be available
    if (!supabaseUrl || !supabaseServiceKey) {
        // In production runtime, this is a critical error
        if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not defined')
        }
        // During build or in non-production, return a placeholder
        // This prevents build-time errors while ensuring runtime safety
        throw new Error('Supabase environment variables not configured')
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        }
    })
}

