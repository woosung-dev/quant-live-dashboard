import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'quant_live_api_keys';

export interface EncryptedKeys {
    v: 1; // version
    data: string; // encrypted JSON string of { [exchangeId]: { apiKey, secret } }
}

export interface ApiKeyData {
    apiKey: string;
    secret: string;
}

export interface KeyMap {
    [exchangeId: string]: ApiKeyData;
}

export class SecurityManager {
    /**
     * Encrypts and saves API keys to LocalStorage
     * @param keys Map of exchange keys
     * @param passcode User provided passcode for encryption
     */
    static saveKeys(keys: KeyMap, passcode: string): void {
        const json = JSON.stringify(keys);
        const encrypted = CryptoJS.AES.encrypt(json, passcode).toString();

        const payload: EncryptedKeys = {
            v: 1,
            data: encrypted
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    /**
     * Loads and decrypts API keys from LocalStorage
     * @param passcode User provided passcode for decryption
     * @returns KeyMap or null if invalid passcode/no data
     */
    static loadKeys(passcode: string): KeyMap | null {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        try {
            const payload: EncryptedKeys = JSON.parse(stored);

            // Decrypt
            const bytes = CryptoJS.AES.decrypt(payload.data, passcode);
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedData) return null; // Wrong passcode usually results in empty string

            return JSON.parse(decryptedData);
        } catch (e) {
            console.error("Failed to decrypt keys", e);
            return null;
        }
    }

    /**
     * Check if keys exist in storage (without decrypting)
     */
    static hasSavedKeys(): boolean {
        return !!localStorage.getItem(STORAGE_KEY);
    }

    /**
     * Clear all keys
     */
    static clearKeys(): void {
        localStorage.removeItem(STORAGE_KEY);
    }
}
