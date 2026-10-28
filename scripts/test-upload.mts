import fs from 'fs';
import { ensureDataDirs, UPLOAD_DIR, DB_PATH } from '../lib/paths';
import { getDb } from '../lib/db';
import { parseExcelBuffer, applyTimes, insertParsedRows, deleteTaskData } from '../lib/excel';
import { rebuildSummary } from '../lib/summary';

ensureDataDirs();
getDb();
const buf = fs.readFileSync('demo/300关注赞评论.xlsx');
console.log('size', buf.length, 'UPLOAD', UPLOAD_DIR, 'DB', DB_PATH);
try {
  deleteTaskData('300关注赞评论');
  const parsed = await parseExcelBuffer(buf, '300关注赞评论');
  const withTimes = applyTimes(parsed).map((r) => ({ ...r, taskName: '300关注赞评论' }));
  insertParsedRows(withTimes, '300关注赞评论.xlsx');
  rebuildSummary();
  console.log('OK rows', withTimes.length);
} catch (e) {
  console.error('FAIL', e);
  process.exit(1);
}
