const fs = require('fs');
const path = require('path');
const nodeCrypto = require('crypto');

// Manual parser for .env files
function loadEnv(filePath: string) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const env: Record<string, string> = {};
        content.split('\n').forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const parts = trimmed.split('=');
            const key = parts[0];
            const values = parts.slice(1);

            if (key && values.length > 0) {
                // Remove quotes if present
                let val = values.join('=');
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                env[key.trim()] = val.trim();
            }
        });
        return env;
    } catch (e) {
        return {};
    }
}

// Load .env.local
const env = loadEnv(path.resolve(process.cwd(), '.env.local'));
// Merge into process.env so verify logic stays same
Object.assign(process.env, env);

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('🔍 Verifying Cloud Execution Environment...\n');

let hasError = false;

// 1. Check SERVER_ENCRYPTION_KEY
const key = process.env.SERVER_ENCRYPTION_KEY;
if (!key) {
    console.log(`${RED}❌ SERVER_ENCRYPTION_KEY is missing.${RESET}`);
    hasError = true;
} else if (key.length < 32) {
    console.log(`${RED}❌ SERVER_ENCRYPTION_KEY is too short (${key.length} chars). Must be at least 32 chars.${RESET}`);
    hasError = true;
} else {
    console.log(`${GREEN}✅ SERVER_ENCRYPTION_KEY is set.${RESET}`);

    // Test Encryption
    try {
        const ALGORITHM = 'aes-256-gcm';
        const textToEncrypt = 'TEST_SECRET_KEY';

        // Encrypt
        const iv = nodeCrypto.randomBytes(16);
        const cipher = nodeCrypto.createCipheriv(ALGORITHM, Buffer.from(key.slice(0, 32)), iv);
        let encrypted = cipher.update(textToEncrypt, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        console.log(`${GREEN}✅ Encryption test passed.${RESET}`);

        // Decrypt
        const decipher = nodeCrypto.createDecipheriv(ALGORITHM, Buffer.from(key.slice(0, 32)), iv);
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        if (decrypted === textToEncrypt) {
            console.log(`${GREEN}✅ Decryption test passed.${RESET}`);
        } else {
            console.log(`${RED}❌ Decryption failed: Output mismatch.${RESET}`);
            hasError = true;
        }

    } catch (e: any) {
        console.log(`${RED}❌ Encryption/Decryption failed: ${e.message}${RESET}`);
        hasError = true;
    }
}

// 2. Check SUPABASE_SERVICE_ROLE_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
    console.log(`${RED}❌ SUPABASE_SERVICE_ROLE_KEY is missing.${RESET}`);
    hasError = true;
} else if (!serviceKey.startsWith('eyJ')) {
    console.log(`${RED}❌ SUPABASE_SERVICE_ROLE_KEY seems invalid (should start with eyJ...).${RESET}`);
    hasError = true;
} else {
    console.log(`${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY is set.${RESET}`);
}

console.log('\n------------------------------------------------');
if (hasError) {
    console.log(`${RED}FAILED: Please check your .env.local file.${RESET}`);
    process.exit(1);
} else {
    console.log(`${GREEN}SUCCESS: Environment is ready for Cloud Execution! 🚀${RESET}`);
    process.exit(0);
}
