import type { Role } from "./profile";

/**
 * A row in public.preauthorized_emails (0009) — the access ledger.
 * One row = "an account for this address may be created, as this role, under
 * this coach". 0010's trigger consumes a pending row or refuses the signup.
 */
export type PreauthorizedEmail = {
  id: string;
  email: string;
  intended_role: Role;
  full_name: string | null;
  authorized_by: string | null;
  coach_id: string | null;
  created_at: string;
  /** null = still pending; set once an account was created for the address. */
  consumed_at: string | null;
  consumed_by: string | null;
};

/** A pending/consumed coach authorization joined with its account, if any. */
export type CoachAuthorization = PreauthorizedEmail & {
  /** The profile the ledger row produced, once the coach has signed in. */
  account: {
    id: string;
    full_name: string | null;
    authorized: boolean;
    created_at: string;
  } | null;
};
