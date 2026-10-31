'use client';

import {
  SilhouetteAlbum,
  SilhouetteCard,
  SilhouetteGuard,
  SilhouetteLanyard,
  SilhouetteSleeve,
  SilhouetteSpecialCard,
  SilhouetteWish,
} from './RewardSilhouettes';
export default function RewardsNotice() {
  return (
    <div className="space-y-6">
      <section className="reward-hero relative overflow-hidden rounded-2xl px-4 py-6 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="reward-sparkle absolute left-[12%] top-3 text-lg">✨</div>
          <div className="reward-sparkle-delay absolute right-[14%] top-5 text-base">💫</div>
          <div className="reward-sparkle absolute bottom-4 left-[20%] text-sm">⭐</div>
          <div className="reward-sparkle-delay absolute bottom-3 right-[18%] text-base">💗</div>
        </div>
        <p className="text-xs font-semibold tracking-[0.2em] text-rose-500/90">SPECIAL REWARDS</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">🎁 奖励公告</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          积分一路攒下去，小卡、御守、定制周边等你来换——
          <span className="font-medium text-rose-600">越努力，越闪耀</span>✨
        </p>
      </section>

      <section className="rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50/80 to-white p-4 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800">
          <span>💖</span> 积分兑换 · 边玩边收获
        </h3>
        <p className="mb-4 text-xs text-slate-500">每满一档就解锁下一份心意，暂不封顶</p>

        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-3">
          <SilhouetteCard label="常规小卡 ×1" />
          <SilhouetteSpecialCard label="特殊小卡 ×1" />
          <SilhouetteGuard label="定制御守 ×1" />
        </div>

        <ul className="space-y-3 text-sm leading-relaxed text-slate-700">
          <li className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-rose-100">
            <span className="font-semibold text-rose-600">① 每达成 12 积分</span>
            <span className="text-slate-600">
              {' '}
              → 按顺序兑换小卡 ×1
            </span>
            <p className="mt-1 text-xs text-slate-500">
              累计 12、24、36… 积分，依次解锁不同小卡，
              <span className="font-medium text-rose-500">暂不封顶</span>，想集齐一整套就冲！
            </p>
          </li>
          <li className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-amber-100">
            <span className="font-semibold text-amber-600">② 满百积分</span>
            <span className="text-slate-600"> → 兑换特殊小卡 ×1 🌟</span>
            <p className="mt-1 text-xs text-slate-500">百积分里程碑限定，闪度更高、更值得珍藏。</p>
          </li>
          <li className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-sky-100">
            <span className="font-semibold text-sky-600">③ 满勤奖励</span>
            <span className="text-slate-600"> → 定制御守 ×1 🧿</span>
            <p className="mt-1 text-xs text-slate-500">坚持全勤的你，专属御守加持好运与心意。</p>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-4 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800">
          <span>🏆</span> TOP 荣誉奖励
        </h3>
        <p className="mb-4 text-xs text-slate-500">冲进榜单前列，解锁专属定制周边</p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SilhouetteAlbum label="TOP1 · 定制卡册" />
          <SilhouetteSleeve label="TOP2–3 · 卡套" />
          <SilhouetteLanyard label="TOP4–10 · 挂绳" />
          <SilhouetteWish label="TOP20 · 署名祝福" />
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="reward-top1-card flex items-start gap-2 rounded-xl px-3 py-2.5">
            <span className="text-lg">🥇</span>
            <div>
              <div className="font-semibold text-amber-800">TOP1：定制卡册 ×1</div>
              <p className="text-xs text-amber-700/80">冠军专属，把热爱收进一本只属于你的卡册</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
            <span className="text-lg">🥈</span>
            <div>
              <div className="font-semibold text-slate-700">TOP2–3：定制卡套 ×1</div>
              <p className="text-xs text-slate-500">领奖台常客的精致守护</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-orange-50/80 px-3 py-2.5 ring-1 ring-orange-100">
            <span className="text-lg">🥉</span>
            <div>
              <div className="font-semibold text-orange-800">TOP4–10：定制挂绳 ×1</div>
              <p className="text-xs text-orange-700/80">入围十强，挂绳陪你一路闪耀</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-pink-50/80 px-3 py-2.5 ring-1 ring-pink-100">
            <span className="text-lg">💌</span>
            <div>
              <div className="font-semibold text-pink-800">TOP20：可署名祝福（20 字以内）</div>
              <p className="text-xs text-pink-700/80">
                纳入今年生日待公布投放——把你的话，送到她心里
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <h3 className="mb-2 font-semibold text-slate-800">📌 注意事项</h3>
        <ol className="list-decimal space-y-2 pl-4 leading-relaxed">
          <li>
            所有兑换礼及奖励<strong className="font-medium text-slate-800">不包邮</strong>
            ，补邮时间及发货时间另行通知。
          </li>
          <li>
            严禁各类书局造假作弊行为，一经发现
            <strong className="font-medium text-rose-600">直接取消领奖资格</strong>。
          </li>
        </ol>
        <p className="mt-4 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
          本次活动解释权由{' '}
          <span className="font-medium text-rose-600">@李艺彤星象追踪器</span> 所有
        </p>
      </section>
    </div>
  );
}
