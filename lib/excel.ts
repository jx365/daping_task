import type ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { UPLOAD_DIR, ensureDataDirs } from './paths';
import { getDb } from './db';
import type { DetailItem } from './summary';

function loadExcelJS(): typeof ExcelJS {
  // 避免被 Next 打包弄坏；运行时从 node_modules 加载
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('exceljs');
}

export type ParsedImage = {
  /** local binary (embedded Excel image) */
  buffer?: Buffer;
  extension: string;
  /** remote credential URL (群·问卷 hyperlink) — stored as .ref, no download at upload */
  remoteUrl?: string;
};

export type ParsedRow = {
  userId: string;
  taskName: string;
  imageCount: number;
  images: ParsedImage[];
  rowIndex: number;
};

const USER_HEADER_RE = /id|用户|账号|姓名|昵称|学号|工号|人员/i;
const TASK_HEADER_RE = /任务|项目|活动|事项/i;
const IMAGE_HEADER_RE = /图片|凭证|上传|照片|截图/i;
const EMPTY_PLACEHOLDER_RE = /^(--|-|—|无|null|n\/?a)?$/i;

function cellText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.text === 'string') return v.text.trim();
    if (typeof v.result !== 'undefined') return cellText(v.result);
    if (typeof v.richText !== 'undefined' && Array.isArray(v.richText)) {
      return (v.richText as { text?: string }[]).map((t) => t.text || '').join('').trim();
    }
    if (typeof v.hyperlink === 'string' && typeof v.text === 'string') return v.text.trim();
  }
  return String(value).trim();
}

function cellHyperlink(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const v = value as { hyperlink?: string };
    if (typeof v.hyperlink === 'string' && /^https?:\/\//i.test(v.hyperlink)) {
      return v.hyperlink;
    }
  }
  return null;
}

function isEmptyImageCell(text: string, href: string | null): boolean {
  if (href) return false;
  return EMPTY_PLACEHOLDER_RE.test(text);
}

function uniqueNonEmptyValues(row: ExcelJS.Row, maxCol: number): string[] {
  const set = new Set<string>();
  for (let c = 1; c <= maxCol; c++) {
    const t = cellText(row.getCell(c).value);
    if (t) set.add(t);
  }
  return Array.from(set);
}

function findHeaderRow(worksheet: ExcelJS.Worksheet): number {
  const maxCol = Math.max(worksheet.columnCount || 1, 10);
  let fallback: number | null = null;
  for (let r = 1; r <= Math.min(worksheet.rowCount || 1, 50); r++) {
    const uniques = uniqueNonEmptyValues(worksheet.getRow(r), maxCol);
    if (uniques.length < 2) continue;
    if (fallback == null) fallback = r;
    const joined = uniques.join(' ');
    if (USER_HEADER_RE.test(joined) || TASK_HEADER_RE.test(joined) || IMAGE_HEADER_RE.test(joined)) {
      return r;
    }
  }
  return fallback ?? 1;
}

function findColumnIndexes(
  headerRow: ExcelJS.Row,
  maxCol: number
): { userCol: number; taskCol: number | null; imageCols: number[] } {
  let userCol: number | null = null;
  let taskCol: number | null = null;
  const imageCols: number[] = [];
  let firstNonEmpty: number | null = null;

  for (let c = 1; c <= maxCol; c++) {
    const t = cellText(headerRow.getCell(c).value);
    if (!t) continue;
    if (firstNonEmpty == null) firstNonEmpty = c;
    if (userCol == null && USER_HEADER_RE.test(t)) userCol = c;
    // 避免把「名称」类宽泛词误伤；任务列需更明确
    if (taskCol == null && TASK_HEADER_RE.test(t) && !USER_HEADER_RE.test(t) && !IMAGE_HEADER_RE.test(t)) {
      taskCol = c;
    }
    if (IMAGE_HEADER_RE.test(t)) imageCols.push(c);
  }

  return {
    userCol: userCol ?? firstNonEmpty ?? 1,
    taskCol,
    imageCols,
  };
}

/** 新计分：1 张图片 = 1 次参与；无图为 0 */
export function computeTimes(imageCount: number): number {
  return Math.max(0, Math.floor(Number(imageCount) || 0));
}

function saveImage(img: ParsedImage): string {
  ensureDataDirs();
  if (img.remoteUrl) {
    const name = `${randomUUID()}.ref`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), img.remoteUrl, 'utf8');
    return name;
  }
  const name = `${randomUUID()}.${img.extension || 'jpg'}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), img.buffer || Buffer.alloc(0));
  return name;
}

function collectRemoteImages(
  row: ExcelJS.Row,
  cols: number[]
): ParsedImage[] {
  const images: ParsedImage[] = [];
  for (const c of cols) {
    const val = row.getCell(c).value;
    const href = cellHyperlink(val);
    const text = cellText(val);
    if (isEmptyImageCell(text, href)) continue;
    if (href) {
      images.push({ extension: 'ref', remoteUrl: href });
    }
  }
  return images;
}

export async function parseExcelBuffer(
  buffer: Buffer,
  taskNameFallback: string
): Promise<ParsedRow[]> {
  ensureDataDirs();
  const ExcelJS = loadExcelJS();
  const tmp = path.join(UPLOAD_DIR, `upload-${randomUUID()}.xlsx`);
  fs.writeFileSync(tmp, buffer);

  let workbook: ExcelJS.Workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tmp);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const maxCol = Math.max(worksheet.columnCount || 1, 20);
  const headerRowNum = findHeaderRow(worksheet);
  const headerRow = worksheet.getRow(headerRowNum);
  const { userCol, taskCol, imageCols } = findColumnIndexes(headerRow, maxCol);

  // Embedded images (nativeRow is 0-based)
  const imagesByRow = new Map<number, ParsedImage[]>();
  const sheetImages = typeof worksheet.getImages === 'function' ? worksheet.getImages() : [];
  for (const item of sheetImages) {
    try {
      const media = workbook.getImage(+item.imageId);
      if (!media || !media.buffer) continue;
      const nativeRow = item.range?.tl?.nativeRow;
      if (nativeRow == null) continue;
      const rowNum = nativeRow + 1;
      const extension = (media.extension || 'png').replace(/^\./, '');
      const list = imagesByRow.get(rowNum) || [];
      list.push({ buffer: Buffer.from(media.buffer), extension });
      imagesByRow.set(rowNum, list);
    } catch {
      // skip broken image
    }
  }

  const rows: ParsedRow[] = [];
  for (let r = headerRowNum + 1; r <= (worksheet.rowCount || 0); r++) {
    const row = worksheet.getRow(r);
    const userId = cellText(row.getCell(userCol).value);
    if (!userId) continue;

    let taskName = taskNameFallback;
    if (taskCol != null) {
      const fromCell = cellText(row.getCell(taskCol).value);
      if (fromCell) taskName = fromCell;
    }

    const images: ParsedImage[] = [...(imagesByRow.get(r) || [])];

    if (imageCols.length > 0) {
      images.push(...collectRemoteImages(row, imageCols));
    } else if (images.length === 0) {
      // fallback: scan all non-user/task cols for hyperlinks
      const scanCols: number[] = [];
      for (let c = 1; c <= maxCol; c++) {
        if (c === userCol || c === taskCol) continue;
        scanCols.push(c);
      }
      images.push(...collectRemoteImages(row, scanCols));
    }

    rows.push({
      userId,
      taskName,
      imageCount: images.length,
      images,
      rowIndex: r,
    });
  }

  return rows;
}

export function applyTimes(rows: ParsedRow[]): (ParsedRow & { times: number })[] {
  return rows.map((r) => ({ ...r, times: computeTimes(r.imageCount) }));
}

export function deleteTaskData(taskName: string) {
  const db = getDb();
  // 仅删除非手动行，保留后台手动新增的记录
  const records = db
    .prepare('SELECT id FROM records WHERE task_name = ? AND IFNULL(is_manual, 0) = 0')
    .all(taskName) as { id: number }[];
  const imgStmt = db.prepare('SELECT file_name FROM images WHERE record_id = ?');
  const delImg = db.prepare('DELETE FROM images WHERE record_id = ?');
  for (const rec of records) {
    const imgs = imgStmt.all(rec.id) as { file_name: string }[];
    for (const img of imgs) {
      const fp = path.join(UPLOAD_DIR, path.basename(img.file_name));
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch {
        // ignore
      }
    }
    delImg.run(rec.id);
  }
  db.prepare('DELETE FROM records WHERE task_name = ? AND IFNULL(is_manual, 0) = 0').run(
    taskName
  );
}

export function insertParsedRows(
  rows: (ParsedRow & { times: number })[],
  sourceFile: string
) {
  const db = getDb();
  const insertRecord = db.prepare(
    `INSERT INTO records (user_id, owner_id, task_name, image_count, times, source_file, row_index, created_at, is_manual)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  );
  const insertImage = db.prepare(
    `INSERT INTO images (record_id, file_name, sort) VALUES (?, ?, ?)`
  );
  const createdAt = new Date().toISOString();

  const run = db.transaction(() => {
    for (const row of rows) {
      const fileNames: string[] = [];
      for (const img of row.images) {
        fileNames.push(saveImage(img));
      }
      const info = insertRecord.run(
        row.userId,
        row.userId,
        row.taskName,
        row.imageCount,
        row.times,
        sourceFile,
        row.rowIndex,
        createdAt
      );
      const recordId = Number(info.lastInsertRowid);
      fileNames.forEach((name, idx) => insertImage.run(recordId, name, idx));
    }
  });
  run();
}

export async function buildExportBuffer(
  summaries: {
    user_id: string;
    sub_ids: string[];
    total_times: number;
    details: DetailItem[];
  }[]
): Promise<Buffer> {
  const ExcelJSLib = loadExcelJS();
  const workbook = new ExcelJSLib.Workbook();
  const sheet = workbook.addWorksheet('汇总');

  sheet.columns = [
    { header: '序号', key: 'idx', width: 8 },
    { header: '用户ID', key: 'user_id', width: 20 },
    { header: '关联子账号', key: 'subs', width: 28 },
    { header: '参与总次数', key: 'total', width: 14 },
    { header: '参与明细', key: 'details', width: 48 },
  ];

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8E8E8' },
  };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  summaries.forEach((s, i) => {
    const detailText = s.details
      .map((d) => `${d.task} ×${d.times}（${d.images.length}张凭证）`)
      .join('\n');
    const row = sheet.addRow({
      idx: i + 1,
      user_id: s.user_id,
      subs: s.sub_ids.join('、'),
      total: s.total_times,
      details: detailText,
    });
    row.getCell(5).alignment = { wrapText: true, vertical: 'top' };
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function exportFileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `任务参与次数汇总_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.xlsx`;
}
