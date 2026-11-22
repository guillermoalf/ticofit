"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff/context";
import { SEDE_COOKIE, clearStaffToken, writeStaffToken } from "@/lib/staff/token";

type Result = { ok: true } | { ok: false; error: string };

const PIN_RE = /^[0-9]{4}$/;

function friendly(message: string | undefined): string {
  if (!message) return "No se pudo completar. Intentá de nuevo.";
  if (message.includes("PIN_LOCKED")) return "Demasiados intentos. Esperá unos minutos o pedile a un administrador que reinicie tu PIN.";
  if (message.includes("NO_PIN")) return "Todavía no tenés PIN. Pedile a un administrador que te asigne uno.";
  if (message.includes("STAFF_NOT_HERE")) return "No trabajás en la sede de esta computadora.";
  if (message.includes("NO_DESK")) return "Esta cuenta no es de una computadora del gimnasio.";
  if (message.includes("ALREADY_BOOTSTRAPPED")) return "El primer administrador ya existe.";
  return "No se pudo completar. Intentá de nuevo.";
}

/** Name + PIN → opens the staff session on this desk. */
export async function unlockAction(staffId: string, pin: string): Promise<Result> {
  if (!PIN_RE.test(pin)) return { ok: false, error: "El PIN tiene 4 números." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_unlock", { p_staff_id: staffId, p_pin: pin });
  if (error) return { ok: false, error: friendly(error.message) };
  if (!data) return { ok: false, error: "PIN incorrecto." };
  await writeStaffToken(data as string);
  revalidatePath("/escritorio", "layout");
  return { ok: true };
}

/** Activity in the page with no navigation (typing a long form) keeps the session alive. */
export async function touchAction(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_session_touch");
  return data === true;
}

export async function lockAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("staff_lock");
  await clearStaffToken();
  revalidatePath("/escritorio", "layout");
}

/** First run: the desk creates the first administrator, then unlocks as them. */
export async function bootstrapAction(fullName: string, pin: string): Promise<Result> {
  const name = fullName.trim();
  if (name.length < 2) return { ok: false, error: "Escribí tu nombre." };
  if (!PIN_RE.test(pin)) return { ok: false, error: "El PIN tiene 4 números." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("staff_bootstrap", { p_full_name: name, p_pin: pin });
  if (error || !id) return { ok: false, error: friendly(error?.message) };
  return unlockAction(id as string, pin);
}

/** Sede switcher: one sede, or every sede this person works in. */
export async function switchSedeAction(sedeId: string | null): Promise<void> {
  const staff = await getStaff();
  const store = await cookies();
  if (sedeId && staff?.sede_ids.includes(sedeId)) {
    store.set(SEDE_COOKIE, sedeId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    store.delete(SEDE_COOKIE);
  }
  revalidatePath("/escritorio", "layout");
}
