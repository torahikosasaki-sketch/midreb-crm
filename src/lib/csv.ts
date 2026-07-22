// CSV生成の共通ヘルパー

const BOM = String.fromCharCode(0xfeff);

function escapeCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** ヘッダー行＋データ行からCSV文字列を生成する（UTF-8 BOM付き、Excel日本語対応） */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}
