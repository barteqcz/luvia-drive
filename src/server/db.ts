import { DatabaseSync } from 'node:sqlite'; 
import path from 'path';
import fs from 'fs';

let db: DatabaseSync;

export function initDb() {
  const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
  console.log(`[DB] Initializing database in: ${DATA_DIR}`);

  try {
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`[DB] Creating directory: ${DATA_DIR}`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const dbPath = path.join(DATA_DIR, 'database.sqlite');
    console.log(`[DB] Opening database file: ${dbPath}`);
    
    // Permission check
    try {
      const testFile = path.join(DATA_DIR, '.write_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`[DB] Write permission verified in ${DATA_DIR}`);
    } catch (writeErr) {
      console.error(`[DB] PERMISSION ERROR: Cannot write to ${DATA_DIR}`);
      throw writeErr;
    }

    db = new DatabaseSync(dbPath); 

    db.exec('PRAGMA foreign_keys = ON');

    // Initialize tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        quota INTEGER DEFAULT 10737418240, -- 10GB default
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        share_token TEXT UNIQUE NOT NULL,
        download_limit INTEGER DEFAULT NULL,
        download_count INTEGER DEFAULT 0,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS trash (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        original_name TEXT NOT NULL,
        storage_name TEXT NOT NULL,
        size INTEGER NOT NULL,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration
    const info = db.prepare("PRAGMA table_info(users)").all() as any[];
    const hasQuota = info.some((col: any) => col.name === 'quota');
    if (!hasQuota) {
      db.exec("ALTER TABLE users ADD COLUMN quota INTEGER DEFAULT 10737418240");
    }
    db.prepare("UPDATE users SET quota = 10737418240 WHERE quota = 0 OR quota IS NULL").run();
    
    console.log("[DB] Database initialized successfully.");
    return db;
  } catch (err) {
    console.error("[DB] FATAL ERROR during database initialization:");
    console.error(err);
    throw err;
  }
}

export { db };
export default () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
};
