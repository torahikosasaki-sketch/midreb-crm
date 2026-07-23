/** 前期間比の増減バッジ。invert=trueの指標（CPAなど「下がる方が良い」指標）は色の良し悪しを反転する */
export function TrendBadge({ deltaPct, invert }: { deltaPct: number | null; invert?: boolean }) {
  if (deltaPct == null) return <span className="text-[10px] text-slate-300">—</span>;
  if (deltaPct === 0) return <span className="text-[10px] text-slate-400">±0%</span>;
  const isUp = deltaPct > 0;
  const good = invert ? !isUp : isUp;
  return (
    <span className={`text-[10px] font-semibold ${good ? "text-emerald-600" : "text-rose-600"}`}>
      {isUp ? "▲" : "▼"}
      {Math.abs(deltaPct)}%
    </span>
  );
}
