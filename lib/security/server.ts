import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import 'server-only';

const ALGORITHM = 'aes-256-gcm';
const SERVER_KEY = process.env.SERVER_ENCRYPTION_KEY;

if (!SERVER_KEY) {
    console.warn("SERVER_ENCRYPTION_KEY is not set in environment variables. Encryption will fail.");
}

interface EncryptedData {
    encrypted: string;
    iv: string;
    tag: string; // GCM auth tag
}

export class ServerSecurity {
    /**
     * Encrypts text using AES-256-GCM
     */
    static encrypt(text: string): { encrypted: string; iv: string } {
        if (!SERVER_KEY) throw new Error("SERVER_ENCRYPTION_KEY missing");

        // Key must be 32 bytes. If longer/shorter, we might need to hash it or enforce it.
        // Assuming SERVER_KEY is a 32-char string or hex. 
        // Better: SERVER_KEY should be a 32-byte hex string or generic string we hash to 32 bytes.
        // Let's simpler: Hash the provided key to ensure 32 bytes.
        const key = Buffer.from(SERVER_KEY, 'utf-8');
        // Actually, let's normalize the key to 32 bytes using sha256
        const key32 = Buffer.from(
            require('crypto').createHash('sha256').update(SERVER_KEY).digest()
        );

        const iv = randomBytes(12); // GCM standard IV size
        const cipher = createCipheriv(ALGORITHM, key32, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag().toString('hex');

        // We store auth tag appended to encrypted string or separate?
        // Schema has `secret_encrypted` and `iv`. It doesn't have `tag`. 
        // GCM normally requries Tag.
        // Strategy: Append Tag to encrypted output -> "encrypted:tag"

        return {
            encrypted: `${encrypted}:${tag}`,
            iv: iv.toString('hex')
        };
    }

    /**
     * Decrypts text using AES-256-GCM
     */
    static decrypt(encryptedWithTag: string, ivHex: string): string {
        if (!SERVER_KEY) throw new Error("SERVER_ENCRYPTION_KEY missing");

        const key32 = Buffer.from(
            require('crypto').createHash('sha256').update(SERVER_KEY).digest()
        );

        const [encrypted, tag] = encryptedWithTag.split(':');
        if (!encrypted || !tag) throw new Error("Invalid encrypted format");

        const decipher = createDecipheriv(
            ALGORITHM,
            key32,
            Buffer.from(ivHex, 'hex')
        );

        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}
