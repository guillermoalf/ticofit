import type { FieldGroup } from "./fields";

type Parsed =
  | { ok: true; values: Record<string, string | number | string[] | null> }
  | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isDate(value: string): boolean {
  return DATE_RE.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value);
}

/** Turns a submitted form into columns, accepting "12,5" as the sheet writes it. */
export function parseFields(groups: FieldGroup[], form: FormData): Parsed {
  const values: Record<string, string | number | string[] | null> = {};
  for (const f of groups.flatMap((g) => g.fields)) {
    if (f.type === "checks") {
      const allowed = new Set(f.options?.map((o) => o.value));
      values[f.name] = form.getAll(f.name).map(String).filter((v) => allowed.has(v));
      continue;
    }
    const raw = String(form.get(f.name) ?? "").trim();
    if (!raw) {
      if (f.required) return { ok: false, error: `Falta: ${f.label}.` };
      values[f.name] = null;
      continue;
    }
    if (f.maxLength && raw.length > f.maxLength) return { ok: false, error: `${f.label}: es muy largo.` };

    if (f.type === "number") {
      const pattern = f.integer ? /^\d+$/ : /^\d+([.,]\d)?$/;
      if (!pattern.test(raw)) {
        return { ok: false, error: `${f.label}: ${f.integer ? "usá un número entero" : "usá un número con máximo un decimal"}.` };
      }
      const n = Number(raw.replace(",", "."));
      if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        return { ok: false, error: `${f.label}: tiene que estar entre ${f.min} y ${f.max}.` };
      }
      values[f.name] = n;
    } else if (f.type === "date") {
      if (!isDate(raw)) return { ok: false, error: `${f.label}: revisá la fecha.` };
      values[f.name] = raw;
    } else if (f.type === "select") {
      if (!f.options?.some((o) => o.value === raw)) return { ok: false, error: `${f.label}: opción inválida.` };
      values[f.name] = raw;
    } else if (f.type === "email") {
      if (!EMAIL_RE.test(raw)) return { ok: false, error: "Revisá el correo." };
      values[f.name] = raw.toLowerCase();
    } else {
      values[f.name] = raw;
    }
  }
  return { ok: true, values };
}
