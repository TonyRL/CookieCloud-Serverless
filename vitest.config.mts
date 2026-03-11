import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
    test: {
        coverage: {
            provider: 'istanbul',
            include: ['src/**/*.ts'],
        },
        poolOptions: {
            workers: {
                wrangler: {
                    configPath: './wrangler.jsonc',
                },
            },
        },
    },
});
