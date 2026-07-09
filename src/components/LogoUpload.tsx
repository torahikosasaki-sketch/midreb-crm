"use client";

import { useRef, useState } from "react";

/** 顧客ロゴ: ブラウザ側で最大256pxに縮小してデータURI化し、hidden input で送信 */
export function LogoUpload({ initial }: { initial: string | null }) {
  const [dataUrl, setDataUrl] = useState<string>(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      const max = 256;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(img, 0, 0, w, h);
      let out = canvas.toDataURL("image/webp", 0.9);
      if (out.length > 400000) out = canvas.toDataURL("image/jpeg", 0.8);
      if (out.length > 400000) {
        setError("画像が大きすぎます。より小さい画像をお使いください");
        return;
      }
      setDataUrl(out);
    } catch {
      setError("画像の読み込みに失敗しました");
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="logoUrl" value={dataUrl} />
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt="ロゴ"
          className="h-16 w-16 rounded-lg object-contain border border-slate-200 bg-white"
        />
      ) : (
        <div className="h-16 w-16 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
          ロゴなし
        </div>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            画像を選択
          </button>
          {dataUrl && (
            <button
              type="button"
              onClick={() => setDataUrl("")}
              className="text-xs text-slate-400 hover:text-rose-600"
            >
              削除
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate-400">PNG/JPEG/WebP・自動で縮小されます</span>
        {error && <span className="text-[11px] text-rose-600">{error}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
