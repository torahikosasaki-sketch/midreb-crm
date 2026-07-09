"use client";

import { useState } from "react";
import { EMPLOYEE_ROLES } from "@/lib/enums";
import { updateEmployee, toggleEmployee, deleteEmployee } from "@/lib/actions/employees";

const inputCls = "rounded-md border border-slate-300 px-2 py-1.5 text-sm";

/**
 * 従業員の編集行。入力を controlled にすることで、React 19 の
 * フォーム自動リセット（サーバーアクション後）による編集内容の消失を防ぐ。
 */
export function EmployeeRow({
  id,
  name: initName,
  role: initRole,
  email: initEmail,
  active,
}: {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  active: boolean;
}) {
  const [name, setName] = useState(initName);
  const [role, setRole] = useState(initRole ?? "");
  const [email, setEmail] = useState(initEmail ?? "");

  const roleOptions =
    role && !(EMPLOYEE_ROLES as readonly string[]).includes(role)
      ? [role, ...EMPLOYEE_ROLES]
      : [...EMPLOYEE_ROLES];

  return (
    <div
      className={`flex flex-wrap items-end gap-2 rounded-lg border p-3 ${
        active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"
      }`}
    >
      <form action={updateEmployee.bind(null, id)} className="flex flex-wrap items-end gap-2 flex-1">
        <L label="氏名">
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-40`} />
        </L>
        <L label="役割">
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={`${inputCls} w-32`}>
            <option value="">—</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </L>
        <L label="メール">
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputCls} w-56`}
          />
        </L>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          保存
        </button>
      </form>
      <div className="flex items-center gap-2">
        <form action={toggleEmployee.bind(null, id, !active)}>
          <button
            type="submit"
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
            }`}
            title="クリックで稼働/停止を切替"
          >
            {active ? "稼働中" : "停止中"}
          </button>
        </form>
        <form action={deleteEmployee.bind(null, id)}>
          <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
            削除
          </button>
        </form>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      {children}
    </label>
  );
}
