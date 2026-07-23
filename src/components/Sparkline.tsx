/** 小さなインラインSVGスパークライン（推移の縮図）。値が全て同じ/空なら平坦線 */
export function Sparkline({
  values,
  color = "#2a78d6",
  width = 88,
  height = 26,
  fill = true,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return <svg width={width} height={height} aria-hidden />;
  const max = Math.max(...clean);
  const min = Math.min(0, ...clean);
  const range = max - min || 1;
  const n = clean.length;
  const step = n > 1 ? width / (n - 1) : 0;
  const y = (v: number) => height - ((v - min) / range) * (height - 3) - 1.5;
  const pts = clean.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
  const line = pts.join(" ");
  const area = `${(0).toFixed(1)},${height} ${line} ${((n - 1) * step).toFixed(1)},${height}`;
  const last = clean[n - 1];
  const lastX = (n - 1) * step;
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      {fill && n > 1 && <polygon points={area} fill={color} opacity={0.1} />}
      {n > 1 && <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}
      <circle cx={lastX} cy={y(last)} r={2.5} fill={color} />
    </svg>
  );
}
