import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import { createWeekly, deleteWeekly } from "@/lib/actions/progress";

export const dynamic = "force-dynamic";

const nz = (n: number | null) => (n == null ? "—" : n.toLocaleString("ja-JP"));

export default async function ProgressPage() {
  const items = await prisma.weeklyProgress.findMany({
    orderBy: [{ weekLabel: "asc" }, { brand: "asc" }, { productSku: "asc" }],
  });

  // 週ごとにグルーピング
  const byWeek = new Map<string, typeof items>();
  for (const it of items) {
    const arr = byWeek.get(it.weekLabel) ?? [];
    arr.push(it);
    byWeek.set(it.weekLabel, arr);
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold mb-1">進捗管理（週次トラッキング）</h1>
      <p className="text-xs text-slate-400 mb-5">
        ブランド×商品×週で、動画/ライブの実績と目標との差分を記録します。
      </p>

      {byWeek.size === 0 && (
        <p className="text-sm text-slate-400 mb-6">まだ記録がありません。下のフォームから追加してください。</p>
      )}

      {[...byWeek.entries()].map(([week, rows]) => (
        <section key={week} className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            <span className="rounded bg-slate-800 text-white px-2 py-0.5 text-xs">{week}</span>
          </h2>
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm border-collapse bg-white">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="py-2 px-3 font-medium">ブランド / 商品</th>
                  <th className="py-2 px-3 font-medium text-right">目標数</th>
                  <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画投稿</th>
                  <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画人数</th>
                  <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画販売</th>
                  <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画GMV</th>
                  <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ回数</th>
                  <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ人数</th>
                  <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ販売</th>
                  <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブGMV</th>
                  <th className="py-2 px-3 font-medium text-right">目標差分</th>
                  <th className="py-2 px-3 font-medium">活動記録</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 px-3">
                      <div className="font-medium">{r.brand}</div>
                      <div className="text-xs text-slate-400">{r.productSku ?? "—"}</div>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{nz(r.targetCount)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(r.videoPosts)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(r.videoPosters)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(r.videoSales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">
                      {r.videoGmv == null ? "—" : formatYen(r.videoGmv)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(r.liveCount)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(r.livePresenters)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(r.liveSales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">
                      {r.liveGmv == null ? "—" : formatYen(r.liveGmv)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right tabular-nums font-medium ${
                        (r.gapToTarget ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {r.gapToTarget == null ? "—" : r.gapToTarget.toLocaleString("ja-JP")}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-xs max-w-48">{r.activityNote ?? "—"}</td>
                    <td className="py-2 px-2 text-right">
                      <form action={deleteWeekly.bind(null, r.id)}>
                        <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                          削除
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <h2 className="text-sm font-semibold text-slate-700 mt-6 mb-2">週次実績を追加</h2>
      <form action={createWeekly} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <Inp name="weekLabel" label="週 *" required w="w-24" placeholder="6/29週" />
        <Inp name="brand" label="ブランド *" required w="w-28" />
        <Inp name="productSku" label="商品名/SKU" w="w-32" />
        <Inp name="targetCount" label="目標数" type="number" w="w-20" />
        <Inp name="videoPosts" label="動画投稿" type="number" w="w-20" />
        <Inp name="videoSales" label="動画販売" type="number" w="w-20" />
        <Inp name="videoGmv" label="動画GMV" type="number" w="w-24" />
        <Inp name="liveCount" label="ライブ回数" type="number" w="w-20" />
        <Inp name="liveSales" label="ライブ販売" type="number" w="w-20" />
        <Inp name="liveGmv" label="ライブGMV" type="number" w="w-24" />
        <Inp name="gapToTarget" label="目標差分" type="number" w="w-20" />
        <Inp name="activityNote" label="活動記録" w="w-44" />
        <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
          ＋ 追加
        </button>
      </form>
    </div>
  );
}

function Inp({
  name,
  label,
  type = "text",
  required,
  w = "w-24",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  w?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={`rounded-md border border-slate-300 px-2 py-1.5 text-sm ${w}`}
      />
    </label>
  );
}
