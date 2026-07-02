"use client";

import { Button } from "@/components/ui";

export function DeleteButton({
  action,
  label = "削除",
  confirmText = "削除しますか？この操作は元に戻せません。",
}: {
  action: () => void | Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="danger">
        {label}
      </Button>
    </form>
  );
}
