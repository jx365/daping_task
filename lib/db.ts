import type BetterSqlite3 from 'better-sqlite3';
import { DB_PATH, ensureDataDirs } from './paths';

type DatabaseInstance = BetterSqlite3.Database;

const globalForDb = globalThis as unknown as { __taskStatsDb?: DatabaseInstance };

function loadBetterSqlite3(): typeof BetterSqlite3 {
  // Lazy-load native addon. Importing it during Next.js "Generating static pages"
  // worker processes often causes SIGSEGV on small VPS.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('better-sqlite3');
}

function createDb(): DatabaseInstance {
  ensureDataDirs();
  const Database = loadBetterSqlite3();
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

export function getDb(): DatabaseInstance {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Database is not available during Next.js build');
  }
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
