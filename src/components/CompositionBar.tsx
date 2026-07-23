import { CH } from "@/lib/reportColors";

const yen = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");

/**
 * チャネル構成の水平100%積み上げ帯（動画GMV / ライブGMV の part-to-whole）。
 * 2px のサーフェスギャップでセグメントを分離し、直値ラベルと凡例を併記する。
 */
export function CompositionBar({ video, live }: { video: number; live: number }) {
  const total = video + live;
  if (total <= 0) {
    return <p className="text-sm text-slate-400">チャネル別の売上データがありません。</p>;
  }
  const videoPct = Math.round((video / total) * 100);
  const livePct = 100 - videoPct;

  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-md bg-slate-100" role="img" aria-label={`動画 ${videoPct}% / ライブ ${livePct}%`}>
        {video > 0 && (
          <div
            className="flex items-center justify-center text-[11px] font-semibold text-white"
            style={{ width: `${videoPct}%`, backgroundColor: CH.video, marginRight: live > 0 ? 2 : 0 }}
          >
            {videoPct >= 12 ? `${videoPct}%` : ""}
          </div>
        )}
        {live > 0 && (
          <div
            className="flex items-center justify-center text-[11px] font-semibold text-white"
            style={{ width: `${livePct}%`, backgroundColor: CH.live }}
          >
            {livePct >= 12 ? `${livePct}%` : ""}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <LegendItem color={CH.video} label="動画経由" value={yen(video)} />
        <LegendItem color={CH.live} label="ライブ経由" value={yen(live)} />
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700 tabular-nums">{value}</span>
    </span>
  );
}
