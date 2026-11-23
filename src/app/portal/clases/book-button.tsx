"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { bookOwnAction } from "./actions";

export function BookButton({ classId, label }: { classId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Reservar ${label}`}
      onClick={() =>
        start(async () => {
          const res = await bookOwnAction(classId);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        })
      }
      className="cursor-pointer rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro disabled:opacity-60"
    >
      Reservar
    </button>
  );
}
