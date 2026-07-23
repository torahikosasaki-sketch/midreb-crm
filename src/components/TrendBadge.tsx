/** 前期間比の増減バッジ。invert=trueの指標（CPAなど「下がる方が良い」指標）は色の良し悪しを反転する */
export function TrendBadge({
  deltaPct,
  invert,
  suffix,
}: {
  deltaPct: number | null;
  invert?: boolean;
  suffix?: string;
}) {
  if (deltaPct == null) return <span className="text-[11px] text-slate-300">—</span>;
  const tail = suffix ? <span className="ml-1 font-normal text-slate-400">{suffix}</span> : null;
  if (deltaPct === 0)
    return (
      <span className="text-[11px] text-slate-400">
        ±0%{tail}
      </span>
    );
  const isUp = deltaPct > 0;
  const good = invert ? !isUp : isUp;
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold ${good ? "text-emerald-600" : "text-rose-600"}`}>
      {isUp ? "▲" : "▼"}
      {Math.abs(deltaPct)}%{tail}
    </span>
  );
}
