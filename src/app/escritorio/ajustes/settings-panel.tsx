"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateSettingAction } from "./actions";

export type SettingRow = { key: string; value: number; label: string };

/** Numeric business rules (idle lock, PIN attempts, later grace days…). */
export function SettingsPanel({ rows }: { rows: SettingRow[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {rows.map((r) => (
        <SettingItem key={r.key} row={r} />
      ))}
    </ul>
  );
}

function SettingItem({ row }: { row: SettingRow }) {
  const router = useRouter();
  const [value, setValue] = useState(String(row.value));
  const [pending, start] = useTransition();
  const dirty = value !== String(row.value);

  const save = () =>
    start(async () => {
      const res = await updateSettingAction(row.key, Number(value));
      if (!res.ok) return void toast.error(res.error);
      toast.success("Guardado.");
      router.refresh();
    });

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <label htmlFor={`set-${row.key}`} className="min-w-0 flex-1 text-[15px]">
        {row.label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`set-${row.key}`}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-right text-base outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold disabled:cursor-default disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </li>
  );
}
