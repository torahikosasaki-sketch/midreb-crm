import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import {
  roi,
  cpa,
  budgetConsumptionRate,
  sumReports,
  resolvePeriod,
  ymdUtc,
} from "@/lib/reports";
import { unitBrandLabel } from "@/lib/progress";

export async function GET(request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const { searchParams } = new URL(request.url);
  const rp = resolvePeriod({
    period: searchParams.get("period") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  const { start, end } = rp;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      salesUnits: {
        include: {
          dailyReports: { where: { reportDate: { gte: start, lt: end } } },
          account: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!account) return new Response("Not Found", { status: 404 });

  const rows = account.salesUnits.map((u) => {
    const r = sumReports(u.dailyReports);
    return [
      u.productSku ?? unitBrandLabel(u),
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

  const filename = `${account.name}_${rp.kind}_${ymdUtc(rp.start)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brand-report.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
