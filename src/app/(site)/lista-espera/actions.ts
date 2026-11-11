"use server";

import type { SedeId } from "@/content/landing";
import { landing } from "@/content/landing";
import { createClient } from "@/lib/supabase/server";
import { normalizarEmail, normalizarNombre, normalizarTelefono } from "@/lib/waitlist";

export type WaitlistField = "nombre" | "telefono" | "email";
export type WaitlistResult =
  | { ok: true }
  | { ok: false; fields?: Partial<Record<WaitlistField, true>>; error?: string };

/**
 * Public waitlist sign-up. Runs with the visitor's own (anon) session, so the
 * "public joins waitlist" RLS policy is what allows the insert, and anon can
 * never read the list back. Only a sede whose estado is "proximamente" takes
 * sign-ups. A duplicate (sede, email) is reported as success.
 */
export async function joinWaitlistAction(formData: FormData): Promise<WaitlistResult> {
  // Honeypot: real people never see or fill this field.
  if (String(formData.get("empresa") ?? "") !== "") return { ok: true };

  const sede = String(formData.get("sede") ?? "") as SedeId;
  const config = landing.home.sedes.lista.find((s) => s.id === sede);
  if (!config || config.estado !== "proximamente") {
    return { ok: false, error: landing.home.listaEspera.error };
  }

  const nombre = normalizarNombre(String(formData.get("nombre") ?? ""));
  const telefono = normalizarTelefono(String(formData.get("telefono") ?? ""));
  const email = normalizarEmail(String(formData.get("email") ?? ""));
  if (!nombre || !telefono || !email) {
    return {
      ok: false,
      fields: {
        ...(!nombre && { nombre: true }),
        ...(!telefono && { telefono: true }),
        ...(!email && { email: true }),
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ sede, nombre_completo: nombre, telefono, email });

  if (error && error.code !== "23505") {
    return { ok: false, error: landing.home.listaEspera.error };
  }
  return { ok: true };
}
