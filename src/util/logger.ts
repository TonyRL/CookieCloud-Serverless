type LogLevel = 'info' | 'error';
type Log = {
    level?: LogLevel;
    requestId: string;
    namespace?: string;
    message: string;
    d1meta?: D1Meta;
};

class Logger {
    apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    log({ level = 'info', requestId, namespace, message,  d1meta }: Log) {
        return fetch('https://events.baselime.io/v1/logs', {
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'x-service': 'cookiecloud-workers',
            },
            method: 'POST',
            body: JSON.stringify([{ level, namespace, requestId, message,  d1meta }]),
        });
    }

    info({ requestId, namespace, message,  d1meta }: Log) {
        return this.log({ level: 'info', namespace, requestId, message,  d1meta });
    }

    error({ requestId, namespace, message, cf, d1meta }: Log) {
        return this.log({ level: 'error', namespace, requestId, message,  d1meta });
    }
}

export default Logger;
