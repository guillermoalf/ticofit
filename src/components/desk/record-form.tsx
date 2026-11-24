"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Field, FieldGroup } from "@/lib/clients/fields";
import type { SaveResult } from "@/lib/clients/result";
import { cn } from "@/lib/utils";

// Never `text-base`: in this theme it is a colour (--color-base).
const CONTROL =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[16px] text-ink outline-none focus:border-primary disabled:opacity-60";

export type FormValues = Record<string, string | number | string[] | null | undefined>;

/**
 * The form behind the client profile, clinical history and measurement. It
 * renders the field lists in lib/clients/fields.ts and submits with Enter, so
 * a sheet can be typed with Tab and the number row alone.
 */
export function RecordForm({
  groups,
  values = {},
  action,
  submitLabel,
}: {
  groups: FieldGroup[];
  values?: FormValues;
  action: (form: FormData) => Promise<SaveResult>;
  submitLabel: string;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Until React has attached onSubmit, a submit would be the browser's own GET
  // and put health data in the URL: keep the button off until then.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // onSubmit, not <form action>: React resets a form after its action, which
  // would wipe everything typed when validation fails.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await action(data);
      if (!res.ok) return setError(res.error);
      toast.success(res.message);
      if (res.warning) toast.warning(res.warning, { duration: 12_000 });
      if (res.href) router.push(res.href);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} method="post" className="max-w-5xl space-y-8">
      {groups.map((g) => (
        <fieldset key={g.title} disabled={pending} className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <legend className="px-2 text-[15px] font-semibold">{g.title}</legend>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {g.fields.map((f) => (
              <Control key={f.name} id={`${id}-${f.name}`} field={f} value={values[f.name]} />
            ))}
          </div>
        </fieldset>
      ))}
      <div className="sticky bottom-0 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-base py-3">
        <button
          type="submit"
          disabled={pending || !ready}
          className="cursor-pointer rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro disabled:opacity-60"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
        <p role="alert" className="text-sm font-semibold text-[var(--danger)]">
          {error}
        </p>
      </div>
    </form>
  );
}

function Control({ id, field: f, value }: { id: string; field: Field; value: FormValues[string] }) {
  if (f.type === "checks") {
    const checked = Array.isArray(value) ? value : [];
    return (
      <div className="col-span-full grid gap-3 sm:grid-cols-2">
        {f.options?.map((o) => (
          <label key={o.value} className="inline-flex items-center gap-2.5 text-[15px]">
            <input
              type="checkbox"
              name={f.name}
              value={o.value}
              defaultChecked={checked.includes(o.value)}
              className="size-5 shrink-0 accent-[var(--tf-verde-profundo)]"
            />
            {o.label}
          </label>
        ))}
      </div>
    );
  }

  const initial =
    value === null || value === undefined ? "" : typeof value === "number" ? String(value).replace(".", ",") : String(value);

  return (
    <div className={cn("min-w-0", f.type === "textarea" && "col-span-full")}>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {f.label}
        {f.unit && ` (${f.unit})`}
        {f.required && <span className="text-ink"> *</span>}
      </label>
      {f.type === "textarea" ? (
        <textarea id={id} name={f.name} defaultValue={initial} maxLength={f.maxLength} rows={3} className={CONTROL} />
      ) : f.type === "select" ? (
        <select id={id} name={f.name} defaultValue={initial} required={f.required} className={CONTROL}>
          {!f.required && <option value="">Sin indicar</option>}
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={f.name}
          defaultValue={initial}
          required={f.required}
          maxLength={f.maxLength}
          // Numbers are text inputs so "12,5" works on any keyboard and locale.
          type={f.type === "number" ? "text" : f.type}
          inputMode={f.type === "number" ? (f.integer ? "numeric" : "decimal") : undefined}
          autoComplete="off"
          className={CONTROL}
        />
      )}
    </div>
  );
}
