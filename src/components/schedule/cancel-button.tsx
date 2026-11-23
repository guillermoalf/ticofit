"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Result = { ok: true; message: string } | { ok: false; error: string };

/** Cancels one reservation through a bound server action, after a confirm. */
export function CancelReservationButton({ action, question, label = "Cancelar" }: { action: () => Promise<Result>; question: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(question)) return;
        start(async () => {
          const res = await action();
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
      className="cursor-pointer text-sm font-semibold underline underline-offset-2 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
