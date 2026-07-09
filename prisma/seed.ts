import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type SeedData = {
  accounts: Record<string, unknown>[];
  deals: Record<string, unknown>[];
};

const d = (v: unknown): Date | null => (v ? new Date(String(v)) : null);
const s = (v: unknown): string | null => (v == null ? null : String(v));
const n = (v: unknown): number | null => (v == null ? null : Math.round(Number(v)));

async function main() {
  const data: SeedData = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data.json"), "utf-8")
  );

  // 冪等にするため全消去（開発用seed）
  await prisma.dealLineItem.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.weeklyProgress.deleteMany();
  await prisma.salesUnit.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.account.deleteMany();
  await prisma.target.deleteMany();
  await prisma.employee.deleteMany();

  // 従業員（担当者マスタ・デモ用）
  const employees = [
    { name: "田中", role: "営業" },
    { name: "佐藤", role: "営業" },
    { name: "鈴木", role: "運用" },
    { name: "高橋", role: "PM" },
  ];
  for (const e of employees) await prisma.employee.create({ data: e });

  // 顧客企業
  const accountIdByName = new Map<string, string>();
  for (const a of data.accounts) {
    const created = await prisma.account.create({
      data: {
        name: String(a.name),
        businessTypes: a.businessType ? [String(a.businessType)] : [],
        industry: s(a.industry),
        region: s(a.region),
        targetTier: s(a.targetTier),
        owner: s(a.owner),
        status: s(a.status),
        contactName: s(a.contactName),
        email: s(a.email),
        phone: s(a.phone),
        firstContactDate: d(a.firstContactDate),
        salesTarget: n(a.salesTarget),
      },
    });
    accountIdByName.set(created.name, created.id);
  }

  // 商談（次回アクション日・担当者はデモ用に補完）
  const demoOwners = ["田中", "佐藤", "鈴木"];
  const dayMs = 86400000;
  const now = new Date();
  let pos = 0;
  let di = 0;
  for (const dl of data.deals) {
    const owner = s(dl.owner) ?? demoOwners[di % demoOwners.length];
    let nextAction = d(dl.nextActionDate);
    if (!nextAction) {
      const offset = [-3, 0, 2, 7, -1][di % 5];
      nextAction = new Date(now.getTime() + offset * dayMs);
    }
    const phase = di === 0 ? "運用中" : String(dl.phase ?? "初回接触");
    const probability = di === 0 ? 1.0 : Number(dl.probability ?? 0);

    const expected = Number(dl.expectedRevenue ?? 0);
    const created = await prisma.deal.create({
      data: {
        accountId: accountIdByName.get(String(dl.accountName)) ?? null,
        businessType: String(dl.businessType ?? "storeb"),
        phase,
        probability,
        inflowChannel: s(dl.inflowChannel),
        agencyName: s(dl.agencyName),
        owner,
        expectedCloseDate: d(dl.expectedCloseDate),
        nextActionDate: nextAction,
        chatTool: s(dl.chatTool),
        channelName: s(dl.channelName),
        contractStatus: s(dl.contractStatus),
        contractType: s(dl.contractType),
        contractLink: s(dl.contractLink),
        memo: dl._sample ? "(想定売上はサンプル値)" : s(dl.memo),
        position: pos++,
      },
    });

    // 明細（デモ用）: 月次定額を基本に、一部へ初期費用(単発)を付与。締結後は契約中/一部解約。
    const contracted = ["契約", "オンボーディング", "運用中"].includes(phase);
    const monthly = Math.max(50000, Math.round(expected / 12 / 10000) * 10000);
    const svc = s(dl.services)?.split(/[,、]/)[0]?.trim() || "運用支援";
    let lpos = 0;
    await prisma.dealLineItem.create({
      data: {
        dealId: created.id,
        name: svc,
        billingType: "月次定額",
        amount: monthly,
        quantity: 1,
        contractStart: contracted ? new Date(now.getTime() - 30 * dayMs) : null,
        contractEnd: contracted ? new Date(now.getTime() + 335 * dayMs) : null,
        // 運用中の1件だけ解約デモ
        status: phase === "運用中" && di % 4 === 0 ? "解約" : "契約中",
        churnDate: phase === "運用中" && di % 4 === 0 ? new Date(now.getTime() - 5 * dayMs) : null,
        position: lpos++,
      },
    });
    if (di % 3 === 0) {
      await prisma.dealLineItem.create({
        data: {
          dealId: created.id,
          name: "初期構築費",
          billingType: "単発",
          amount: Math.max(100000, Math.round((expected * 0.2) / 10000) * 10000),
          quantity: 1,
          position: lpos++,
        },
      });
    }
    di++;
  }

  // デモ: 顧客の事業タグを、紐づく商談の事業区分の和集合で補完（複数タグ化）
  const withDeals = await prisma.account.findMany({
    include: { deals: { select: { businessType: true } } },
  });
  for (const a of withDeals) {
    const tags = [...new Set([...a.businessTypes, ...a.deals.map((d) => d.businessType)])];
    if (tags.length !== a.businessTypes.length) {
      await prisma.account.update({ where: { id: a.id }, data: { businessTypes: tags } });
    }
  }

  // 進捗管理（販売単位 × 週次実績・デモ用）
  const mondayOf = (base: Date, offsetWeeks: number) => {
    const x = new Date(base.getTime() + offsetWeeks * 7 * dayMs);
    const day = (x.getDay() + 6) % 7; // 月曜=0
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const units = [
    {
      brand: "PIBU", productSku: "PIBU 単品", store: "storeb", weeklyTarget: 100,
      weeks: [
        { off: -2, videoPosts: 40, videoPosters: 20, videoSales: 5, videoGmv: 9900, liveCount: 2, livePresenters: 2, liveSales: 30, liveGmv: 297000, activityNote: "動画好調、ライブ初回実施" },
        { off: -1, videoPosts: 55, videoPosters: 28, videoSales: 12, videoGmv: 23760, liveCount: 3, livePresenters: 3, liveSales: 48, liveGmv: 475200, activityNote: "ライブ強化で販売増" },
        { off: 0, videoPosts: 60, videoPosters: 30, videoSales: 20, videoGmv: 39600, liveCount: 4, livePresenters: 4, liveSales: 72, liveGmv: 712800, activityNote: "定番化、KOL追加" },
      ],
    },
    {
      brand: "PIBU", productSku: "PIBU 2個セット", store: "PIBU", weeklyTarget: 50,
      weeks: [
        { off: -1, videoPosts: 10, videoPosters: 6, videoSales: 2, videoGmv: 7920, liveCount: 0, livePresenters: 0, liveSales: 0, liveGmv: 0, activityNote: "セット訴求は動画中心" },
        { off: 0, videoPosts: 14, videoPosters: 8, videoSales: 6, videoGmv: 23760, liveCount: 1, livePresenters: 1, liveSales: 8, liveGmv: 63360, activityNote: "初ライブで反応あり" },
      ],
    },
    {
      brand: "dermashare", productSku: "スティックファンデ", store: "storeb", weeklyTarget: 80,
      weeks: [
        { off: 0, videoPosts: 22, videoPosters: 12, videoSales: 18, videoGmv: 53640, liveCount: 1, livePresenters: 1, liveSales: 25, liveGmv: 74500, activityNote: "CV率改善、在庫潤沢" },
      ],
    },
  ];
  let weeklyCount = 0;
  for (const u of units) {
    const { weeks, ...unitData } = u;
    const created = await prisma.salesUnit.create({ data: unitData });
    for (const w of weeks) {
      const { off, ...metrics } = w;
      await prisma.weeklyProgress.create({
        data: { salesUnitId: created.id, weekStart: mondayOf(now, off), ...metrics },
      });
      weeklyCount++;
    }
  }

  // 目標（成長計画のフェーズ別）
  const targets = [
    { label: "フェーズ1 (現行)", monthlyGmvTarget: 5000000, sellerTarget: 5, creatorTarget: 5, productionTarget: 30 },
    { label: "フェーズ2 (拡大)", monthlyGmvTarget: 20000000, sellerTarget: 15, creatorTarget: 12, productionTarget: 120 },
    { label: "フェーズ3 (スケール)", monthlyGmvTarget: 80000000, sellerTarget: 40, creatorTarget: 30, productionTarget: 400 },
  ];
  for (const t of targets) await prisma.target.create({ data: t });

  const lineCount = await prisma.dealLineItem.count();
  console.log(
    `seeded: ${data.accounts.length} accounts, ${data.deals.length} deals, ${lineCount} lineItems, ${units.length} salesUnits, ${weeklyCount} weeklyProgress, ${targets.length} targets`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
