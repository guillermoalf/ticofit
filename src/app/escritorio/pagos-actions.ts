"use server";

import { revalidatePath } from "next/cache";

import { isDate } from "@/lib/clients/parse";
import { staffForAction } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message: string } | { ok: false; error: string };

function dbError(message: string): string {
  if (message.includes("PLAN_NOT_AVAILABLE")) return "Ese plan no está disponible en la sede del cliente.";
  if (message.includes("NO_MEMBERSHIP")) return "Primero asignale un plan.";
  if (message.includes("ALREADY_REVIEWED")) return "Ese comprobante ya fue revisado.";
  if (message.includes("REASON_REQUIRED")) return "Escribí el motivo del rechazo: el cliente lo va a ver.";
  if (message.includes("DATE_OUT_OF_RANGE")) return "Revisá la fecha.";
  if (message.includes("NOT_ALLOWED")) return "Tu rol no permite hacer esto.";
  return "No se pudo guardar. Intentá de nuevo.";
}

function refresh(clientId?: string) {
  revalidatePath("/escritorio/comprobantes");
  revalidatePath("/escritorio/al-dia");
  if (clientId) revalidatePath(`/escritorio/clientes/${clientId}`);
}

export async function assignPlanAction(clientId: string, planId: string, restartOn: string): Promise<Result> {
  const auth = await staffForAction("memberships.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (restartOn && !isDate(restartOn)) return { ok: false, error: "Revisá la fecha." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("membership_assign", {
    p_client_id: clientId,
    p_plan_id: planId,
    p_restart_on: restartOn || null,
  });
  if (error) return { ok: false, error: dbError(error.message) };
  refresh(clientId);
  return { ok: true, message: restartOn ? "Membresía reiniciada." : "Plan guardado." };
}

export async function recordCashAction(clientId: string, amount: string, paidOn: string, periods: string): Promise<Result> {
  const auth = await staffForAction("payments.cash");
  if (!auth.staff) return { ok: false, error: auth.error };
  const crc = Number(amount.replace(/\D/g, ""));
  const months = Number(periods);
  if (!Number.isInteger(crc) || crc < 1 || crc > 10_000_000) return { ok: false, error: "Revisá el monto." };
  if (!Number.isInteger(months) || months < 1 || months > 12) return { ok: false, error: "Entre 1 y 12 meses." };
  if (!isDate(paidOn)) return { ok: false, error: "Revisá la fecha." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("payment_record_cash", {
    p_client_id: clientId,
    p_amount: crc,
    p_paid_on: paidOn,
    p_periods: months,
  });
  if (error) return { ok: false, error: dbError(error.message) };
  refresh(clientId);
  return { ok: true, message: "Pago en efectivo registrado." };
}

export async function reactivateAction(clientId: string, note: string): Promise<Result> {
  const auth = await staffForAction("memberships.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("membership_reactivate", { p_client_id: clientId, p_note: note });
  if (error) return { ok: false, error: dbError(error.message) };
  refresh(clientId);
  return { ok: true, message: "Membresía reactivada." };
}

export async function reviewReceiptAction(receiptId: string, approve: boolean, reason: string): Promise<Result> {
  const auth = await staffForAction("payments.review");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!approve && !reason.trim()) return { ok: false, error: "Escribí el motivo del rechazo: el cliente lo va a ver." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("receipt_review", {
    p_receipt_id: receiptId,
    p_approve: approve,
    p_reason: approve ? null : reason.trim().slice(0, 300),
  });
  if (error) return { ok: false, error: dbError(error.message) };
  refresh();
  return { ok: true, message: approve ? "Comprobante aprobado." : "Comprobante rechazado." };
}

export async function updatePlanAction(planId: string, name: string, price: string, active: boolean): Promise<Result> {
  const auth = await staffForAction("settings.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  const crc = Number(price.replace(/\D/g, ""));
  if (name.trim().length < 2) return { ok: false, error: "Escribí el nombre del plan." };
  if (!Number.isInteger(crc) || crc < 0 || crc > 10_000_000) return { ok: false, error: "Revisá el precio." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update({ name: name.trim(), price_crc: crc, active })
    .eq("id", planId)
    .select("id");
  if (error) return { ok: false, error: error.code === "23505" ? "Ya hay un plan con ese nombre." : "No se pudo guardar." };
  if (!data?.length) return { ok: false, error: "No podés editar este plan." };
  revalidatePath("/escritorio/ajustes");
  return { ok: true, message: "Plan guardado." };
}
