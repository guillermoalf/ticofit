import { cookies } from "next/headers";

/**
 * The staff PIN session token (see migration 0023). It is random, lives only
 * in this httpOnly cookie and is forwarded to Supabase as `x-staff-token`;
 * the database keeps just its SHA-256 and ties it to the desk account that
 * opened it.
 */
export const STAFF_COOKIE = "tf_staff";
export const SEDE_COOKIE = "tf_sede";
export const STAFF_HEADER = "x-staff-token";

export async function readStaffToken(): Promise<string | null> {
  const value = (await cookies()).get(STAFF_COOKIE)?.value;
  return value && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

export async function writeStaffToken(token: string) {
  (await cookies()).set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // The database expiry is the real limit; this only bounds a forgotten tab.
    maxAge: 60 * 60 * 12,
  });
}

export async function clearStaffToken() {
  (await cookies()).delete(STAFF_COOKIE);
}
