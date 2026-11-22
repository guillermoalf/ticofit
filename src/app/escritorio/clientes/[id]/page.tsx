import Link from "next/link";
import { notFound } from "next/navigation";

import { RecordView } from "@/components/clients/record-view";
import { DeskPageHeader } from "@/components/desk/page-header";
import { RecordForm, type FormValues } from "@/components/desk/record-form";
import { ageOn, todayCR } from "@/lib/clients/body";
import { PROFILE_GROUPS } from "@/lib/clients/fields";
import type { Client } from "@/lib/clients/types";
import { requireStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { updateClientFileAction } from "../actions";
import { profileFormGroups } from "../profile-groups";
import { ClinicalTab } from "./clinical-tab";
import { InviteButton } from "./invite-button";
import { MeasurementsTab } from "./measurements-tab";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "perfil", label: "Perfil" },
  { id: "historia", label: "Historia clínica" },
  { id: "mediciones", label: "Mediciones" },
  { id: "rutina", label: "Rutina" },
  { id: "pagos", label: "Membresía y pagos" },
  { id: "reservas", label: "Reservas" },
] as const;

const SOON: Record<string, string> = {
  rutina: "Acá va a estar su rutina.",
  pagos: "Acá van a estar su membresía y sus pagos.",
  reservas: "Acá van a estar sus reservas.",
};

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; nueva?: string; editar?: string; m?: string }>;
}) {
  const staff = await requireStaff("clients.read");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const client = data as Client;

  const tabs = TABS.filter((t) => t.id !== "historia" || can(staff, "clinical.read"));
  const tab = tabs.find((t) => t.id === query.tab)?.id ?? "perfil";
  const age = ageOn(client.birth_date, todayCR());
  const canWrite = can(staff, "clients.write");

  const { data: sedes } = await supabase.from("sedes").select("id, name").in("id", staff.sede_ids).order("sort_order");
  const sedeList = (sedes ?? []) as { id: string; name: string }[];

  const about = [
    age !== null ? `${age} años` : null,
    sedeList.find((s) => s.id === client.sede_id)?.name,
    client.user_id ? "Con acceso al portal" : "Sin acceso al portal",
  ];

  return (
    <>
      <Link href="/escritorio/clientes" className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← Clientes
      </Link>
      <DeskPageHeader
        title={client.full_name}
        description={about.filter(Boolean).join(" · ")}
        action={canWrite && !client.user_id && client.email ? <InviteButton clientId={client.id} /> : undefined}
      />

      <nav aria-label="Expediente" className="mb-6 flex flex-wrap gap-x-5 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/escritorio/clientes/${client.id}?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 items-center border-b-2 text-[15px]",
              t.id === tab ? "border-primary font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "perfil" &&
        (canWrite ? (
          <RecordForm
            key={`perfil-${client.id}`}
            groups={profileFormGroups(sedeList)}
            values={client as unknown as FormValues}
            action={updateClientFileAction.bind(null, client.id)}
            submitLabel="Guardar perfil"
          />
        ) : (
          <RecordView groups={PROFILE_GROUPS} record={client} />
        ))}
      {tab === "historia" && <ClinicalTab client={client} staff={staff} />}
      {tab === "mediciones" && (
        <MeasurementsTab client={client} staff={staff} creating={query.nueva === "1"} editing={query.editar} selected={query.m} />
      )}
      {SOON[tab] && (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">{SOON[tab]}</p>
      )}
    </>
  );
}
