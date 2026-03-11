import { CryptoType, DatabaseSchema, SQLite_Master } from '../types';

const checkSqliteMasterStmt = (db: D1Database) => db.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?');

export const populateData = async (db: D1Database): Promise<void> => {
    const dataTableExist = await checkSqliteMasterStmt(db).bind('table', 'data').first<SQLite_Master>();
    if (dataTableExist) {
        // Migrate: add crypto_type column for existing tables
        try {
            await db.prepare("ALTER TABLE data ADD COLUMN crypto_type TEXT DEFAULT 'legacy'").run();
            console.log('Migrated data table: added crypto_type column');
        } catch {
            // Column already exists
        }
    } else {
        const info = await db.prepare("CREATE TABLE IF NOT EXISTS data (uuid TEXT PRIMARY KEY, encrypted TEXT, crypto_type TEXT DEFAULT 'legacy', created_at INTEGER)").run();
        console.log('Populating data table', info.meta);
    }
};

export const insertOrReplaceData = (uuid: string, encrypted: string, cryptoType: CryptoType, db: D1Database): Promise<D1Response> =>
    db.prepare('INSERT OR REPLACE INTO data (uuid, encrypted, crypto_type, created_at) VALUES (?, ?, ?, ?)').bind(uuid, encrypted, cryptoType, Date.now()).run();

const selectDataStmt = (db: D1Database) => db.prepare('SELECT * FROM data WHERE uuid = ?');
export const selectData = (uuid: string, db: D1Database): Promise<DatabaseSchema | null> => selectDataStmt(db).bind(uuid).first<DatabaseSchema>();
