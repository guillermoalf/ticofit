import { WAIST_HIP_ELEVATED } from "@/config/health";
import type { Gender } from "@/types/profile";
import type { Measurement } from "./types";

// Derived values are computed here, on read. None of them is ever stored.

const round = (n: number, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits;

export function percentOfWeight(kg: number | null, weight: number): number | null {
  return kg === null ? null : round((kg / weight) * 100);
}

export function bmi(m: Pick<Measurement, "height_cm" | "weight_kg">): number {
  return round(m.weight_kg / (m.height_cm / 100) ** 2);
}

export function waistHip(
  m: Pick<Measurement, "waist_cm" | "hip_cm">,
  gender: Gender | null,
): { ratio: number; elevated: boolean } | null {
  if (m.waist_cm === null || m.hip_cm === null) return null;
  const ratio = m.waist_cm / m.hip_cm;
  const limit = gender ? WAIST_HIP_ELEVATED[gender] : undefined;
  return { ratio: round(ratio, 2), elevated: limit !== undefined && ratio >= limit };
}

/** Today in Costa Rica as YYYY-MM-DD, whatever the server's timezone. */
export function todayCR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(new Date());
}

export function ageOn(birth: string | null, on: string): number | null {
  if (!birth) return null;
  const years = Number(on.slice(0, 4)) - Number(birth.slice(0, 4));
  return on.slice(5) < birth.slice(5) ? years - 1 : years;
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** 2026-01-05 → 5/1/2026, like the sheet. */
export function formatDate(date: string): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return `${d}/${m}/${y}`;
}

/** A timestamp as its date in Costa Rica. */
export function formatMoment(timestamp: string): string {
  return formatDate(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(new Date(timestamp)));
}

/**
 * 12.5 → 12,5. Not Intl's es-CR: its grouping space differs between Node and
 * the browser and would break hydration.
 */
export function formatNumber(n: number): string {
  return String(round(n, 2)).replace(".", ",");
}
