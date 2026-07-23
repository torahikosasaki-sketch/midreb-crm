import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { roi, cpa, budgetConsumptionRate, resolvePeriod, recentBuckets, ymdUtc } from "@/lib/reports";
import { unitBrandLabel } from "@/lib/progress";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const rp = resolvePeriod({
    period: searchParams.get("period") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const unit = await prisma.salesUnit.findUnique({
    where: { id },
    include: {
      dailyReports: { orderBy: { reportDate: "asc" } },
      weeks: { select: { weekStart: true, videoPosts: true, liveCount: true, videoGmv: true, liveGmv: true } },
      account: { select: { name: true } },
    },
  });
  if (!unit) return new Response("Not Found", { status: 404 });

  const buckets = recentBuckets(unit.dailyReports, rp, unit.weeks);

  const rows = buckets.map((b) => [
    b.label,
    b.data.videoPosts,
    b.data.liveCount,
    b.data.videoGmv,
    b.data.liveGmv,
    b.data.adSpend,
    b.data.adGmv,
    roi(b.data),
    b.data.orderCount,
    cpa(b.data),
    budgetConsumptionRate(b.data, unit.dailyAdBudget),
    b.data.shippingQty,
    b.data.shippingAmount,
  ]);

  const csv = toCsv(
    [
      "期間",
      "動画投稿数",
      "ライブ実施回数",
      "動画経由GMV",
      "ライブ経由GMV",
      "広告費",
      "広告経由GMV",
      "ROI(%)",
      "注文数",
      "CPA",
      "日予算消化率(%)",
      "配送個数",
      "配送金額",
    ],
    rows
  );

  const label = unit.productSku ?? unitBrandLabel(unit);
  const filename = `${label}_${rp.kind}_${ymdUtc(rp.start)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // 日本語ファイル名はRFC 5987形式(filename*)で指定。filenameは非対応ブラウザ向けの簡易フォールバック
      "Content-Disposition": `attachment; filename="report.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
