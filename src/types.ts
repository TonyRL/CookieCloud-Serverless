export const CRYPTO_TYPES = ['legacy', 'aes-128-cbc-fixed'] as const;
export type CryptoType = (typeof CRYPTO_TYPES)[number];

export interface Bindings {
    DB: D1Database;
}

export interface Body {
    /**
     * Encrypted Data
     */
    encrypted: string;
    /**
     * E2E Encryption Password
     */
    password?: string;
    /**
     * User Key
     */
    uuid: string;
    /**
     * Encryption algorithm type
     */
    crypto_type?: CryptoType;
}

interface CookieData {
    domain: string;
    hostOnly: boolean;
    httpOnly: boolean;
    name: string;
    path: string;
    sameSite: string;
    secure: boolean;
    session: boolean;
    storeId: string;
    value: string;
}

export interface DatabaseSchema {
    created_at: number;
    crypto_type: CryptoType;
    encrypted: string;
    uuid: string;
}

export interface DecryptedData {
    cookie_data: {
        [key: string]: CookieData[];
    };
    local_storage_data: unknown;
    update_time: string;
}
