"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteTemplateAction } from "../../actions";

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Borrar la plantilla "${name}"? Las rutinas ya asignadas con ella no cambian.`)) return;
        start(async () => {
          const res = await deleteTemplateAction(id);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.push("/escritorio/ejercicios?vista=plantillas");
          router.refresh();
        });
      }}
      className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold disabled:opacity-50"
    >
      Borrar plantilla
    </button>
  );
}
