import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { ungzip } from 'pako';

import { insertOrReplaceData, populateData, selectData } from './model/data';
import { Bindings, Body, CRYPTO_TYPES, CryptoType, DecryptedData } from './types';
import { decrypt } from './util/decrypt';

const app = new Hono<{ Bindings: Bindings }>();
const decoder = new TextDecoder();

app.use(cors());

app.onError((err, c) => {
    console.error(c.req.path, err.message);
    return c.text('Internal Server Error', 500);
});

app.all('/', (c) => c.text('Hello World!'));

app.get('/health', (c) =>
    c.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
    }),
);

app.post(
    '/update',
    bodyLimit({
        maxSize: 1 * 1000 * 1000, // 1MB (max 2MB/per row) https://developers.cloudflare.com/d1/platform/limits/
        onError: (c) => c.text('Content Too Large', 413),
    }),
    async (c) => {
        const gzipped = c.req.header('Content-Encoding') === 'gzip';
        const body: Body = gzipped ? JSON.parse(decoder.decode(ungzip(new Uint8Array(await c.req.arrayBuffer())))) : await c.req.json();

        const { encrypted, uuid, crypto_type = 'legacy' } = body;
        if (!encrypted || !uuid || !CRYPTO_TYPES.includes(crypto_type)) {
            return c.text('Bad Request', 400);
        }

        const db = c.env.DB;
        await populateData(db);

        try {
            const info = await insertOrReplaceData(uuid, encrypted, crypto_type, db);
            console.log(c.req.path, `Inserting data for ${uuid}`, info.meta);
        } catch (error) {
            console.error(c.req.path, (error as Error).message);
            return c.json({ action: 'error' });
        }

        return c.json({ action: 'done' });
    },
);

app.on(['GET', 'POST'], '/get/:uuid', async (c) => {
    const { uuid } = c.req.param();

    const db = c.env.DB;
    await populateData(db);

    console.log(c.req.path, `Fetching data for ${uuid}`);

    const data = await selectData(uuid, db);
    if (!data) {
        console.error(c.req.path, 'Data not found');
        return c.text('Not Found', 404);
    }

    if (c.req.header('Content-Type') !== 'application/json') {
        return c.json({ encrypted: data.encrypted, crypto_type: data.crypto_type });
    }

    const body: Body = await c.req.json();
    const password = body.password;

    if (!password) {
        return c.json({ encrypted: data.encrypted, crypto_type: data.crypto_type });
    }

    const cryptoType: CryptoType = (c.req.query('crypto_type') as CryptoType) || data.crypto_type || 'legacy';
    const decrypted = decrypt(uuid, data.encrypted, password, cryptoType);
    if (!decrypted) {
        return c.json({ error: 'Decryption failed' }, 401);
    }

    return c.json(JSON.parse(decrypted) as DecryptedData);
});

export default app;
