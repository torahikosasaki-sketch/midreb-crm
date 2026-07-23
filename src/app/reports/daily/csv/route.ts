import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import {
  roi,
  cpa,
  budgetConsumptionRate,
  sumReports,
  withWeeklyCreative,
  resolvePeriod,
  ymdUtc,
} from "@/lib/reports";
import { unitBrandLabel } from "@/lib/progress";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rp = resolvePeriod({
    period: searchParams.get("period") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  const { start, end } = rp;

  const units = await prisma.salesUnit.findMany({
    where: { status: "稼働中" },
    include: {
      dailyReports: { where: { reportDate: { gte: start, lt: end } } },
      weeks: { select: { weekStart: true, videoPosts: true, liveCount: true, videoGmv: true, liveGmv: true } },
      account: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = units.map((u) => {
    const r = withWeeklyCreative(sumReports(u.dailyReports), u.weeks, start, end);
    return [
      u.productSku ?? unitBrandLabel(u),
      unitBrandLabel(u),
      r.videoPosts,
      r.liveCount,
      r.videoGmv,
      r.liveGmv,
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

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="daily-report_${rp.kind}_${ymdUtc(rp.start)}.csv"`,
    },
  });
}
