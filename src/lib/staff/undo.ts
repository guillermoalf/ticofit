/** What an owner can delete or revert (owner_delete(), migration 0030). */
export type UndoKind =
  | "client"
  | "measurement"
  | "clinical"
  | "routine"
  | "payment"
  | "receipt"
  | "membership"
  | "class"
  | "reservation"
  | "staff"
  | "payroll_run"
  /** structure_delete() (0031), salons.manage. */
  | "salon"
  | "discipline";
