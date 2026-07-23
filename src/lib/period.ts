// レポート集計期間の一般化モデル。
// 週は「金曜開始〜木曜終わり」。日次/週次/月次に加えて任意範囲（custom）を表現する。
// 自己完結（他libに依存しない）ことで reports.ts など上位から一方向に利用させる。

export type PeriodKind = "day" | "week" | "month" | "custom";

/** 解決済み期間。start(含む)〜end(排他)。すべてUTC深夜。 */
export type ResolvedPeriod = {
  kind: PeriodKind;
  start: Date;
  end: Date; // 排他的（次期間の開始）
  label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD"(UTC深夜) を安全にDateへ。無効/未指定は当日UTC深夜。 */
export function startOfDay(d?: string | Date | null): Date {
  if (d == null) {
    const t = new Date();
    t.setUTCHours(0, 0, 0, 0);
    return t;
  }
  const t = typeof d === "string" ? new Date(d) : new Date(d.getTime());
  if (isNaN(t.getTime())) {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now;
  }
  t.setUTCHours(0, 0, 0, 0);
  return t;
}

/** yyyy-mm-dd (UTC基準) */
export function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "M/D" ラベル */
export function mdLabel(d: Date): string {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** その日を含む週の「金曜(UTC深夜)」を返す。dow: 0=日,1=月,...,5=金,6=土 */
export function weekStartOf(d: Date): Date {
  const t = startOfDay(d);
  const dow = t.getUTCDay();
  const back = (dow - 5 + 7) % 7; // 金曜まで戻る日数
  t.setUTCDate(t.getUTCDate() - back);
  return t;
}

/** その月の1日(UTC深夜) */
export function firstOfMonth(d: Date): Date {
  const t = startOfDay(d);
  t.setUTCDate(1);
  return t;
}

function addDays(d: Date, n: number): Date {
  const t = new Date(d.getTime());
  t.setUTCDate(t.getUTCDate() + n);
  return t;
}

function dayCount(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/** 週(金〜木)のラベル: "6/19週(6/19〜6/25)" */
function weekLabel(start: Date, end: Date): string {
  const last = addDays(end, -1);
  return `${mdLabel(start)}週(${mdLabel(start)}〜${mdLabel(last)})`;
}

/** カスタム範囲ラベル: "6/19〜6/25(7日間)" */
function customLabel(start: Date, end: Date): string {
  const last = addDays(end, -1);
  const days = dayCount(start, end);
  if (days <= 1) return ymdUtc(start);
  return `${mdLabel(start)}〜${mdLabel(last)}（${days}日間）`;
}

/** kind と start から end・label を作って ResolvedPeriod を組み立てる（day/week/month） */
function build(kind: Exclude<PeriodKind, "custom">, start: Date): ResolvedPeriod {
  if (kind === "day") {
    const end = addDays(start, 1);
    return { kind, start, end, label: ymdUtc(start) };
  }
  if (kind === "week") {
    const s = weekStartOf(start);
    const end = addDays(s, 7);
    return { kind, start: s, end, label: weekLabel(s, end) };
  }
  // month
  const s = firstOfMonth(start);
  const end = new Date(s.getTime());
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { kind, start: s, end, label: `${s.getUTCFullYear()}年${s.getUTCMonth() + 1}月` };
}

/** 単位期間（day/week/month）の ResolvedPeriod を、日付を含む区切りとして得る（推移バケット等に利用） */
export function unitPeriod(unit: Exclude<PeriodKind, "custom">, d: Date | string): ResolvedPeriod {
  return build(unit, startOfDay(d));
}

/** 任意範囲の ResolvedPeriod。from<=to（両端含む日付）。endは to の翌日(排他)。 */
export function buildCustom(fromStr: string, toStr: string): ResolvedPeriod {
  let start = startOfDay(fromStr);
  let last = startOfDay(toStr);
  if (last.getTime() < start.getTime()) [start, last] = [last, start];
  const end = addDays(last, 1);
  return { kind: "custom", start, end, label: customLabel(start, end) };
}

/**
 * URLクエリ（period/date、または period=custom&from&to）から期間を解決する。
 * 不正・未指定は当日基準にフォールバック。
 */
export function resolvePeriod(params: {
  period?: string;
  date?: string;
  from?: string;
  to?: string;
}): ResolvedPeriod {
  const { period, date, from, to } = params;
  if (period === "custom") {
    if (from && to) return buildCustom(from, to);
    // from のみ + 日数指定は resolvePeriod では扱わず、UI側で to を計算して渡す想定。
    const base = from ?? date ?? ymdUtc(startOfDay());
    return buildCustom(base, base);
  }
  const kind: Exclude<PeriodKind, "custom"> =
    period === "week" || period === "month" || period === "day" ? period : "day";
  return build(kind, startOfDay(date));
}

/** 前の同じ長さの期間（day=前日 / week=先週 / month=先月 / custom=同日数だけ手前）。 */
export function previousPeriod(rp: ResolvedPeriod): ResolvedPeriod {
  if (rp.kind === "day") return build("day", addDays(rp.start, -1));
  if (rp.kind === "week") return build("week", addDays(rp.start, -7));
  if (rp.kind === "month") {
    const prev = new Date(rp.start.getTime());
    prev.setUTCMonth(prev.getUTCMonth() - 1);
    return build("month", prev);
  }
  // custom: 同じ日数だけ手前へ
  const days = dayCount(rp.start, rp.end);
  const start = addDays(rp.start, -days);
  const end = addDays(rp.end, -days);
  return { kind: "custom", start, end, label: customLabel(start, end) };
}

/** 次の同じ長さの期間（前後移動UI用） */
export function nextPeriod(rp: ResolvedPeriod): ResolvedPeriod {
  if (rp.kind === "day") return build("day", addDays(rp.start, 1));
  if (rp.kind === "week") return build("week", addDays(rp.start, 7));
  if (rp.kind === "month") {
    const next = new Date(rp.start.getTime());
    next.setUTCMonth(next.getUTCMonth() + 1);
    return build("month", next);
  }
  const days = dayCount(rp.start, rp.end);
  const start = addDays(rp.start, days);
  const end = addDays(rp.end, days);
  return { kind: "custom", start, end, label: customLabel(start, end) };
}

/** 比較対象を指す言葉 */
export function previousPeriodWord(rp: ResolvedPeriod): string {
  return rp.kind === "day" ? "前日" : rp.kind === "week" ? "先週" : rp.kind === "month" ? "先月" : "前期間";
}

/** 手動サマリー等の保存キー（決定的） */
export function periodKey(rp: ResolvedPeriod): string {
  return `${rp.kind}:${ymdUtc(rp.start)}:${ymdUtc(rp.end)}`;
}

/** 期間を維持したままURLへ載せるクエリ断片 */
export function periodQuery(rp: ResolvedPeriod): string {
  if (rp.kind === "custom") {
    const last = addDays(rp.end, -1);
    return `period=custom&from=${ymdUtc(rp.start)}&to=${ymdUtc(last)}`;
  }
  return `period=${rp.kind}&date=${ymdUtc(rp.start)}`;
}

/**
 * 推移グラフのバケット設定。day=直近30日 / week=直近12週 / month=直近12ヶ月。
 * custom は範囲内を日次バケットで表示（長すぎる場合は週次に切替）。
 */
export function bucketConfig(rp: ResolvedPeriod): { unit: Exclude<PeriodKind, "custom">; count: number } {
  if (rp.kind === "day") return { unit: "day", count: 30 };
  if (rp.kind === "week") return { unit: "week", count: 12 };
  if (rp.kind === "month") return { unit: "month", count: 12 };
  // custom
  const days = dayCount(rp.start, rp.end);
  if (days <= 45) return { unit: "day", count: days };
  if (days <= 365) return { unit: "week", count: Math.ceil(days / 7) };
  return { unit: "month", count: Math.ceil(days / 30) };
}
