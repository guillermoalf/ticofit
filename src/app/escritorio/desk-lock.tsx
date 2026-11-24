"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Delete, Lock } from "lucide-react";

import { TicofitLogo } from "@/components/brand/ticofit-logo";
import { SignOutButton } from "@/app/portal/signout-button";
import { cn } from "@/lib/utils";
import { bootstrapAction, clockAction, unlockAction, type ClockResult } from "./desk-actions";

export type DeskLockStaff = { id: string; full_name: string; role_label: string; has_pin: boolean };
export type ClockedIn = { staff_id: string; full_name: string; sede_id: string; clock_in: string };

const timeCR = (ts: string) =>
  new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", hour: "numeric", minute: "2-digit" }).format(new Date(ts));

/**
 * The shared computer's resting state. Staff tap their name and type their
 * 4-digit PIN (keyboard digits work too) to work, or switch to the time clock
 * to mark their entry or exit without opening a session. With no staff at all
 * yet, it asks for the first administrator instead.
 */
export function DeskLock({
  deskName,
  sedeNames,
  sedes,
  staff,
  clockedIn,
}: {
  deskName: string;
  sedeNames: string[];
  sedes: { id: string; name: string }[];
  staff: DeskLockStaff[];
  clockedIn: ClockedIn[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"unlock" | "clock">("unlock");
  const [picked, setPicked] = useState<DeskLockStaff | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const inside = new Map(clockedIn.map((c) => [c.staff_id, c]));

  // The clock's confirmation goes back to the names by itself.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 6000);
    return () => clearTimeout(t);
  }, [done]);

  const back = () => {
    setPicked(null);
    setDone(null);
  };
  // After a mark the screen goes back to the names to work, not to the clock:
  // a second tap there would mark the exit right away.
  const finishClock = (message: string) => {
    setPicked(null);
    setMode("unlock");
    setDone(message);
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <TicofitLogo className="h-9 w-auto text-verde-profundo" />
        <p className="text-right text-sm text-muted">{sedeNames.join(" · ") || deskName}</p>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        {staff.length === 0 ? (
          <Bootstrap />
        ) : done ? (
          <div className="text-center" role="status">
            <h1 className="font-tf-serif text-[40px] leading-tight">{done}</h1>
            <button type="button" onClick={back} className="mt-8 cursor-pointer text-sm font-semibold underline underline-offset-4">
              Listo
            </button>
          </div>
        ) : picked && mode === "unlock" ? (
          <PinPad
            person={picked}
            subtitle="Escribí tu PIN"
            onBack={back}
            submit={async (pin) => {
              const res = await unlockAction(picked.id, pin);
              if (!res.ok) return res.error;
              router.replace("/escritorio");
              return null;
            }}
          />
        ) : picked ? (
          <ClockPad
            person={picked}
            sedes={sedes}
            isIn={inside.has(picked.id)}
            onBack={back}
            onDone={finishClock}
          />
        ) : (
          <>
            <h1 className="font-tf-serif text-[40px] leading-tight sm:text-[52px]">
              {mode === "unlock" ? "¿Quién está trabajando?" : "Marcar entrada o salida"}
            </h1>
            <p className="mt-2 text-muted">
              {mode === "unlock" ? "Tocá tu nombre y escribí tu PIN." : "Tocá tu nombre y escribí tu PIN. No abre sesión."}
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {staff.map((s) => {
                const here = inside.get(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(s)}
                      className="flex h-full w-full cursor-pointer flex-col items-start rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary hover:bg-surface-hover"
                    >
                      <span className="text-[17px] font-semibold">{s.full_name}</span>
                      <span className="mt-1 text-sm text-muted">
                        {mode === "clock" ? (here ? `Adentro desde las ${timeCR(here.clock_in)}` : "Afuera") : s.role_label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => setMode(mode === "unlock" ? "clock" : "unlock")}
              className="mt-8 inline-flex cursor-pointer items-center gap-2 self-start rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover"
            >
              <Clock size={16} aria-hidden="true" />
              {mode === "unlock" ? "Marcar entrada o salida" : "Volver a entrar a trabajar"}
            </button>
          </>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <Lock size={15} aria-hidden="true" /> {deskName}
        </span>
        <SignOutButton />
      </footer>
    </main>
  );
}

/** Time clock: PIN, then (only for people in two sedes of this desk) the sede. */
function ClockPad({
  person,
  sedes,
  isIn,
  onBack,
  onDone,
}: {
  person: DeskLockStaff;
  sedes: { id: string; name: string }[];
  isIn: boolean;
  onBack: () => void;
  onDone: (message: string) => void;
}) {
  const [ask, setAsk] = useState<{ pin: string; sedes: string[] } | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const first = person.full_name.split(" ")[0];

  const finish = (res: ClockResult): string | null => {
    if (res.ok) {
      onDone(
        res.action === "in"
          ? `Entrada marcada, ${first}: ${timeCR(res.at)}.`
          : `Salida marcada, ${first}: ${timeCR(res.at)}.`,
      );
      return null;
    }
    return res.error;
  };

  if (ask) {
    return (
      <div className="mx-auto w-full max-w-xs text-center">
        <h1 className="font-tf-serif text-[36px] leading-tight">{person.full_name}</h1>
        <p className="mt-1 text-muted">¿En cuál sede estás?</p>
        <div className="mt-6 grid gap-3">
          {ask.sedes.map((id) => (
            <button
              key={id}
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const msg = finish(await clockAction(person.id, ask.pin, id));
                  if (msg) setError(msg);
                })
              }
              className="h-14 cursor-pointer rounded-2xl border border-border bg-surface text-[17px] font-semibold hover:bg-surface-hover disabled:opacity-50"
            >
              {sedes.find((s) => s.id === id)?.name ?? id}
            </button>
          ))}
        </div>
        <p role="alert" className="mt-4 min-h-6 text-sm font-semibold text-[var(--danger)]">
          {error}
        </p>
        <button type="button" onClick={onBack} className="mt-2 cursor-pointer text-sm font-semibold text-muted hover:text-ink">
          Volver
        </button>
      </div>
    );
  }

  return (
    <PinPad
      person={person}
      subtitle={isIn ? "Escribí tu PIN para marcar la salida" : "Escribí tu PIN para marcar la entrada"}
      onBack={onBack}
      submit={async (pin) => {
        const res = await clockAction(person.id, pin);
        if (!res.ok && res.sedes) {
          setAsk({ pin, sedes: res.sedes });
          return null;
        }
        return finish(res);
      }}
    />
  );
}

function PinPad({
  person,
  subtitle,
  onBack,
  submit: send,
}: {
  person: DeskLockStaff;
  subtitle: string;
  onBack: () => void;
  /** Resolves to an error to show, or null when the caller took over. */
  submit: (pin: string) => Promise<string | null>;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = useCallback(
    (value: string) => {
      start(async () => {
        const err = await send(value);
        if (err) {
          sent.current = false;
          setError(err);
          setPin("");
        }
      });
    },
    [send],
  );

  // The PIN goes out from the click/keydown handler itself, never from inside a
  // state updater: React may replay updaters on re-render, which resent the PIN
  // in a loop (each unlock ended the session the previous one had opened).
  const sent = useRef(false);
  const press = useCallback(
    (d: string) => {
      if (pending || sent.current || pin.length >= 4) return;
      setError(null);
      const next = pin + d;
      setPin(next);
      if (next.length === 4) {
        sent.current = true;
        submit(next);
      }
    },
    [pending, pin, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace" && !sent.current) setPin((p) => p.slice(0, -1));
      else if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, onBack]);

  if (!person.has_pin) {
    return (
      <div className="text-center">
        <h1 className="font-tf-serif text-[36px]">{person.full_name}</h1>
        <p className="mt-3 text-muted">Todavía no tenés PIN. Pedile a un administrador que te asigne uno.</p>
        <button type="button" onClick={onBack} className="mt-8 cursor-pointer text-sm font-semibold underline underline-offset-4">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xs text-center">
      <h1 className="font-tf-serif text-[36px] leading-tight">{person.full_name}</h1>
      <p className="mt-1 text-muted">{subtitle}</p>

      <div className="mt-6 flex justify-center gap-3" aria-live="polite" aria-label={`${pin.length} de 4 números`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("size-4 rounded-full border-2 border-verde-profundo", i < pin.length && "bg-verde-profundo")}
          />
        ))}
      </div>
      <p role="alert" className="mt-4 min-h-6 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Key key={d} onClick={() => press(d)} disabled={pending}>
            {d}
          </Key>
        ))}
        <button type="button" onClick={onBack} className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
          Volver
        </button>
        <Key onClick={() => press("0")} disabled={pending}>
          0
        </Key>
        <Key onClick={() => !sent.current && setPin((p) => p.slice(0, -1))} disabled={pending} label="Borrar">
          <Delete size={22} aria-hidden="true" />
        </Key>
      </div>
    </div>
  );
}

function Key({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-16 cursor-pointer items-center justify-center rounded-2xl border border-border bg-surface text-2xl font-semibold transition-colors hover:bg-surface-hover disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Bootstrap() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirm) return setError("Los dos PIN no coinciden.");
    start(async () => {
      const res = await bootstrapAction(name, pin);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };

  const input =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-[16px] text-ink outline-none focus:border-primary";

  return (
    <form onSubmit={submit} method="post" className="mx-auto w-full max-w-sm">
      <h1 className="font-tf-serif text-[40px] leading-tight">Primer ingreso</h1>
      <p className="mt-2 text-muted">
        Todavía no hay personal registrado. Creá el primer administrador: después vas a poder agregar al resto del equipo.
      </p>
      <label htmlFor="boot-name" className="mt-6 mb-1.5 block text-sm text-muted">
        Tu nombre
      </label>
      <input id="boot-name" value={name} onChange={(e) => setName(e.target.value)} className={input} autoComplete="name" />
      <label htmlFor="boot-pin" className="mt-4 mb-1.5 block text-sm text-muted">
        PIN de 4 números
      </label>
      <input
        id="boot-pin"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        autoComplete="new-password"
        className={input}
      />
      <label htmlFor="boot-confirm" className="mt-4 mb-1.5 block text-sm text-muted">
        Repetí el PIN
      </label>
      <input
        id="boot-confirm"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        autoComplete="new-password"
        className={input}
      />
      <p role="alert" className="mt-3 min-h-6 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full cursor-pointer rounded-full bg-verde-profundo px-6 py-3.5 font-semibold text-crema-claro disabled:opacity-60"
      >
        Crear y entrar
      </button>
    </form>
  );
}
