import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDB = async () => {
  if (db) {
    return db;
  }
  db = await SQLite.openDatabaseAsync('field_notes.db');
  await migrateDb(db);
  return db;
};

const migrateDb = async (database: SQLite.SQLiteDatabase) => {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL, -- 'synced', 'pending', 'failed'
      sync_action TEXT,          -- 'create', 'update', 'delete', null
      is_deleted INTEGER DEFAULT 0
    );
  `);
};
