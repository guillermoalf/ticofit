"use server";

import { revalidatePath } from "next/cache";

import { clockError } from "@/lib/staff/clock";
import { staffForAction } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { crInstant } from "@/lib/schedule";

type Result = { ok: true; message: string } | { ok: false; error: string };

export type EntryInput = {
  staff_id: string;
  sede_id: string;
  date: string;
  clock_in: string;
  /** Empty: still inside. */
  clock_out: string;
  /** Exit on the next day (night shift). */
  out_next_day: boolean;
  note: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function nextDay(date: string): string {
  return new Date(Date.parse(date) + 86_400_000).toISOString().slice(0, 10);
}

/** Add a missing mark or correct one (attendance.manage). */
export async function saveEntryAction(id: string | null, input: EntryInput): Promise<Result> {
  const auth = await staffForAction("attendance.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!DATE_RE.test(input.date) || !TIME_RE.test(input.clock_in)) return { ok: false, error: "Poné la fecha y la hora de entrada." };
  if (input.clock_out && !TIME_RE.test(input.clock_out)) return { ok: false, error: "Revisá la hora de salida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("time_entry_save", {
    p_id: id,
    p_entry: {
      staff_id: input.staff_id,
      sede_id: input.sede_id,
      clock_in: crInstant(input.date, input.clock_in),
      clock_out: input.clock_out ? crInstant(input.out_next_day ? nextDay(input.date) : input.date, input.clock_out) : "",
      note: input.note,
    },
  });
  if (error) return { ok: false, error: clockError(error) };
  revalidatePath("/escritorio/reloj");
  return { ok: true, message: id ? "Marca corregida." : "Marca agregada." };
}

export async function deleteEntryAction(id: string): Promise<Result> {
  const auth = await staffForAction("attendance.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("time_entry_delete", { p_id: id });
  if (error) return { ok: false, error: clockError(error) };
  revalidatePath("/escritorio/reloj");
  return { ok: true, message: "Marca borrada." };
}
