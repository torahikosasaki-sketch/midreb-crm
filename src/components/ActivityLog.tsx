"use client";

import { useRef } from "react";
import { ACTIVITY_TYPES } from "@/lib/enums";
import { createActivity, deleteActivity } from "@/lib/actions/activities";
import { SubmitButton } from "@/components/SubmitButton";

export type ActivityItem = {
  id: string;
  type: string;
  content: string | null;
  owner: string | null;
  occurredAt: string; // ISO
};

const TYPE_STYLE: Record<string, string> = {
  架電: "bg-teal-100 text-teal-700",
  MTG: "bg-violet-100 text-violet-700",
  提案送付: "bg-amber-100 text-amber-700",
  メール: "bg-emerald-100 text-emerald-700",
  その他: "bg-slate-100 text-slate-700",
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function ActivityLog({
  dealId,
  activities,
  owners,
}: {
  dealId: string;
  activities: ActivityItem[];
  owners: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const create = createActivity.bind(null, dealId);

  return (
    <div>
      <form
        ref={formRef}
        action={async (fd) => {
          await create(fd);
          formRef.current?.reset();
        }}
        className="flex flex-wrap items-end gap-2 mb-4 rounded-lg border border-slate-200 bg-white p-3"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">種別</span>
          <select
            name="type"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs flex-1 min-w-48">
          <span className="text-slate-500">内容</span>
          <input
            name="content"
            placeholder="例: 初回ヒアリング実施"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">担当者</span>
          <select
            name="owner"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-28"
          >
            <option value="">—</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">発生日時</span>
          <input
            name="occurredAt"
            type="datetime-local"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <SubmitButton
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          pendingLabel="記録中…"
        >
          記録
        </SubmitButton>
      </form>

      {activities.length === 0 ? (
        <p className="text-sm text-slate-400">活動ログはまだありません</p>
      ) : (
        <ol className="relative border-l border-slate-200 ml-2">
          {activities.map((a) => (
            <li key={a.id} className="mb-4 ml-4">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    TYPE_STYLE[a.type] ?? TYPE_STYLE["その他"]
                  }`}
                >
                  {a.type}
                </span>
                <time className="text-xs text-slate-400">{fmt(a.occurredAt)}</time>
                {a.owner && <span className="text-xs text-slate-500">{a.owner}</span>}
                <form action={deleteActivity.bind(null, a.id, dealId)} className="ml-auto">
                  <button
                    type="submit"
                    className="text-xs text-slate-400 hover:text-rose-600"
                  >
                    削除
                  </button>
                </form>
              </div>
              {a.content && <p className="mt-1 text-sm text-slate-700">{a.content}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
