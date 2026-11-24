export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABELS: Record<Day, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};
/** {"mon":[["06:00","21:00"]], …}: 24h local time, several ranges allowed. */
export type OpeningHours = Partial<Record<Day, [string, string][]>>;

export type SedeInput = {
  name: string;
  address: string;
  building_capacity: number;
  status: "open" | "coming_soon";
  opening_hours: OpeningHours;
};
