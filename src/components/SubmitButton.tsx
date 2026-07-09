"use client";

import { useFormStatus } from "react-dom";

/**
 * 送信ボタン。送信中は自動でスピナー表示＋無効化し、押下フィードバックを出す。
 * className でボタンの見た目を渡す（既存の各ボタンと同じスタイルを指定）。
 */
export function SubmitButton({
  children,
  className = "",
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {pending && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin opacity-80" />
      )}
      {pending ? pendingLabel ?? children : children}
    </button>
  );
}
