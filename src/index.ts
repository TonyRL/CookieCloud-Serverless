import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { ungzip } from 'pako';
import { decrypt } from './util/decrypt';
import Logger from './util/logger';
import { Bindings, Body, DecryptedData } from './types';
import { insertOrReplaceData, populateData, selectData } from './model/data';

declare module 'hono' {
    interface ContextVariableMap {
        requestId: string;
        logger: Logger;
    }
}

const app = new Hono<{ Bindings: Bindings }>();
const decoder = new TextDecoder();

app.use(async (c, next) => {
    if (c.env.BASELIME_API_KEY) {
        const logger = new Logger(c.env.BASELIME_API_KEY);
        c.set('logger', logger);
    }
    c.set('requestId', crypto.randomUUID());
    await next();
});

app.use(cors());

app.onError(async (err, c) => {
    const logger = c.get('logger');
    await logger.error({
        requestId: c.get('requestId'),
        namespace: c.req.path,
        message: err.message,
    });
    return c.text('Internal Server Error', 500);
});

app.all('/', (c) => c.text('Hello World!'));

app.post(
    '/update',
    bodyLimit({
        maxSize: 1 * 1000 * 1000, // 1MB https://developers.cloudflare.com/d1/platform/limits/
        onError: (c) => c.text('Content Too Large', 413),
    }),
    async (c) => {
        const logger = c.get('logger');

        const gzipped = c.req.header('Content-Encoding') === 'gzip';
        const data = gzipped ? ungzip(await c.req.arrayBuffer()) : await c.req.json();

        const { encrypted, uuid }: Body = gzipped ? JSON.parse(decoder.decode(data)) : data;
        if (!encrypted || !uuid) {
            return c.text('Bad Request', 400);
        }

        const db = c.env.DB;
        await populateData(db, c);

        try {
            const info = await insertOrReplaceData(uuid, encrypted, db);
            await logger.info({
                requestId: c.get('requestId'),
                namespace: c.req.path,
                message: `Inserting data for ${uuid}`,
                d1meta: info.meta,
            });
        } catch (error) {
            await logger.error({
                requestId: c.get('requestId'),
                namespace: c.req.path,
                message: (error as Error).message,
            });

            return c.json({ action: 'error' });
        }

        return c.json({ action: 'done' });
    }
);

app.on(['GET', 'POST'], '/get/:uuid', async (c) => {
    const logger = c.get('logger');

    const { uuid } = c.req.param();
    if (!uuid) {
        return c.json({ error: 'Bad Request' }, 400);
    }

    const db = c.env.DB;
    await populateData(db, c);

    await logger.info({
        requestId: c.get('requestId'),
        namespace: c.req.path,
        message: `Fetching data for ${uuid}`,
    });

    const data = await selectData(uuid, db);
    if (!data) {
        await logger.error({
            requestId: c.get('requestId'),
            namespace: c.req.path,
            message: 'Data not found',
        });
        return c.text('Not Found', 404);
    }

    if (c.req.header('Content-Type') !== 'application/json') {
        return c.json({ encrypted: data.encrypted });
    }

    const body: Body = await c.req.json();
    const password = body.password;

    if (!password) {
        return c.json({ encrypted: data.encrypted });
    }

    return c.json(JSON.parse(decrypt(uuid, data.encrypted, password)) as DecryptedData);
});

export default app;
