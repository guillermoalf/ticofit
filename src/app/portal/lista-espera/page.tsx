import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import type { WaitlistRow } from "@/types/waitlist";
import { WaitlistClient } from "./waitlist-client";

// Reads the session + list per request; never statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Staff view of the waitlist for sedes that haven't opened. Admin/coach only
 * twice over: this redirect, and RLS ("staff reads waitlist"), which returns
 * nothing to anyone else.
 */
export default async function ListaEsperaPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "coach") redirect("/portal");

  const supabase = await createClient();
  const { data } = await supabase
    .from("waitlist")
    .select("id, sede, nombre_completo, telefono, email, created_at, notificado")
    .order("created_at", { ascending: false });

  return <WaitlistClient rows={(data ?? []) as WaitlistRow[]} />;
}
