import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import {
  roi,
  cpa,
  budgetConsumptionRate,
  sumReports,
  withWeeklyCreative,
  normalizeAnchor,
  periodRange,
  ymdUtc,
  type Period,
} from "@/lib/reports";
import { unitBrandLabel } from "@/lib/progress";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period: Period = periodParam === "week" || periodParam === "month" ? periodParam : "day";
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const anchor = normalizeAnchor(period, dateStr);
  const { start, end } = periodRange(period, anchor);

  const units = await prisma.salesUnit.findMany({
    where: { status: "稼働中" },
    include: {
      dailyReports: { where: { reportDate: { gte: start, lt: end } } },
      weeks: { select: { weekStart: true, videoPosts: true, liveCount: true } },
      account: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = units.map((u) => {
    const r = withWeeklyCreative(sumReports(u.dailyReports), u.weeks, period, start, end);
    return [
      u.productSku ?? unitBrandLabel(u),
      unitBrandLabel(u),
      r.videoPosts,
      r.liveCount,
      r.adSpend,
      r.adGmv,
      roi(r),
      r.orderCount,
      cpa(r),
      budgetConsumptionRate(r, u.dailyAdBudget),
      r.shippingQty,
      r.shippingAmount,
    ];
  });

  const csv = toCsv(
    [
      "販売単位",
      "ブランド",
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

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="daily-report_${period}_${ymdUtc(anchor)}.csv"`,
    },
  });
}
