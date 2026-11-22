import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
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
    </>
  );
}
