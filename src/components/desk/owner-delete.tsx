"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ownerDeleteAction } from "@/app/escritorio/undo-actions";
import type { UndoKind } from "@/lib/staff/undo";
import { cn } from "@/lib/utils";

/**
 * "Borrar" for owners: asks once inline, then deletes through owner_delete().
 * Render it only when the acting person can("data.delete"); the server checks again.
 */
export function OwnerDelete({
  kind,
  id,
  label = "Borrar",
  question,
  done = "Borrado.",
  redirectTo,
  className,
}: {
  kind: UndoKind;
  id: string;
  label?: string;
  /** What exactly goes, in one sentence. */
  question: string;
  done?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("cursor-pointer text-sm font-semibold text-[var(--danger)] underline underline-offset-2", className)}
      >
        {label}
      </button>
    );
  }

  return (
    <span role="group" aria-label={label} className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span>{question} No se puede deshacer.</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await ownerDeleteAction(kind, id);
            if (!res.ok) return void toast.error(res.error);
            toast.success(done);
            setOpen(false);
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          })
        }
        className="cursor-pointer rounded-full bg-[var(--danger)] px-4 py-1.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Borrando…" : "Sí, borrar"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="cursor-pointer font-semibold underline underline-offset-2">
        No
      </button>
    </span>
  );
}
