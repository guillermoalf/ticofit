import { formatDate, formatNumber } from "@/lib/clients/body";
import type { Field, FieldGroup } from "@/lib/clients/fields";

function show(field: Field, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    return value.map((v) => field.options?.find((o) => o.value === v)?.label ?? String(v)).join(" · ") || "—";
  }
  if (field.type === "date") return formatDate(String(value));
  if (field.options) return field.options.find((o) => o.value === value)?.label ?? String(value);
  if (typeof value === "number") return `${formatNumber(value)}${field.unit ? ` ${field.unit}` : ""}`;
  return String(value);
}

/** Read-only view of a field list: staff without write permission, and the client. */
export function RecordView({ groups, record }: { groups: FieldGroup[]; record: object }) {
  const values = record as Record<string, unknown>;
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.title} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h3 className="text-[15px] font-semibold">{g.title}</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.name} className="min-w-0">
                <dt className="text-sm text-muted">{f.label}</dt>
                <dd className="text-[15px] break-words whitespace-pre-line">{show(f, values[f.name])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
