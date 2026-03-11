import { SELF } from 'cloudflare:test';
import CryptoJS from 'crypto-js';
import { describe, expect, it } from 'vitest';

describe('CookieCloud Worker', () => {
    it('responds with Hello World on /', async () => {
        const response = await SELF.fetch('http://localhost/');
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('Hello World!');
    });

    describe('GET /health', () => {
        it('returns status OK with timestamp', async () => {
            const response = await SELF.fetch('http://localhost/health');
            expect(response.status).toBe(200);
            const body = (await response.json()) as { status: string; timestamp: string };
            expect(body.status).toBe('OK');
            expect(body.timestamp).toBeTruthy();
        });
    });

    describe('POST /update', () => {
        it('returns 400 when body is missing required fields', async () => {
            const response = await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            expect(response.status).toBe(400);
        });

        it('stores encrypted data and returns done', async () => {
            const uuid = crypto.randomUUID();
            const response = await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid, encrypted: 'test-encrypted-data' }),
            });
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ action: 'done' });
        });

        it('stores data with crypto_type', async () => {
            const uuid = crypto.randomUUID();
            const response = await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid, encrypted: 'test-data', crypto_type: 'aes-128-cbc-fixed' }),
            });
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ action: 'done' });

            const getResponse = await SELF.fetch(`http://localhost/get/${uuid}`);
            expect(await getResponse.json()).toEqual({
                encrypted: 'test-data',
                crypto_type: 'aes-128-cbc-fixed',
            });
        });

        it('defaults crypto_type to legacy', async () => {
            const uuid = crypto.randomUUID();
            await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid, encrypted: 'test-data' }),
            });

            const response = await SELF.fetch(`http://localhost/get/${uuid}`);
            expect(await response.json()).toEqual({
                encrypted: 'test-data',
                crypto_type: 'legacy',
            });
        });

        it('rejects payloads over 1MB', async () => {
            const response = await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'x'.repeat(1_000_001),
            });
            expect(response.status).toBe(413);
        });
    });

    describe('GET /get/:uuid', () => {
        it('returns 404 for non-existent uuid', async () => {
            const response = await SELF.fetch(`http://localhost/get/${crypto.randomUUID()}`);
            expect(response.status).toBe(404);
        });

        it('returns encrypted data with crypto_type after storing it', async () => {
            const uuid = crypto.randomUUID();
            const encrypted = 'some-encrypted-payload';

            await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid, encrypted }),
            });

            const response = await SELF.fetch(`http://localhost/get/${uuid}`);
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ encrypted, crypto_type: 'legacy' });
        });

        it('returns encrypted data when POST has no password', async () => {
            const uuid = crypto.randomUUID();
            const encrypted = 'some-payload';

            await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid, encrypted }),
            });

            const response = await SELF.fetch(`http://localhost/get/${uuid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ encrypted, crypto_type: 'legacy' });
        });

        it('decrypts data when POST includes password (legacy)', async () => {
            const uuid = crypto.randomUUID();
            const password = 'test-password';
            const key = CryptoJS.MD5(`${uuid}-${password}`).toString().slice(0, 16);
            const original = { cookie_data: {}, local_storage_data: null, update_time: '2024-01-01' };
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(original), key).toString();

            await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid, encrypted }),
            });

            const response = await SELF.fetch(`http://localhost/get/${uuid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(original);
        });

        it('decrypts data with crypto_type query param override', async () => {
            const uuid = crypto.randomUUID();
            const password = 'test-password';
            const key = CryptoJS.MD5(`${uuid}-${password}`).toString().slice(0, 16);
            const fixedIv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
            const original = { cookie_data: {}, local_storage_data: null, update_time: '2024-01-01' };
            const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(original), CryptoJS.enc.Utf8.parse(key), {
                iv: fixedIv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });
            const encrypted = ciphertext.ciphertext.toString(CryptoJS.enc.Base64);

            // Store as legacy (wrong type on purpose)
            await SELF.fetch('http://localhost/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid, encrypted, crypto_type: 'legacy' }),
            });

            // Override with query param to use the correct algorithm
            const response = await SELF.fetch(`http://localhost/get/${uuid}?crypto_type=aes-128-cbc-fixed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(original);
        });
    });
});
