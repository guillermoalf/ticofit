import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { formatMoment } from "@/lib/clients/body";
import { EXERCISE_COLUMNS, type Exercise } from "@/lib/routines/library";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { LibraryBrowser } from "./library-browser";

export const dynamic = "force-dynamic";

const button = "rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro";

export default async function EjerciciosPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const staff = await requireStaff("routines.write");
  const vista = (await searchParams).vista === "plantillas" ? "plantillas" : "biblioteca";
  const supabase = await createClient();
  const canEdit = can(staff, "exercises.write");

  const tabs = [
    { id: "biblioteca", label: "Biblioteca", href: "/escritorio/ejercicios" },
    { id: "plantillas", label: "Plantillas de rutina", href: "/escritorio/ejercicios?vista=plantillas" },
  ];

  return (
    <>
      <DeskPageHeader
        title="Ejercicios y rutinas"
        description="Las rutinas de cada cliente se arman desde su expediente, en la pestaña Rutina."
        action={
          vista === "biblioteca"
            ? canEdit && (
                <Link href="/escritorio/ejercicios/nuevo" className={button}>
                  Agregar ejercicio
                </Link>
              )
            : (
                <Link href="/escritorio/ejercicios/plantillas/nueva" className={button}>
                  Nueva plantilla
                </Link>
              )
        }
      />
      <nav aria-label="Secciones" className="mb-6 flex flex-wrap gap-x-5 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={t.id === vista ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 items-center border-b-2 text-[15px]",
              t.id === vista ? "border-primary font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {vista === "biblioteca" ? <Library canEdit={canEdit} staffId={staff.id} /> : <Templates sedeIds={await activeSedeIds(staff)} />}
    </>
  );

  async function Library({ canEdit, staffId }: { canEdit: boolean; staffId: string }) {
    const [{ data, error }, { data: favs }] = await Promise.all([
      supabase.from("exercises").select(EXERCISE_COLUMNS).in("source", ["system", "staff"]).order("name"),
      supabase.from("staff_exercise_favorites").select("exercise_id").eq("staff_id", staffId),
    ]);
    if (error) return <LoadError />;
    return (
      <LibraryBrowser
        exercises={(data ?? []) as unknown as Exercise[]}
        favoriteIds={(favs ?? []).map((f) => f.exercise_id as string)}
        canEdit={canEdit}
      />
    );
  }

  async function Templates({ sedeIds }: { sedeIds: string[] }) {
    const { data, error } = await supabase
      .from("client_routines")
      .select("id, name, updated_at, days:client_routine_days(id)")
      .is("client_id", null)
      .in("sede_id", sedeIds)
      .order("name");
    if (error) return <LoadError />;
    if (!data?.length) {
      return (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          Todavía no hay plantillas. Una plantilla es una rutina base que después se copia y se ajusta para cada cliente.
        </p>
      );
    }
    return (
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {data.map((t) => (
          <li key={t.id}>
            <Link
              href={`/escritorio/ejercicios/plantillas/${t.id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 px-5 py-3 hover:bg-surface-hover"
            >
              <span className="font-semibold">{t.name}</span>
              <span className="text-sm text-muted">
                {t.days.length} {t.days.length === 1 ? "día" : "días"} · editada {formatMoment(t.updated_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }
}

function LoadError() {
  return (
    <p role="alert" className="font-semibold text-[var(--danger)]">
      No se pudo cargar. Recargá la página.
    </p>
  );
}
