export interface Bindings {
    DB: D1Database;
    BASELIME_API_KEY: string;
    [key: string]: any;
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

export interface SQLite_Master {
    type: string;
    name: string;
    tbl_name: string;
    rootpage: number;
    sql: string;
}
