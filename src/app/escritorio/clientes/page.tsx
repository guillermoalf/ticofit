import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { ClientList, type ClientRow } from "./client-list";

export const dynamic = "force-dynamic";

const PAGE = 1000; // PostgREST's default row cap

export default async function ClientesPage() {
  const staff = await requireStaff("clients.read");
  const supabase = await createClient();
  const sedeIds = await activeSedeIds(staff);

  const rows: ClientRow[] = [];
  let failed = false;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, full_name, sede_id, phone, national_id, email, user_id")
      .in("sede_id", sedeIds)
      .order("full_name")
      .order("id")
      .range(from, from + PAGE - 1);
    failed = Boolean(error);
    if (error) break;
    rows.push(...(data as ClientRow[]));
    if (data.length < PAGE) break;
  }
  const { data: sedes } = await supabase.from("sedes").select("id, name");

  return (
    <>
      <DeskPageHeader
        title="Clientes"
        action={
          can(staff, "clients.write") && (
            <Link href="/escritorio/clientes/nuevo" className="rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro">
              Agregar cliente
            </Link>
          )
        }
      />
      {failed ? (
        <p role="alert" className="font-semibold text-[var(--danger)]">
          No se pudieron cargar los clientes. Recargá la página.
        </p>
      ) : (
        <ClientList rows={rows} sedes={Object.fromEntries((sedes ?? []).map((s) => [s.id, s.name as string]))} />
      )}
    </>
  );
}
