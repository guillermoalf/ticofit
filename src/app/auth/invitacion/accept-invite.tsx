"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient as createPlainClient } from "@supabase/supabase-js";

import { TicofitLogo } from "@/components/brand/ticofit-logo";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

type Invite = { access_token: string; refresh_token: string; email: string };

/**
 * Admin invites use the implicit flow: the tokens come in the URL fragment,
 * which /auth/callback (PKCE, server) never sees. The fragment is taken out of
 * the address bar at once, and the session is only set after the person
 * confirms the email, so a crafted link can't silently sign someone into
 * another account.
 */
export function AcceptInvite() {
  const [invite, setInvite] = useState<Invite | "invalid" | null>(null);
  const [pending, start] = useTransition();
  const read = useRef(false);

  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setInvite("invalid");
      return;
    }
    const plain = createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "tf-invite" },
    });
    void plain.auth.getUser(access_token).then(({ data }) => {
      setInvite(data.user?.email ? { access_token, refresh_token, email: data.user.email } : "invalid");
    });
  }, []);

  const accept = () => {
    if (!invite || invite === "invalid") return;
    start(async () => {
      const { access_token, refresh_token } = invite;
      const { error } = await createClient().auth.setSession({ access_token, refresh_token });
      if (error) return setInvite("invalid");
      window.location.assign("/portal");
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <TicofitLogo className="mb-10 h-10 w-auto self-start text-verde-profundo" />
      <h1 className="font-tf-serif text-[40px] leading-tight">Te damos la bienvenida.</h1>
      <div aria-live="polite" className="mt-3 text-muted">
        {invite === null && <p>Revisando tu invitación…</p>}
        {invite === "invalid" && <p>Este link ya venció o no es válido. Pedile a recepción que te ayude a entrar.</p>}
        {invite && invite !== "invalid" && (
          <>
            <p>
              Vas a entrar como <strong className="break-all text-ink">{invite.email}</strong>.
            </p>
            <button
              type="button"
              onClick={accept}
              disabled={pending}
              className="mt-6 cursor-pointer rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro disabled:opacity-60"
            >
              Entrar a mi portal
            </button>
            <p className="mt-4 text-sm">Si ese no es tu correo, cerrá esta página.</p>
          </>
        )}
      </div>
    </main>
  );
}
