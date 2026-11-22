"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { inviteClientAction } from "../actions";

export function InviteButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const invite = () =>
    start(async () => {
      const res = await inviteClientAction(clientId);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <button
      type="button"
      onClick={invite}
      disabled={pending}
      className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-hover disabled:opacity-50"
    >
      {pending ? "Enviando…" : "Enviar invitación"}
    </button>
  );
}
