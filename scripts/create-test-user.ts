import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing environment variables!')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅' : '❌')
    process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createTestUser() {
    // 테스트 계정 정보
    const testEmail = 'test@quant.live'
    const testPassword = 'test123456'
    const testName = 'Test User'

    console.log('Creating test user...')
    console.log(`Email: ${testEmail}`)
    console.log(`Password: ${testPassword}`)

    try {
        // 이미 존재하는 사용자 확인
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users.users.find((u: any) => u.email === testEmail)

        if (existingUser) {
            console.log('⚠️  User already exists. Deleting...')
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
                existingUser.id
            )
            if (deleteError) {
                console.error('Error deleting existing user:', deleteError)
            }
        }

        // 이메일 확인이 완료된 새 사용자 생성
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true, // 이메일 자동 확인
            user_metadata: {
                full_name: testName,
            },
        })

        if (error) {
            console.error('❌ Error creating user:', error.message)
            process.exit(1)
        }

        console.log('✅ Test user created successfully!')
        console.log('User ID:', data.user.id)
        console.log('\n📝 Login credentials:')
        console.log(`Email: ${testEmail}`)
        console.log(`Password: ${testPassword}`)
        console.log('\n🔗 Login at: http://localhost:3000/en/login')
    } catch (err) {
        console.error('❌ Unexpected error:', err)
        process.exit(1)
    }
}

createTestUser()
