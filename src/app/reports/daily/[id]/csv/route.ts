import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { roi, cpa, budgetConsumptionRate, normalizeAnchor, recentBuckets, ymdUtc, type Period } from "@/lib/reports";

const BUCKET_COUNT: Record<Period, number> = { day: 30, week: 12, month: 12 };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period: Period = periodParam === "week" || periodParam === "month" ? periodParam : "day";
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const anchor = normalizeAnchor(period, dateStr);

  const unit = await prisma.salesUnit.findUnique({
    where: { id },
    include: { dailyReports: { orderBy: { reportDate: "asc" } } },
  });
  if (!unit) return new Response("Not Found", { status: 404 });

  const buckets = recentBuckets(unit.dailyReports, period, BUCKET_COUNT[period], anchor);

  const rows = buckets.map((b) => [
    b.label,
    b.data.videoPosts,
    b.data.liveCount,
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
      "広告費",
      "売上GMV",
      "ROI(%)",
      "注文数",
      "CPA",
      "日予算消化率(%)",
      "配送個数",
      "配送金額",
    ],
    rows
  );

  const label = unit.productSku ?? unit.brand;
  const filename = `${label}_${period}_${ymdUtc(anchor)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // 日本語ファイル名はRFC 5987形式(filename*)で指定。filenameは非対応ブラウザ向けの簡易フォールバック
      "Content-Disposition": `attachment; filename="report.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
