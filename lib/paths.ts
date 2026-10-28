import path from 'path';
import fs from 'fs';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const DB_PATH = path.join(DATA_DIR, 'app.db');

export function ensureDataDirs() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
