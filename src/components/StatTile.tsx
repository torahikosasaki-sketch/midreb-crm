import { TrendBadge } from "@/components/TrendBadge";
import { Sparkline } from "@/components/Sparkline";

/**
 * KPIスタットタイル: ラベル・値・前期間比バッジ・（任意）スパークライン。
 * accent=true でブランド色の強調カード。size="hero" で大きめのヒーロー数値。
 */
export function StatTile({
  label,
  value,
  deltaPct,
  invert,
  accent,
  spark,
  sparkColor,
  size = "md",
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  invert?: boolean;
  accent?: boolean;
  spark?: number[];
  sparkColor?: string;
  size?: "md" | "hero";
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 ${
        accent ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div className={`text-xs ${accent ? "text-emerald-700" : "text-slate-500"}`}>{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div
          className={`font-bold ${size === "hero" ? "text-3xl" : "text-lg"} ${
            accent ? "text-emerald-700" : "text-slate-800"
          }`}
        >
          {value}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline values={spark} color={sparkColor ?? (accent ? "#1baf7a" : "#94a3b8")} width={size === "hero" ? 120 : 72} height={size === "hero" ? 34 : 24} />
        )}
      </div>
      {deltaPct !== undefined && (
        <div className="mt-1">
          <TrendBadge deltaPct={deltaPct} invert={invert} />
        </div>
      )}
    </div>
  );
}
