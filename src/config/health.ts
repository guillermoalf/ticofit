import type { Gender } from "@/types/profile";

/**
 * Waist-to-hip ratio from which the sheet flags "ELEVADO", by gender.
 * Source: WHO, "Waist circumference and waist-hip ratio: report of a WHO
 * expert consultation" (2008): ≥ 0.90 men, ≥ 0.85 women. No threshold for
 * other genders, so no flag is shown for them.
 * [Pendiente — Jeremy: confirmar que la hoja usa estos mismos límites.]
 */
export const WAIST_HIP_ELEVATED: Partial<Record<Gender, number>> = {
  male: 0.9,
  female: 0.85,
};
