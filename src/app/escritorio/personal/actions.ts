"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { staffForAction } from "@/lib/staff/context";

type Result = { ok: true } | { ok: false; error: string };

const PIN_RE = /^[0-9]{4}$/;

function dbError(message: string | undefined): string {
  if (message?.includes("SEDE_NOT_ALLOWED")) return "Solo podés asignar sedes donde vos trabajás.";
  if (message?.includes("PIN_FORMAT")) return "El PIN tiene 4 números.";
  if (message?.includes("NOT_ALLOWED")) return "Tu rol no permite hacer esto.";
  return "No se pudo guardar. Intentá de nuevo.";
}

export type StaffInput = {
  full_name: string;
  role_id: string;
  sede_ids: string[];
  phone: string;
  email: string;
  can_manage_payroll: boolean;
};

export async function createStaffAction(input: StaffInput, pin: string): Promise<Result> {
  const auth = await staffForAction("employees.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (input.full_name.trim().length < 2) return { ok: false, error: "Escribí el nombre." };
  if (input.sede_ids.length === 0) return { ok: false, error: "Elegí al menos una sede." };
  if (!PIN_RE.test(pin)) return { ok: false, error: "El PIN tiene 4 números." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_create", {
    p_full_name: input.full_name,
    p_role_id: input.role_id,
    p_sede_ids: input.sede_ids,
    p_pin: pin,
    p_phone: input.phone,
    p_email: input.email,
    p_can_manage_payroll: input.can_manage_payroll,
  });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/escritorio/personal");
  return { ok: true };
}

export async function updateStaffAction(id: string, input: StaffInput & { active: boolean }): Promise<Result> {
  const auth = await staffForAction("employees.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (input.full_name.trim().length < 2) return { ok: false, error: "Escribí el nombre." };
  if (input.sede_ids.length === 0) return { ok: false, error: "Elegí al menos una sede." };
  if (id === auth.staff.id && !input.active) return { ok: false, error: "No podés desactivarte a vos mismo." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("staff")
    .update({
      full_name: input.full_name.trim(),
      role_id: input.role_id,
      phone: input.phone.trim() || null,
      email: input.email.trim().toLowerCase() || null,
      active: input.active,
      // Only someone who manages payroll may grant or revoke it.
      ...(auth.staff.can_manage_payroll ? { can_manage_payroll: input.can_manage_payroll } : {}),
    })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: dbError(error.message) };
  // RLS filters rows silently: no row back means it wasn't allowed.
  if (!updated?.length) return { ok: false, error: "No podés editar a esta persona." };

  // Sedes: only the ones this manager works in can be added or removed.
  const mine = new Set(auth.staff.sede_ids);
  const { data: current } = await supabase.from("staff_sedes").select("sede_id").eq("staff_id", id);
  const have = new Set((current ?? []).map((r) => r.sede_id as string));
  const add = input.sede_ids.filter((s) => mine.has(s) && !have.has(s));
  const remove = [...have].filter((s) => mine.has(s) && !input.sede_ids.includes(s));
  if (add.length) {
    const { error: e } = await supabase.from("staff_sedes").insert(add.map((sede_id) => ({ staff_id: id, sede_id })));
    if (e) return { ok: false, error: dbError(e.message) };
  }
  if (remove.length) {
    const { error: e } = await supabase.from("staff_sedes").delete().eq("staff_id", id).in("sede_id", remove);
    if (e) return { ok: false, error: dbError(e.message) };
  }

  revalidatePath("/escritorio/personal");
  return { ok: true };
}

export async function resetPinAction(id: string, pin: string): Promise<Result> {
  const auth = await staffForAction();
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!PIN_RE.test(pin)) return { ok: false, error: "El PIN tiene 4 números." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_set_pin", { p_staff_id: id, p_pin: pin });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/escritorio/personal");
  return { ok: true };
}
