import type { Permission } from "@/lib/staff/permissions";

export type DeskNavItem = {
  href: string;
  label: string;
  icon:
    | "home"
    | "users"
    | "receipt"
    | "wallet"
    | "calendar"
    | "dumbbell"
    | "team"
    | "clock"
    | "payroll"
    | "settings";
  /** Shown only to staff holding this permission. */
  needs?: Permission;
};

/** Desk navigation. Each module hides itself from roles that can't use it. */
export const DESK_NAV: DeskNavItem[] = [
  { href: "/escritorio", label: "Hoy", icon: "home" },
  { href: "/escritorio/clientes", label: "Clientes", icon: "users", needs: "clients.read" },
  { href: "/escritorio/comprobantes", label: "Comprobantes", icon: "receipt", needs: "payments.review" },
  { href: "/escritorio/al-dia", label: "Quién está al día", icon: "wallet", needs: "clients.read" },
  { href: "/escritorio/salones", label: "Salones y clases", icon: "calendar" },
  { href: "/escritorio/ejercicios", label: "Ejercicios y rutinas", icon: "dumbbell", needs: "routines.write" },
  { href: "/escritorio/personal", label: "Personal", icon: "team", needs: "employees.manage" },
  { href: "/escritorio/reloj", label: "Reloj", icon: "clock" },
  { href: "/escritorio/planilla", label: "Planilla", icon: "payroll", needs: "payroll.manage" },
  { href: "/escritorio/ajustes", label: "Ajustes", icon: "settings", needs: "settings.manage" },
];
