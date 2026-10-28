/**
 * 使用 Node 22 内置 node:sqlite（无 better-sqlite3 原生 addon），
 * 避免 Docker 中 Segmentation fault。
 */
import { DB_PATH, ensureDataDirs } from './paths';

export type SqlValue = string | number | bigint | boolean | null | Uint8Array;

type Stmt = {
  // 放宽为 unknown，避免业务层拼动态参数时类型过严
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Record<string, unknown>[];
};

export type AppDatabase = {
  prepare: (sql: string) => Stmt;
  exec: (sql: string) => void;
  transaction: <T>(fn: () => T) => () => T;
};

type DatabaseSyncLike = {
  prepare: (sql: string) => {
    run: (...params: SqlValue[]) => { changes: number; lastInsertRowid: number | bigint };
    get: (...params: SqlValue[]) => Record<string, unknown> | undefined;
    all: (...params: SqlValue[]) => Record<string, unknown>[];
  };
  exec: (sql: string) => void;
};

const globalForDb = globalThis as unknown as { __taskStatsDb?: AppDatabase };

function openDatabaseSync(filePath: string): DatabaseSyncLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as {
    DatabaseSync: new (path: string) => DatabaseSyncLike;
  };
  return new DatabaseSync(filePath);
}

function wrapDb(raw: DatabaseSyncLike): AppDatabase {
  return {
    prepare(sql: string) {
      const stmt = raw.prepare(sql);
      return {
        run: (...params: unknown[]) => stmt.run(...(params as SqlValue[])),
        get: (...params: unknown[]) => stmt.get(...(params as SqlValue[])),
        all: (...params: unknown[]) => stmt.all(...(params as SqlValue[])),
      };
    },
    exec(sql: string) {
      raw.exec(sql);
    },
    transaction<T>(fn: () => T) {
      return () => {
        raw.exec('BEGIN');
        try {
          const result = fn();
          raw.exec('COMMIT');
          return result;
        } catch (e) {
          try {
            raw.exec('ROLLBACK');
          } catch {
            // ignore
          }
          throw e;
        }
      };
    },
  };
}

function createDb(): AppDatabase {
  ensureDataDirs();
  const raw = openDatabaseSync(DB_PATH);
  const db = wrapDb(raw);

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

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

export function getDb(): AppDatabase {
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
