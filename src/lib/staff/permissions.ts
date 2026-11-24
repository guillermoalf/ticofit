/**
 * Staff permissions. The database is the source of truth
 * (`staff_role_permissions`, migration 0023); this list only types the ids so
 * code asks `can(staff, "clients.write")` instead of checking a role name.
 */
export const PERMISSIONS = [
  "clients.read",
  "clients.write",
  "clinical.read",
  "clinical.write",
  "measurements.write",
  "measurements.override",
  "routines.write",
  "exercises.write",
  "payments.review",
  "payments.cash",
  "memberships.write",
  "schedule.write",
  "reservations.write",
  "employees.manage",
  "settings.manage",
  "attendance.manage",
  "payroll.manage",
  /** Owners (Dueño) only: delete or revert any record. */
  "data.delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** The acting employee on a desk, as returned by `current_staff()`. */
export type StaffContext = {
  id: string;
  full_name: string;
  role_id: string;
  role_label: string;
  can_manage_payroll: boolean;
  permissions: Permission[];
  /** Sedes this person may work in on this desk (theirs ∩ the desk's). */
  sede_ids: string[];
};

export function can(staff: StaffContext | null, permission: Permission): boolean {
  if (!staff) return false;
  if (permission === "payroll.manage") return staff.can_manage_payroll;
  return staff.permissions.includes(permission);
}
