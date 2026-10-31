'use client';

export type BoardItem = { rank: number; user_id: string; total_times: number };

const GROUPS = [
  {
    id: 'g1',
    title: '海豹突击队',
    subtitle: 'Rank 1 – 16',
    range: [1, 16] as const,
    badge: '⚓ OPERATOR',
  },
  {
    id: 'g2',
    title: '海豹预备队',
    subtitle: 'Rank 17 – 32',
    range: [17, 32] as const,
    badge: '🧭 CANDIDATE',
  },
  {
    id: 'g3',
    title: '海豹训练兵',
    subtitle: 'Rank 33 – 48',
    range: [33, 48] as const,
    badge: '🎯 RECRUIT',
  },
] as const;

function rowClass(rank: number): string {
  if (rank === 1) return 'lb-row lb-rank-1';
  if (rank === 2) return 'lb-row lb-rank-2';
  if (rank === 3) return 'lb-row lb-rank-3';
  if (rank <= 7) return 'lb-row lb-rank-top7';
  if (rank <= 16) return 'lb-row lb-group-1';
  if (rank <= 32) return 'lb-row lb-group-2';
  return 'lb-row lb-group-3';
}

function RankLabel({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 font-bold">
        <span className="lb-medal">🥇</span>
        <span>1</span>
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold">
        <span className="lb-medal">🥈</span>
        <span>2</span>
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold">
        <span className="lb-medal">🥉</span>
        <span>3</span>
      </span>
    );
  }
  if (rank <= 7) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
        <span className="text-amber-500">✦</span>
        {rank}
      </span>
    );
  }
  return <span className="tabular-nums text-slate-600">{rank}</span>;
}

function GroupHeader({
  title,
  subtitle,
  badge,
  groupId,
}: {
  title: string;
  subtitle: string;
  badge: string;
  groupId: string;
}) {
  return (
    <div className={`lb-group-header lb-header-${groupId} mb-2 mt-5 first:mt-0`}>
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] opacity-80">{badge}</p>
          <h3 className="text-base font-bold sm:text-lg">{title}</h3>
          <p className="text-xs opacity-75">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardBoard({
  board,
  lastUpdate,
}: {
  board: BoardItem[];
  lastUpdate?: string | null;
}) {
  function formatUpdate(s: string | null | undefined) {
    if (!s) return '—';
    return s.slice(0, 16);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50 to-amber-50 px-4 py-3.5 text-center">
        <span className="text-xl font-bold tracking-wide text-slate-800 sm:text-2xl">
          🏆 排行榜
        </span>
      </div>

      {GROUPS.map((g) => {
        const rows = board.filter((b) => b.rank >= g.range[0] && b.rank <= g.range[1]);
        return (
          <section key={g.id} className="lb-section">
            <GroupHeader
              title={g.title}
              subtitle={g.subtitle}
              badge={g.badge}
              groupId={g.id}
            />
            <div className={`overflow-hidden rounded-xl border lb-panel-${g.id}`}>
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead className="text-xs tracking-wide text-slate-500/80">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">排名</th>
                    <th className="px-3 py-2.5 font-medium">用户 ID</th>
                    <th className="px-3 py-2.5 font-medium">参与次数</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.user_id} className={rowClass(item.rank)}>
                      <td className="px-3 py-2.5">
                        <RankLabel rank={item.rank} />
                      </td>
                      <td className="px-3 py-2.5 font-medium">{item.user_id}</td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums">{item.total_times}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                        本组暂无上榜
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <p className="pt-2 text-center text-xs text-slate-400">
        上次更新时间：{formatUpdate(lastUpdate)}
      </p>
    </div>
  );
}
