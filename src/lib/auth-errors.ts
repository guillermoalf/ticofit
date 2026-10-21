/**
 * Maps Supabase auth errors to friendly Spanish copy. Supabase returns English
 * messages (and sometimes only a status code), so we translate the common ones.
 */
export function authErrorToSpanish(
  error: {
    message?: string;
    status?: number;
    code?: string;
  },
  /** Closing line when nothing matches — the sign-in wording rarely fits. */
  fallback = "No se pudo iniciar sesión. Intentá de nuevo.",
): string {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("email not confirmed")) {
    return "Tu correo aún no está confirmado.";
  }
  if (message.includes("user not found")) {
    return "No existe una cuenta con ese correo.";
  }
  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    error.status === 429
  ) {
    return "Demasiados intentos. Esperá un momento e intentá de nuevo.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Error de conexión. Revisá tu internet e intentá de nuevo.";
  }

  return fallback;
}

/**
 * Is this the invite-only refusal from 0010's handle_new_user() trigger?
 *
 * The trigger raises `ACCESO_NO_AUTORIZADO: <email> no está pre-autorizado`
 * with SQLSTATE 42501, which rolls back the auth.users insert. GoTrue does not
 * forward the Postgres message verbatim — it reports the failed signup as a
 * generic `unexpected_failure` / "Database error saving new user" (500). So we
 * match the marker when it does survive AND the generic shapes when it does
 * not, since on this project the only thing that can fail a fresh signup at
 * the database level IS this trigger.
 *
 * Never show the raw message: it leaks SQL detail and reads as a crash.
 */
export function isUnauthorizedSignup(error: {
  message?: string;
  status?: number;
  code?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";

  return (
    message.includes("acceso_no_autorizado") ||
    message.includes("no está pre-autorizado") ||
    code === "unexpected_failure" ||
    message.includes("database error saving new user") ||
    message.includes("database error creating new user") ||
    // GoTrue surfaces the rolled-back signup as a plain server error on the
    // OAuth redirect, where no message reaches us at all.
    code === "server_error"
  );
}
