import CryptoJS from 'crypto-js';
import { describe, expect, it } from 'vitest';

import { decrypt } from '../src/util/decrypt';

describe('decrypt', () => {
    const uuid = 'test-uuid';
    const password = 'test-password';
    const key = CryptoJS.MD5(`${uuid}-${password}`).toString().slice(0, 16);

    describe('legacy', () => {
        it('decrypts data encrypted with the same uuid and password', () => {
            const original = JSON.stringify({ cookie_data: {}, update_time: '2024-01-01' });
            const encrypted = CryptoJS.AES.encrypt(original, key).toString();

            const result = decrypt(uuid, encrypted, password);
            expect(result).toBe(original);
        });

        it('returns empty string with wrong password', () => {
            const original = 'test data';
            const encrypted = CryptoJS.AES.encrypt(original, key).toString();

            const result = decrypt(uuid, encrypted, 'wrong-password');
            expect(result).toBe('');
        });
    });

    describe('aes-128-cbc-fixed', () => {
        const fixedIv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
        const parsedKey = CryptoJS.enc.Utf8.parse(key);

        function encrypt(data: string) {
            const encrypted = CryptoJS.AES.encrypt(data, parsedKey, {
                iv: fixedIv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });
            return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
        }

        it('decrypts data encrypted with aes-128-cbc-fixed', () => {
            const original = JSON.stringify({ cookie_data: {}, update_time: '2024-01-01' });
            const encrypted = encrypt(original);

            const result = decrypt(uuid, encrypted, password, 'aes-128-cbc-fixed');
            expect(result).toBe(original);
        });

        it('returns empty string with wrong password', () => {
            const original = 'test data';
            const encrypted = encrypt(original);

            const result = decrypt(uuid, encrypted, 'wrong-password', 'aes-128-cbc-fixed');
            expect(result).toBe('');
        });

        it('cannot decrypt legacy data', () => {
            const original = 'test data';
            const legacyEncrypted = CryptoJS.AES.encrypt(original, key).toString();

            const result = decrypt(uuid, legacyEncrypted, password, 'aes-128-cbc-fixed');
            expect(result).not.toBe(original);
        });
    });
});
