import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployee,
} from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

const inputCls = "rounded-md border border-slate-300 px-2 py-1.5 text-sm";

export default async function SettingsPage() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const activeCount = employees.filter((e) => e.active).length;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-1">設定</h1>
      <p className="text-xs text-slate-400 mb-6">
        従業員（担当者）マスタなど、アプリ全体で使う設定を管理します。
      </p>

      {/* 従業員 */}
      <section className="mb-10">
        <div className="flex items-baseline gap-2 mb-2">
          <h2 className="text-sm font-semibold text-slate-700">従業員（担当者マスタ）</h2>
          <span className="text-xs text-slate-400">
            稼働中 {activeCount} / 全 {employees.length}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          ここで登録した稼働中の従業員が、商談・顧客・活動ログの「担当者」の選択肢になります。
        </p>

        {/* 追加 */}
        <form
          action={createEmployee}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 mb-4"
        >
          <L label="氏名 *">
            <input name="name" required className={`${inputCls} w-40`} />
          </L>
          <L label="役割">
            <input name="role" placeholder="営業 / 運用 / PM" className={`${inputCls} w-32`} />
          </L>
          <L label="メール">
            <input name="email" type="email" className={`${inputCls} w-56`} />
          </L>
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            ＋ 従業員を追加
          </button>
        </form>

        {/* 一覧（各行が編集フォーム） */}
        <div className="space-y-2">
          {employees.length === 0 && (
            <p className="text-sm text-slate-400">従業員が登録されていません。</p>
          )}
          {employees.map((e) => (
            <div
              key={e.id}
              className={`flex flex-wrap items-end gap-2 rounded-lg border p-3 ${
                e.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"
              }`}
            >
              <form action={updateEmployee.bind(null, e.id)} className="flex flex-wrap items-end gap-2 flex-1">
                <L label="氏名">
                  <input name="name" defaultValue={e.name} className={`${inputCls} w-40`} />
                </L>
                <L label="役割">
                  <input name="role" defaultValue={e.role ?? ""} className={`${inputCls} w-32`} />
                </L>
                <L label="メール">
                  <input name="email" type="email" defaultValue={e.email ?? ""} className={`${inputCls} w-56`} />
                </L>
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  保存
                </button>
              </form>
              <div className="flex items-center gap-2">
                <form action={toggleEmployee.bind(null, e.id, !e.active)}>
                  <button
                    type="submit"
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      e.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                    title="クリックで稼働/停止を切替"
                  >
                    {e.active ? "稼働中" : "停止中"}
                  </button>
                </form>
                <form action={deleteEmployee.bind(null, e.id)}>
                  <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                    削除
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* その他の設定 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">その他の設定</h2>
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 text-sm">
          <Link href="/targets" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
            <span>目標 vs 実績（フェーズ計画・目標値の管理）</span>
            <span className="text-emerald-600">→</span>
          </Link>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          ※ 事業区分タグや代理店マスタの設定化、CSV入出力などは今後ここに追加できます。
        </p>
      </section>
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
