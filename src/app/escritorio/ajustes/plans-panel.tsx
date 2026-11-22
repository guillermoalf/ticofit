"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Plan } from "@/lib/billing/types";
import { updatePlanAction } from "../pagos-actions";

/** Prices before IVA. Membership plans keep clients active; packages are listed for reference. */
export function PlansPanel({ plans, sedes }: { plans: Plan[]; sedes: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {sedes.map((s) => (
        <section key={s.id} className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-2 font-semibold">{s.name}</h3>
          <ul className="divide-y divide-border">
            {plans
              .filter((p) => p.sede_id === s.id)
              .map((p) => (
                <PlanRow key={p.id} plan={p} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PlanRow({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.price_crc));
  const [active, setActive] = useState(plan.active);
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const dirty = name !== plan.name || price !== String(plan.price_crc) || active !== plan.active;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updatePlanAction(plan.id, name, price, active);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.refresh();
    });
  };

  const input = "rounded-lg border border-border-strong bg-surface px-2.5 py-2 text-[16px] text-ink outline-none focus:border-primary";
  return (
    <li>
      <form onSubmit={save} method="post" className="flex flex-wrap items-center gap-2 py-2.5">
        <input aria-label="Nombre del plan" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={`${input} min-w-0 flex-1`} />
        <span className="text-sm text-muted">₡</span>
        <input
          aria-label={`Precio de ${plan.name}, sin IVA`}
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className={`${input} w-28 text-right`}
        />
        <span className="w-24 text-xs text-muted">
          {plan.kind === "membership" ? "al mes" : `c/u · ${plan.units} ${plan.unit_label}`}
        </span>
        <label className="inline-flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[var(--tf-verde-profundo)]" />
          Activo
        </label>
        <button
          type="submit"
          disabled={!dirty || pending || !ready}
          className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold disabled:cursor-default disabled:opacity-40"
        >
          Guardar
        </button>
      </form>
    </li>
  );
}
