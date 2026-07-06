import { prisma } from "@/lib/prisma";
import { linesMrr, linesOneTime, linesAcv, KANBAN_PHASES } from "@/lib/enums";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Filters } from "@/components/Filters";
import type { DealCard } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ businessType?: string; owner?: string }>;
}) {
  const sp = await searchParams;

  // カンバンは締結前の商談＋受注(契約)/保留/失注のみ。運用中などの契約後は顧客側で管理。
  const deals = await prisma.deal.findMany({
    where: {
      phase: { in: KANBAN_PHASES as string[] },
      ...(sp.businessType ? { businessType: sp.businessType } : {}),
      ...(sp.owner ? { owner: sp.owner } : {}),
    },
    include: { account: { select: { name: true } }, lineItems: true },
    orderBy: { position: "asc" },
  });

  const cards: DealCard[] = deals.map((d) => {
    const mrr = linesMrr(d.lineItems);
    const oneTime = linesOneTime(d.lineItems);
    const acv = linesAcv(d.lineItems);
    return {
      id: d.id,
      accountName: d.account?.name ?? null,
      businessType: d.businessType,
      phase: d.phase,
      probability: d.probability,
      mrr,
      oneTime,
      acv,
      weightedAcv: Math.round(acv * d.probability),
      owner: d.owner,
      expectedCloseDate: d.expectedCloseDate?.toISOString() ?? null,
      nextActionDate: d.nextActionDate?.toISOString() ?? null,
      position: d.position,
    };
  });

  const ownerRows = await prisma.deal.findMany({
    where: { owner: { not: null } },
    select: { owner: true },
    distinct: ["owner"],
  });
  const owners = ownerRows.map((r) => r.owner!).filter(Boolean).sort();

  return (
    <div className="flex flex-col h-full min-h-0">
      <Filters owners={owners} />
      <div className="flex-1 min-h-0">
        <KanbanBoard deals={cards} />
      </div>
    </div>
  );
}
