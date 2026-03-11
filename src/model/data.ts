import { DatabaseSchema, SQLite_Master } from '../types';

const checkSqliteMasterStmt = (db: D1Database) => db.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?');
const populateDataStmt = (db: D1Database) => db.prepare('CREATE TABLE IF NOT EXISTS data (uuid TEXT PRIMARY KEY, encrypted TEXT, created_at INTEGER)');
export const populateData = async (db: D1Database): Promise<void> => {
    const dataTableExist = await checkSqliteMasterStmt(db).bind('table', 'data').first<SQLite_Master>();
    if (!dataTableExist) {
        const info = await populateDataStmt(db).run();
        console.log('Populating data table', info.meta);
    }
};

const insertOrReplaceDataStmt = (db: D1Database) => db.prepare('INSERT OR REPLACE INTO data VALUES (?, ?, ?)');
export const insertOrReplaceData = (uuid: string, encrypted: string, db: D1Database): Promise<D1Response> => insertOrReplaceDataStmt(db).bind(uuid, encrypted, Date.now()).run();

const selectDataStmt = (db: D1Database) => db.prepare('SELECT * FROM data WHERE uuid = ?');
export const selectData = (uuid: string, db: D1Database): Promise<DatabaseSchema | null> => selectDataStmt(db).bind(uuid).first<DatabaseSchema>();
