"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { colones } from "@/lib/staff/clock";
import { PAY_TYPES, quantityLabel, type Line } from "@/lib/staff/payroll";
import { BUTTON, CONTROL, LABEL } from "../../salones/class-form";
import { updateLineAction, type LineInput } from "../actions";

const num = (n: number) => Number(n).toLocaleString("es-CR", { maximumFractionDigits: 2 });

/** One person's line: how it was computed, and its adjustments while draft. */
export function LineRow({ line, name, editable }: { line: Line; name: string; editable: boolean }) {
  const unit = PAY_TYPES[line.pay_type].unit;
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [v, setV] = useState<LineInput>({
    quantity_override: line.quantity_override == null ? "" : String(Number(line.quantity_override)),
    bonus: Number(line.bonus) ? String(Number(line.bonus)) : "",
    other_deductions: Number(line.other_deductions) ? String(Number(line.other_deductions)) : "",
    note: line.note ?? "",
  });
  const qty = line.quantity_override ?? line.quantity;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted">
            {quantityLabel(qty, line.pay_type)} × {colones(line.rate)}
            {line.quantity_override != null && ` (corregido; el sistema contó ${num(line.quantity)})`}
            {Number(line.bonus) > 0 && ` + extra ${colones(line.bonus)}`}
            {line.note && ` · ${line.note}`}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm sm:grid-cols-6">
          {[
            ["Bruto", line.gross],
            ["CCSS", line.ccss_employee],
            ["B. Popular", line.banco_popular],
            ["Renta", line.income_tax],
            ["Otras ded.", line.other_deductions],
            ["Neto", line.net],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-muted">{label}</dt>
              <dd className={label === "Neto" ? "font-semibold tabular-nums" : "tabular-nums"}>{colones(value as number)}</dd>
            </div>
          ))}
        </dl>
        {editable && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="cursor-pointer text-sm font-semibold underline underline-offset-2">
            {open ? "Cerrar" : "Ajustar"}
          </button>
        )}
      </div>
      {open && editable && (
        <form
          method="post"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await updateLineAction(line.id, v);
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
              router.refresh();
            });
          }}
          className="mt-4 grid gap-3 sm:grid-cols-4"
        >
          <div>
            <label htmlFor={`${id}-q`} className={LABEL}>
              Cantidad corregida ({unit})
            </label>
            <input
              id={`${id}-q`}
              inputMode="decimal"
              placeholder={num(line.quantity)}
              value={v.quantity_override}
              onChange={(e) => setV({ ...v, quantity_override: e.target.value })}
              className={CONTROL}
            />
          </div>
          <div>
            <label htmlFor={`${id}-b`} className={LABEL}>
              Extra (₡)
            </label>
            <input id={`${id}-b`} inputMode="decimal" value={v.bonus} onChange={(e) => setV({ ...v, bonus: e.target.value })} className={CONTROL} />
          </div>
          <div>
            <label htmlFor={`${id}-o`} className={LABEL}>
              Otras deducciones (₡)
            </label>
            <input
              id={`${id}-o`}
              inputMode="decimal"
              value={v.other_deductions}
              onChange={(e) => setV({ ...v, other_deductions: e.target.value })}
              className={CONTROL}
            />
          </div>
          <div>
            <label htmlFor={`${id}-n`} className={LABEL}>
              Nota
            </label>
            <input id={`${id}-n`} value={v.note} maxLength={300} onChange={(e) => setV({ ...v, note: e.target.value })} className={CONTROL} />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" disabled={pending} className={BUTTON}>
              Guardar ajuste
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
