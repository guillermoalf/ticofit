"use server";

import { revalidatePath } from "next/cache";

import { scheduleError } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message: string } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** The signed-in client books a spot for themself. The database checks every rule. */
export async function bookOwnAction(classId: string): Promise<Result> {
  if (!UUID_RE.test(classId)) return { ok: false, error: "No se encontró la clase." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Tu sesión se cerró. Volvé a entrar." };
  const { error } = await supabase.rpc("reservation_book", { p_class_id: classId });
  if (error) return { ok: false, error: scheduleError(error) };
  revalidatePath("/portal/clases", "layout");
  return { ok: true, message: "Listo, tenés tu espacio." };
}

export async function cancelOwnAction(reservationId: string): Promise<Result> {
  if (!UUID_RE.test(reservationId)) return { ok: false, error: "No se encontró la reserva." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Tu sesión se cerró. Volvé a entrar." };
  const { error } = await supabase.rpc("reservation_cancel", { p_reservation_id: reservationId });
  if (error) return { ok: false, error: scheduleError(error) };
  revalidatePath("/portal/clases", "layout");
  return { ok: true, message: "Reserva cancelada." };
}
