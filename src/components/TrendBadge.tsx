/**
 * 前期間比の増減バッジ。invert=trueの指標（CPAなど「下がる方が良い」指標）は色の良し悪しを反転する。
 * deltaAbs を渡すと率のあとに実数（例: +¥12,000）を併記する。
 */
export function TrendBadge({
  deltaPct,
  invert,
  suffix,
  deltaAbs,
}: {
  deltaPct: number | null;
  invert?: boolean;
  suffix?: string;
  deltaAbs?: string | null;
}) {
  if (deltaPct == null) return <span className="text-[11px] text-slate-300">—</span>;
  const tail = suffix ? <span className="ml-1 font-normal text-slate-400">{suffix}</span> : null;
  const abs = deltaAbs ? <span className="ml-1 font-normal text-slate-400">({deltaAbs})</span> : null;
  if (deltaPct === 0)
    return (
      <span className="text-[11px] text-slate-400">
        ±0%{abs}
        {tail}
      </span>
    );
  const isUp = deltaPct > 0;
  const good = invert ? !isUp : isUp;
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold ${good ? "text-emerald-600" : "text-rose-600"}`}>
      {isUp ? "▲" : "▼"}
      {Math.abs(deltaPct)}%{abs}
      {tail}
    </span>
  );
}

/** 符号付きの円差分文字列（例: +¥12,000 / −¥3,000）。前期間値が無ければ null */
export function signedYen(cur: number | null | undefined, prev: number | null | undefined): string | null {
  if (cur == null || prev == null) return null;
  const d = Math.round(cur - prev);
  if (d === 0) return "±¥0";
  const sign = d > 0 ? "+" : "−";
  return `${sign}¥${Math.abs(d).toLocaleString("ja-JP")}`;
}
