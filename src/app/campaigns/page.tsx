import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import { createCampaign, deleteCampaign } from "@/lib/actions/campaigns";

export const dynamic = "force-dynamic";

const nz = (n: number | null) => (n == null ? "—" : n.toLocaleString("ja-JP"));

export default async function CampaignsPage() {
  const items = await prisma.campaign.findMany({
    orderBy: [{ brand: "asc" }, { productSku: "asc" }],
  });

  const totalVideoGmv = items.reduce((s, c) => s + (c.videoGmv ?? 0), 0);
  const totalLiveGmv = items.reduce((s, c) => s + (c.liveGmv ?? 0), 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <div className="text-sm text-slate-500">
          {items.length} 件 ・ 動画GMV{" "}
          <span className="font-semibold text-sky-700">{formatYen(totalVideoGmv)}</span> ・ ライブGMV{" "}
          <span className="font-semibold text-sky-700">{formatYen(totalLiveGmv)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-medium">ブランド / 商品</th>
              <th className="py-2 pr-3 font-medium text-right">総アサイン</th>
              <th className="py-2 pr-3 font-medium text-right">総販売</th>
              <th className="py-2 pr-3 font-medium text-right">総売上</th>
              <th className="py-2 pr-3 font-medium text-right bg-sky-50/50">動画投稿</th>
              <th className="py-2 pr-3 font-medium text-right bg-sky-50/50">動画人数</th>
              <th className="py-2 pr-3 font-medium text-right bg-sky-50/50">動画販売</th>
              <th className="py-2 pr-3 font-medium text-right bg-sky-50/50">動画GMV</th>
              <th className="py-2 pr-3 font-medium text-right bg-violet-50/50">ライブ回数</th>
              <th className="py-2 pr-3 font-medium text-right bg-violet-50/50">ライブ人数</th>
              <th className="py-2 pr-3 font-medium text-right bg-violet-50/50">ライブ販売</th>
              <th className="py-2 pr-3 font-medium text-right bg-violet-50/50">ライブGMV</th>
              <th className="py-2 pr-3 font-medium">代理店</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-3">
                  <div className="font-medium">{c.brand}</div>
                  <div className="text-xs text-slate-400">{c.productSku ?? "—"}</div>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{nz(c.totalAssign)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{nz(c.totalSales)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {c.totalRevenue == null ? "—" : formatYen(c.totalRevenue)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums bg-sky-50/30">{nz(c.videoPosts)}</td>
                <td className="py-2 pr-3 text-right tabular-nums bg-sky-50/30">{nz(c.videoPosters)}</td>
                <td className="py-2 pr-3 text-right tabular-nums bg-sky-50/30">{nz(c.videoSales)}</td>
                <td className="py-2 pr-3 text-right tabular-nums bg-sky-50/30">
                  {c.videoGmv == null ? "—" : formatYen(c.videoGmv)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums bg-violet-50/30">{nz(c.liveCount)}</td>
                <td className="py-2 pr-3 text-right tabular-nums bg-violet-50/30">{nz(c.livePresenters)}</td>
                <td className="py-2 pr-3 text-right tabular-nums bg-violet-50/30">{nz(c.liveSales)}</td>
                <td className="py-2 pr-3 text-right tabular-nums bg-violet-50/30">
                  {c.liveGmv == null ? "—" : formatYen(c.liveGmv)}
                </td>
                <td className="py-2 pr-3 text-slate-500 text-xs">{c.partner ?? "—"}</td>
                <td className="py-2 text-right">
                  <form action={deleteCampaign.bind(null, c.id)}>
                    <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                      削除
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={14} className="py-10 text-center text-slate-400">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="text-sm font-semibold text-slate-700 mt-8 mb-2">行を追加</h2>
        <form action={createCampaign} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <Inp name="brand" label="ブランド *" required w="w-32" />
          <Inp name="productSku" label="商品名/SKU" w="w-36" />
          <Inp name="totalAssign" label="総アサイン" type="number" w="w-20" />
          <Inp name="totalSales" label="総販売" type="number" w="w-20" />
          <Inp name="videoPosts" label="動画投稿" type="number" w="w-20" />
          <Inp name="videoSales" label="動画販売" type="number" w="w-20" />
          <Inp name="videoGmv" label="動画GMV" type="number" w="w-24" />
          <Inp name="liveCount" label="ライブ回数" type="number" w="w-20" />
          <Inp name="liveSales" label="ライブ販売" type="number" w="w-20" />
          <Inp name="liveGmv" label="ライブGMV" type="number" w="w-24" />
          <Inp name="partner" label="代理店" w="w-24" />
          <button type="submit" className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700">
            ＋ 追加
          </button>
        </form>
      </div>
    </div>
  );
}

function Inp({
  name,
  label,
  type = "text",
  required,
  w = "w-24",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  w?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className={`rounded-md border border-slate-300 px-2 py-1.5 text-sm ${w}`}
      />
    </label>
  );
}
