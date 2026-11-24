import { getDb } from './db';

export type ScoringMode = 'image' | 'form_number';

export type ScoringConfig = {
  mode: ScoringMode;
  /** 每张图片对应分数（mode=image） */
  pointsPerImage: number;
  /** 比例 a:b = 每 a 计 b 分（mode=form_number） */
  ratioA: number;
  ratioB: number;
  /** 数字列表头匹配（无 /.../ 包裹的正则源字符串） */
  numberHeaderRegex: string;
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  mode: 'image',
  pointsPerImage: 1,
  ratioA: 5,
  ratioB: 1,
  numberHeaderRegex: '数量|数字|次数|积分|分数|数值',
};

const META_KEY = 'scoring_config';

function clampPositiveInt(n: unknown, fallback: number): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 1) return fallback;
  return v;
}

export function normalizeScoringConfig(raw: Partial<ScoringConfig> | null | undefined): ScoringConfig {
  const mode: ScoringMode = raw?.mode === 'form_number' ? 'form_number' : 'image';
  const pointsPerImage = clampPositiveInt(raw?.pointsPerImage, DEFAULT_SCORING_CONFIG.pointsPerImage);
  const ratioA = clampPositiveInt(raw?.ratioA, DEFAULT_SCORING_CONFIG.ratioA);
  const ratioB = clampPositiveInt(raw?.ratioB, DEFAULT_SCORING_CONFIG.ratioB);
  let numberHeaderRegex = String(raw?.numberHeaderRegex ?? DEFAULT_SCORING_CONFIG.numberHeaderRegex).trim();
  if (!numberHeaderRegex) numberHeaderRegex = DEFAULT_SCORING_CONFIG.numberHeaderRegex;
  // 避免非法正则导致解析崩溃
  try {
    // eslint-disable-next-line no-new
    new RegExp(numberHeaderRegex, 'i');
  } catch {
    numberHeaderRegex = DEFAULT_SCORING_CONFIG.numberHeaderRegex;
  }
  return { mode, pointsPerImage, ratioA, ratioB, numberHeaderRegex };
}

export function getScoringConfig(): ScoringConfig {
  const db = getDb();
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(META_KEY) as
    | { value: string }
    | undefined;
  if (!row?.value) return { ...DEFAULT_SCORING_CONFIG };
  try {
    return normalizeScoringConfig(JSON.parse(row.value) as Partial<ScoringConfig>);
  } catch {
    return { ...DEFAULT_SCORING_CONFIG };
  }
}

export function setScoringConfig(input: Partial<ScoringConfig>): ScoringConfig {
  const cfg = normalizeScoringConfig({ ...getScoringConfig(), ...input });
  const db = getDb();
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_KEY, JSON.stringify(cfg));
  return cfg;
}

/** 按当前配置计算 times（仅用于新上传） */
export function computeTimesFromConfig(
  cfg: ScoringConfig,
  imageCount: number,
  formNumber: number
): number {
  if (cfg.mode === 'form_number') {
    const n = Math.max(0, Math.floor(Number(formNumber) || 0));
    const a = cfg.ratioA;
    if (a <= 0) return 0;
    return Math.max(0, Math.floor((n / a) * cfg.ratioB));
  }
  const imgs = Math.max(0, Math.floor(Number(imageCount) || 0));
  return imgs * cfg.pointsPerImage;
}
