import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { weightedRevenue, formatYen, PHASE_COLORS, type Phase } from "@/lib/enums";

export const dynamic = "force-dynamic";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

type DealRow = {
  id: string;
  accountName: string | null;
  phase: string;
  businessType: string;
  nextActionDate: Date | null;
  expectedRevenue: number;
  probability: number;
};

function DealLine({ d }: { d: DealRow }) {
  return (
    <Link
      href={`/deals/${d.id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm"
    >
      <span className={`h-2 w-2 rounded-full ${PHASE_COLORS[d.phase as Phase] ?? "bg-slate-300"}`} />
      <span className="font-medium w-48 truncate">{d.accountName ?? "(顧客未設定)"}</span>
      <span className="w-24 text-slate-500">{d.phase}</span>
      <span className="w-28 text-slate-400 text-xs">{d.businessType}</span>
      {d.nextActionDate && (
        <span className="text-xs text-slate-500">次回 {ymd(d.nextActionDate)}</span>
      )}
      <span className="ml-auto font-semibold text-emerald-700 tabular-nums">
        {formatYen(weightedRevenue(d.expectedRevenue, d.probability))}
      </span>
    </Link>
  );
}

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const sp = await searchParams;
  const owner = sp.owner;

  const ownerRows = await prisma.deal.findMany({
    where: { owner: { not: null } },
    select: { owner: true },
    distinct: ["owner"],
  });
  const owners = ownerRows.map((r) => r.owner!).filter(Boolean).sort();

  const where = owner ? { owner } : {};
  const deals = await prisma.deal.findMany({
    where,
    include: { account: { select: { name: true } } },
    orderBy: { nextActionDate: "asc" },
  });

  const rows: DealRow[] = deals.map((d) => ({
    id: d.id,
    accountName: d.account?.name ?? null,
    phase: d.phase,
    businessType: d.businessType,
    nextActionDate: d.nextActionDate,
    expectedRevenue: d.expectedRevenue,
    probability: d.probability,
  }));

  const today = startOfToday();
  const active = rows.filter((d) => d.phase !== "失注" && d.phase !== "保留");
  const withAction = active.filter((d) => d.nextActionDate);
  const overdue = withAction.filter((d) => d.nextActionDate! < today);
  const todayList = withAction.filter(
    (d) =>
      d.nextActionDate! >= today &&
      d.nextActionDate! < new Date(today.getTime() + 86400000)
  );
  const upcoming = withAction.filter(
    (d) => d.nextActionDate! >= new Date(today.getTime() + 86400000)
  );

  const pipelineTotal = active.reduce(
    (s, d) => s + weightedRevenue(d.expectedRevenue, d.probability),
    0
  );

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-3">担当者別ビュー</h1>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <Link
          href="/my"
          className={`rounded-full px-3 py-1 text-sm ${
            !owner ? "bg-emerald-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          全員
        </Link>
        {owners.map((o) => (
          <Link
            key={o}
            href={`/my?owner=${encodeURIComponent(o)}`}
            className={`rounded-full px-3 py-1 text-sm ${
              owner === o
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {o}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">進行中商談</div>
          <div className="text-lg font-bold tabular-nums">{active.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">加重売上（月間）</div>
          <div className="text-lg font-bold text-emerald-700 tabular-nums">{formatYen(pipelineTotal)}</div>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <div className="text-xs text-rose-500">アクション遅延</div>
          <div className="text-lg font-bold text-rose-700 tabular-nums">{overdue.length}</div>
        </div>
      </div>

      <ReminderSection title="🔴 遅延" deals={overdue} empty="遅延なし" tone="rose" />
      <ReminderSection title="🟡 今日" deals={todayList} empty="今日の予定なし" tone="amber" />
      <ReminderSection title="🔵 今後" deals={upcoming} empty="今後の予定なし" tone="sky" />

      <h2 className="text-sm font-semibold text-slate-700 mb-2 mt-8">
        次回アクション未設定の進行中商談
      </h2>
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {active.filter((d) => !d.nextActionDate).length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-400">なし</p>
        ) : (
          active
            .filter((d) => !d.nextActionDate)
            .map((d) => <DealLine key={d.id} d={d} />)
        )}
      </div>
    </div>
  );
}

function ReminderSection({
  title,
  deals,
  empty,
  tone,
}: {
  title: string;
  deals: DealRow[];
  empty: string;
  tone: "rose" | "amber" | "sky";
}) {
  const border = { rose: "border-rose-200", amber: "border-amber-200", sky: "border-slate-200" }[tone];
  return (
    <section className="mb-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-2">
        {title} <span className="text-slate-400">({deals.length})</span>
      </h2>
      <div className={`rounded-lg border ${border} bg-white divide-y divide-slate-100`}>
        {deals.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-400">{empty}</p>
        ) : (
          deals.map((d) => <DealLine key={d.id} d={d} />)
        )}
      </div>
    </section>
  );
}
