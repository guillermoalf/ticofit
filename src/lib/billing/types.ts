/** Rows of migration 0025. Status and dates are computed by membership_overview. */
export type MembershipStatus = "active" | "overdue" | "suspended" | "none";

export type Overview = {
  client_id: string;
  sede_id: string;
  full_name: string;
  phone: string | null;
  has_membership: boolean;
  plan_id: string | null;
  plan_name: string | null;
  price_crc: number | null;
  start_date: string | null;
  periods_paid: number | null;
  reactivated_until: string | null;
  paid_through: string | null;
  due_date: string | null;
  days_overdue: number;
  status: MembershipStatus;
  last_paid_on: string | null;
};

export type Plan = {
  id: string;
  sede_id: string;
  kind: "membership" | "package";
  name: string;
  price_crc: number;
  units: number | null;
  unit_label: string | null;
  active: boolean;
  sort_order: number;
};

export type Receipt = {
  id: string;
  client_id: string;
  file_path: string;
  amount_crc: number;
  paid_on: string;
  reference: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  client_id: string;
  amount_crc: number;
  paid_on: string;
  periods: number;
  method: "receipt" | "cash";
  recorded_by_staff: string | null;
  created_at: string;
};

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: "Al día",
  overdue: "Vencido",
  suspended: "Suspendido",
  none: "Sin plan",
};

export const RECEIPT_LABEL: Record<Receipt["status"], string> = {
  pending: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

/** 40000 → ₡40.000 */
export function formatCRC(n: number): string {
  return `₡${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** WhatsApp link for a Costa Rican number, or null when it doesn't look like one. */
export function whatsappLink(phone: string | null, text: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  const full = digits.length === 8 ? `506${digits}` : digits.length === 11 && digits.startsWith("506") ? digits : null;
  return full ? `https://wa.me/${full}?text=${encodeURIComponent(text)}` : null;
}
