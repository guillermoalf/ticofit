"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BUTTON, CONTROL, LABEL } from "../salones/class-form";
import type { Period } from "@/lib/staff/payroll";
import { createRunAction } from "./actions";

/** Start a draft for a period. Monthly runs pick a month; the others, a first day. */
export function NewRun({ period, periodLabel, today }: { period: Period; periodLabel: string; today: string }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(period === "monthly" ? today.slice(0, 7) : today);
  const [pending, start] = useTransition();

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createRunAction(period === "monthly" ? `${value}-01` : value);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.push(`/escritorio/planilla/${res.id}`);
        });
      }}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <div>
        <label htmlFor={id} className={LABEL}>
          {period === "monthly" ? "Mes" : "Primer día del periodo"} ({periodLabel.toLowerCase()})
        </label>
        <input
          id={id}
          type={period === "monthly" ? "month" : "date"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={CONTROL}
          required
        />
      </div>
      <button type="submit" disabled={pending} className={BUTTON}>
        Nueva planilla
      </button>
    </form>
  );
}
