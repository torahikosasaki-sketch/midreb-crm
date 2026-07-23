import type { InsightItem, InsightTone } from "@/lib/reports";

// tone → 表示スタイル（アイコン＋色。ステータス色は必ずアイコン/ラベルと併用）
const TONE: Record<InsightTone, { icon: string; ring: string; bg: string; iconColor: string; srLabel: string }> = {
  good: { icon: "▲", ring: "border-emerald-200", bg: "bg-emerald-50", iconColor: "text-emerald-600", srLabel: "好調" },
  warn: { icon: "！", ring: "border-amber-200", bg: "bg-amber-50", iconColor: "text-amber-600", srLabel: "注意" },
  bad: { icon: "▼", ring: "border-rose-200", bg: "bg-rose-50", iconColor: "text-rose-600", srLabel: "要対応" },
  info: { icon: "＃", ring: "border-slate-200", bg: "bg-white", iconColor: "text-slate-400", srLabel: "情報" },
};

/** サマリー示唆をカテゴリ別カードで表示する */
export function InsightList({ items }: { items: InsightItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {items.map((it, i) => {
        const t = TONE[it.tone];
        return (
          <div key={i} className={`flex items-start gap-2.5 rounded-lg border ${t.ring} ${t.bg} px-3 py-2.5`}>
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold ${t.iconColor}`}
              aria-hidden
            >
              {t.icon}
            </span>
            <span className="sr-only">{t.srLabel}:</span>
            <p className="text-sm leading-relaxed text-slate-700">{it.text}</p>
          </div>
        );
      })}
    </div>
  );
}
