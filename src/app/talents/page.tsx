import { prisma } from "@/lib/prisma";
import { createTalent, deleteTalent } from "@/lib/actions/talents";
import { TALENT_TYPES } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function TalentsPage() {
  const talents = await prisma.talent.findMany({
    include: { _count: { select: { deals: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-4">クリエイター・パートナー</h1>

      <form
        action={createTalent}
        className="flex flex-wrap items-end gap-2 mb-6 rounded-lg border border-slate-200 bg-white p-3"
      >
        <label className="flex flex-col gap-1 text-xs flex-1 min-w-40">
          <span className="text-slate-500">氏名 *</span>
          <input
            name="name"
            required
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">区分</span>
          <select name="type" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">—</option>
            {TALENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">代理店/パートナー</span>
          <input name="partner" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">利用ストア</span>
          <input name="store" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-28" />
        </label>
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          ＋ 追加
        </button>
      </form>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-4 font-medium">氏名</th>
            <th className="py-2 pr-4 font-medium">区分</th>
            <th className="py-2 pr-4 font-medium">代理店/パートナー</th>
            <th className="py-2 pr-4 font-medium">利用ストア</th>
            <th className="py-2 pr-4 font-medium text-right">関与商談</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {talents.map((t) => (
            <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 pr-4 font-medium">{t.name}</td>
              <td className="py-2 pr-4">
                {t.type && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                    {t.type}
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-slate-600">{t.partner ?? "—"}</td>
              <td className="py-2 pr-4 text-slate-600">{t.store ?? "—"}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{t._count.deals}</td>
              <td className="py-2 text-right">
                <form action={deleteTalent.bind(null, t.id)}>
                  <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                    削除
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {talents.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-slate-400">
                人材が登録されていません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
