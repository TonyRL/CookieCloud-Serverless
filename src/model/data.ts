import { DatabaseSchema, SQLite_Master } from '../types';

const dropDataStmt = (db: D1Database) => db.prepare('DROP TABLE IF EXISTS data');
export const dropData = (db: D1Database): Promise<D1Response> => dropDataStmt(db).run();

const checkSqliteMasterStmt = (db: D1Database) => db.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?');
const populateDataStmt = (db: D1Database) => db.prepare('CREATE TABLE IF NOT EXISTS data (uuid TEXT PRIMARY KEY, encrypted TEXT, created_at INTEGER)');
export const populateData = async (db: D1Database, c: any): Promise<D1Response | void> => {
    const dataTableExist = await checkSqliteMasterStmt(db).bind('table', 'data').first<SQLite_Master>();
    if (!dataTableExist) {
        const logger = c.get('logger');

        const info = await populateDataStmt(db).run();
        await logger.info({
            requestId: c.get('requestId'),
            namespace: c.req.path,
            message: 'Populating data table',
            d1meta: info.meta,
        });
    }
};

const insertOrReplaceDataStmt = (db: D1Database) => db.prepare('INSERT OR REPLACE INTO data VALUES (?, ?, ?)');
export const insertOrReplaceData = (uuid: string, encrypted: string, db: D1Database): Promise<D1Response> => insertOrReplaceDataStmt(db).bind(uuid, encrypted, Date.now()).run();

const selectDataStmt = (db: D1Database) => db.prepare('SELECT * FROM data WHERE uuid = ?');
export const selectData = (uuid: string, db: D1Database): Promise<DatabaseSchema | null> => selectDataStmt(db).bind(uuid).first<DatabaseSchema>();
