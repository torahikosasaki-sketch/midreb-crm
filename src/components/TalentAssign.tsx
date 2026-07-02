"use client";

import { assignTalent, unassignTalent } from "@/lib/actions/talents";

type TalentOption = { id: string; name: string; type: string | null };

export function TalentAssign({
  dealId,
  assigned,
  available,
}: {
  dealId: string;
  assigned: TalentOption[];
  available: TalentOption[];
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {assigned.length === 0 && (
          <span className="text-sm text-slate-400">アサイン人材なし</span>
        )}
        {assigned.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1.5 py-1 text-sm"
          >
            {t.name}
            {t.type && <span className="text-[10px] text-slate-500">{t.type}</span>}
            <form action={unassignTalent.bind(null, dealId, t.id)}>
              <button
                type="submit"
                className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                aria-label="解除"
              >
                ×
              </button>
            </form>
          </span>
        ))}
      </div>
      {available.length > 0 && (
        <form action={assignTalent.bind(null, dealId)} className="flex items-center gap-2">
          <select
            name="talentId"
            defaultValue=""
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
          >
            <option value="" disabled>
              人材を選択…
            </option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.type ? `（${t.type}）` : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ＋ アサイン
          </button>
        </form>
      )}
    </div>
  );
}
