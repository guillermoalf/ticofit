import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { formatDate, todayCR } from "@/lib/clients/body";
import { routineValidity } from "@/lib/routines/library";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { can, type StaffContext } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { DESK_NAV } from "./nav";

/** Desk home: who is acting and a way into each module they can use. */
export default async function DeskHome() {
  const staff = await requireStaff();
  const first = staff.full_name.split(" ")[0];
  const modules = DESK_NAV.filter((l) => l.href !== "/escritorio" && (!l.needs || can(staff, l.needs)));

  return (
    <>
      <DeskPageHeader title={`Hola, ${first}.`} description="Esto es lo que podés hacer desde esta computadora." />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="block rounded-2xl border border-border bg-surface px-5 py-4 text-[17px] font-semibold transition-colors hover:border-primary hover:bg-surface-hover"
            >
              {m.label} <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
      {can(staff, "routines.write") && <RenewalList staff={staff} />}
    </>
  );
}

type CurrentRow = {
  client_id: string;
  valid_from: string;
  valid_weeks: number;
  client: { full_name: string } | null;
};

/** Clients whose current routine ends within a week or already ended. */
async function RenewalList({ staff }: { staff: StaffContext }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_routines")
    .select("client_id, valid_from, valid_weeks, client:clients(full_name)")
    .not("client_id", "is", null)
    .in("sede_id", await activeSedeIds(staff))
    .order("assigned_at", { ascending: false })
    .limit(5000);
  const today = todayCR();
  const seen = new Set<string>();
  const due = ((data ?? []) as unknown as CurrentRow[])
    .filter((r) => !seen.has(r.client_id) && seen.add(r.client_id))
    .map((r) => ({ ...r, v: routineValidity(r, today)! }))
    .filter((r) => r.v.state !== "ok")
    .sort((a, b) => a.v.daysLeft - b.v.daysLeft);
  if (!due.length) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold">Rutinas por renovar ({due.length})</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {due.map((r) => (
          <li key={r.client_id}>
            <Link
              href={`/escritorio/clientes/${r.client_id}?tab=rutina`}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 px-5 py-3 hover:bg-surface-hover"
            >
              <span className="font-semibold">{r.client?.full_name ?? "Cliente"}</span>
              <span className="text-sm text-muted">
                {r.v.state === "expired" ? `venció el ${formatDate(r.v.ends)}` : `vence el ${formatDate(r.v.ends)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
