import type { SedeId } from "@/content/landing";

/** A row in public.waitlist (see 0022). */
export type WaitlistRow = {
  id: string;
  sede: SedeId;
  nombre_completo: string;
  /** 8 digits, no country code. */
  telefono: string;
  email: string;
  created_at: string;
  notificado: boolean;
};
