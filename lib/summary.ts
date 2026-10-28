import { getDb } from './db';

export type DetailItem = {
  task: string;
  times: number;
  images: string[];
};

function nowStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function rebuildSummary() {
  const db = getDb();

  const links = db
    .prepare('SELECT main_id, sub_id FROM account_links')
    .all() as { main_id: string; sub_id: string }[];

  const subToMain = new Map<string, string>();
  const mainToSubs = new Map<string, string[]>();
  for (const link of links) {
    subToMain.set(link.sub_id, link.main_id);
    const arr = mainToSubs.get(link.main_id) || [];
    arr.push(link.sub_id);
    mainToSubs.set(link.main_id, arr);
  }

  const records = db
    .prepare('SELECT id, user_id, task_name, times FROM records')
    .all() as { id: number; user_id: string; task_name: string; times: number }[];

  const updateOwner = db.prepare('UPDATE records SET owner_id = ? WHERE id = ?');
  const updateOwners = db.transaction(() => {
    for (const r of records) {
      const owner = subToMain.get(r.user_id) ?? r.user_id;
      updateOwner.run(owner, r.id);
    }
  });
  updateOwners();

  type Agg = {
    times: number;
    images: string[];
  };
  const byOwner = new Map<string, Map<string, Agg>>();

  const withImages = db
    .prepare(
      `SELECT r.owner_id, r.task_name, r.times, r.id AS record_id
       FROM records r`
    )
    .all() as { owner_id: string; task_name: string; times: number; record_id: number }[];

  const imgStmt = db.prepare(
    'SELECT file_name FROM images WHERE record_id = ? ORDER BY sort ASC, id ASC'
  );

  for (const r of withImages) {
    let taskMap = byOwner.get(r.owner_id);
    if (!taskMap) {
      taskMap = new Map();
      byOwner.set(r.owner_id, taskMap);
    }
    let agg = taskMap.get(r.task_name);
    if (!agg) {
      agg = { times: 0, images: [] };
      taskMap.set(r.task_name, agg);
    }
    agg.times += r.times;
    const imgs = imgStmt.all(r.record_id) as { file_name: string }[];
    for (const img of imgs) {
      agg.images.push(img.file_name);
    }
  }

  // Also ensure main accounts that only appear as mains (with subs) exist even with 0?
  // Spec: rebuild from records only — empty if no records.

  const clear = db.transaction(() => {
    db.prepare('DELETE FROM summary').run();
    const insert = db.prepare(
      `INSERT INTO summary (user_id, sub_ids, total_times, details, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    const updatedAt = nowStr();
    for (const [ownerId, taskMap] of Array.from(byOwner.entries())) {
      const details: DetailItem[] = [];
      let total = 0;
      for (const [task, agg] of Array.from(taskMap.entries())) {
        details.push({ task, times: agg.times, images: agg.images });
        total += agg.times;
      }
      details.sort((a, b) => a.task.localeCompare(b.task, 'zh'));
      const subs = mainToSubs.get(ownerId) || [];
      insert.run(ownerId, JSON.stringify(subs), total, JSON.stringify(details), updatedAt);
    }
    db.prepare(
      `INSERT INTO meta (key, value) VALUES ('last_update', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(updatedAt);
  });
  clear();
}

export function getLastUpdate(): string | null {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'last_update'`).get() as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}
