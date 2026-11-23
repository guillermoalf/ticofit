import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export type ClientBooking = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  clientId: string | null;
  sede: { id: string; name: string; status: string } | null;
  /** active or overdue: may book. */
  canBook: boolean;
  cutoffHours: number;
  aheadDays: number;
};

/** The signed-in client's file, sede and booking rules. */
export async function clientBooking(): Promise<ClientBooking> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "client") redirect("/portal/clientes");
  const supabase = await createClient();
  const [{ data: file }, { data: settings }] = await Promise.all([
    supabase.from("clients").select("id, sede_id").eq("user_id", userId).maybeSingle(),
    supabase.from("app_settings").select("key, value").in("key", ["reservations.cancel_cutoff_hours", "reservations.book_ahead_days"]),
  ]);
  const setting = (key: string, fallback: number) => {
    const v = Number((settings ?? []).find((s) => s.key === key)?.value);
    return Number.isFinite(v) ? v : fallback;
  };
  const [{ data: sede }, { data: overview }] = file
    ? await Promise.all([
        supabase.from("sedes").select("id, name, status").eq("id", file.sede_id).maybeSingle(),
        supabase.from("membership_overview").select("status").eq("client_id", file.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  return {
    supabase,
    clientId: (file?.id as string | undefined) ?? null,
    sede: (sede as ClientBooking["sede"]) ?? null,
    canBook: overview?.status === "active" || overview?.status === "overdue",
    cutoffHours: setting("reservations.cancel_cutoff_hours", 2),
    aheadDays: setting("reservations.book_ahead_days", 7),
  };
}
