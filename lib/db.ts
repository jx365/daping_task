import Database from 'better-sqlite3';
import { DB_PATH, ensureDataDirs } from './paths';

ensureDataDirs();

const globalForDb = globalThis as unknown as { __taskStatsDb?: Database.Database };

function createDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      task_name TEXT NOT NULL,
      image_count INTEGER DEFAULT 0,
      times INTEGER DEFAULT 0,
      source_file TEXT,
      row_index INTEGER,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      sort INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS account_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      main_id TEXT NOT NULL,
      sub_id TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      sub_ids TEXT DEFAULT '[]',
      total_times INTEGER DEFAULT 0,
      details TEXT DEFAULT '[]',
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.__taskStatsDb) {
    globalForDb.__taskStatsDb = createDb();
  }
  return globalForDb.__taskStatsDb;
}

export type RecordRow = {
  id: number;
  user_id: string;
  owner_id: string;
  task_name: string;
  image_count: number;
  times: number;
  source_file: string | null;
  row_index: number | null;
  created_at: string | null;
};

export type SummaryRow = {
  id: number;
  user_id: string;
  sub_ids: string;
  total_times: number;
  details: string;
  updated_at: string | null;
};

export type AccountLinkRow = {
  id: number;
  main_id: string;
  sub_id: string;
};
