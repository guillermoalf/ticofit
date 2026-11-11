/**
 * Waitlist field rules, shared by the modal (instant feedback) and the server
 * action (the real check). The database enforces the same shapes (0022).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "+506 8827-2099", "50688272099", "8827 2099" → "88272099"; anything else → null. */
export function normalizarTelefono(raw: string): string | null {
  let digits = raw.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.length === 11 && digits.startsWith("506")) digits = digits.slice(3);
  return /^[245678]\d{7}$/.test(digits) ? digits : null;
}

export function normalizarEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export function normalizarNombre(raw: string): string | null {
  const nombre = raw.trim().replace(/\s+/g, " ");
  return nombre.length >= 2 && nombre.length <= 120 ? nombre : null;
}

/** "88272099" → "8827-2099" */
export const telefonoLegible = (t: string) => `${t.slice(0, 4)}-${t.slice(4)}`;
