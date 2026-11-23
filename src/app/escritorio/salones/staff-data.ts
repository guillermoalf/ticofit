import type { Discipline, Salon } from "@/lib/schedule";
import type { createClient } from "@/lib/supabase/server";
import type { Coach } from "./class-form";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Active disciplines, the sede's active salones and the employees who work there. */
export async function scheduleOptions(supabase: Supabase, sedeId: string) {
  const [{ data: disciplines }, { data: salones }, { data: links }, { data: staff }] = await Promise.all([
    supabase.from("disciplines").select("id, slug, name, default_capacity, default_minutes, sort_order, active").eq("active", true).order("sort_order"),
    supabase.from("salones").select("id, sede_id, name, capacity, sort_order, active").eq("sede_id", sedeId).eq("active", true).order("sort_order").order("name"),
    supabase.from("staff_sedes").select("staff_id").eq("sede_id", sedeId),
    supabase.from("staff").select("id, full_name, active").eq("active", true).order("full_name"),
  ]);
  const here = new Set((links ?? []).map((l) => l.staff_id as string));
  return {
    disciplines: (disciplines ?? []) as Discipline[],
    salones: (salones ?? []) as Salon[],
    coaches: ((staff ?? []) as (Coach & { active: boolean })[]).filter((s) => here.has(s.id)).map(({ id, full_name }) => ({ id, full_name })),
  };
}
