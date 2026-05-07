// 1. Import DatabaseSync instead of Database
import { DatabaseSync } from 'node:sqlite'; 
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

// Ensure data directory exists before establishing connection
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'database.sqlite');
const db = new DatabaseSync(dbPath); 

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

// Migration: Add quota if table exists but column doesn't
try {
  const info = db.prepare("PRAGMA table_info(users)").all();
  const hasQuota = info.some((col: any) => col.name === 'quota');
  if (!hasQuota) {
    db.exec("ALTER TABLE users ADD COLUMN quota INTEGER DEFAULT 10737418240");
  }
  // Ensure existing users don't have 0 or null quota
  db.prepare("UPDATE users SET quota = 10737418240 WHERE quota = 0 OR quota IS NULL").run();
} catch (err) {
  console.error("Migration failed:", err);
}

export default db;