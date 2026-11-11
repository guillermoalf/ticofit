"use client";

import { useId, useRef, useState } from "react";

import { joinWaitlistAction, type WaitlistField } from "@/app/(site)/lista-espera/actions";
import { landing, type SedeId } from "@/content/landing";
import { cn } from "@/lib/utils";
import { normalizarEmail, normalizarNombre, normalizarTelefono } from "@/lib/waitlist";

const copy = landing.home.listaEspera;

/**
 * "Entrar en lista de espera" button + its modal. Uses a native <dialog>
 * opened with showModal(): the rest of the page goes inert (focus stays
 * trapped inside) and Esc closes it; a click on the backdrop closes it too.
 */
export function WaitlistButton({ sede, className }: { sede: SedeId; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const [estado, setEstado] = useState<"form" | "enviando" | "exito">("form");
  const [errores, setErrores] = useState<Partial<Record<WaitlistField, true>>>({});
  const [error, setError] = useState<string | null>(null);

  const abrir = () => {
    if (estado === "exito") {
      setEstado("form");
      formRef.current?.reset();
    }
    setErrores({});
    setError(null);
    ref.current?.showModal();
  };
  const cerrar = () => ref.current?.close();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const local: Partial<Record<WaitlistField, true>> = {
      ...(!normalizarNombre(String(data.get("nombre"))) && { nombre: true }),
      ...(!normalizarTelefono(String(data.get("telefono"))) && { telefono: true }),
      ...(!normalizarEmail(String(data.get("email"))) && { email: true }),
    };
    setErrores(local);
    setError(null);
    if (Object.keys(local).length > 0) {
      const primero = (["nombre", "telefono", "email"] as const).find((k) => local[k]);
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${primero}"]`)?.focus();
      return;
    }

    setEstado("enviando");
    try {
      const res = await joinWaitlistAction(data);
      if (res.ok) {
        setEstado("exito");
        return;
      }
      setErrores(res.fields ?? {});
      setError(res.error ?? null);
    } catch {
      setError(copy.error);
    }
    setEstado("form");
  };

  const campo = (name: WaitlistField, type: string, autoComplete: string, extra?: React.ReactNode) => {
    const c = copy.campos[name];
    const invalid = !!errores[name];
    return (
      <div>
        <label htmlFor={`${id}-${name}`} className="mb-1.5 block text-[14px] font-semibold">
          {c.label}
        </label>
        <input
          id={`${id}-${name}`}
          name={name}
          type={type}
          autoComplete={autoComplete}
          inputMode={name === "telefono" ? "tel" : undefined}
          required
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-${name}-error` : extra ? `${id}-${name}-ayuda` : undefined}
          className={cn(
            "min-h-12 w-full rounded-xl border bg-crema-claro px-4 text-[16px] text-verde-profundo outline-none focus-visible:border-verde-profundo focus-visible:ring-2 focus-visible:ring-verde-profundo/25",
            invalid ? "border-red-700" : "border-linea-tag",
          )}
        />
        {invalid ? (
          <p id={`${id}-${name}-error`} className="mt-1.5 text-[13px] text-red-700">
            {c.error}
          </p>
        ) : (
          extra
        )}
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={cn(
          "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-verde-profundo px-5 text-[14px] font-semibold text-crema-claro transition-opacity hover:opacity-90",
          className,
        )}
      >
        {copy.boton}
      </button>

      <dialog
        ref={ref}
        aria-labelledby={`${id}-titulo`}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar();
        }}
        className="m-auto w-[calc(100%-32px)] max-w-[460px] rounded-[28px] bg-crema-claro p-0 text-verde-profundo backdrop:bg-verde-profundo/55"
      >
        <div className="relative p-6 md:p-8">
          <button
            type="button"
            onClick={cerrar}
            aria-label={copy.cerrar}
            className="absolute top-3 right-3 inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-[22px] leading-none hover:bg-verde-profundo/8"
          >
            <span aria-hidden="true">×</span>
          </button>

          <h2 id={`${id}-titulo`} className="pr-10 font-tf-serif text-[34px] leading-[1.05] font-normal">
            {copy.titulo}
          </h2>

          {estado === "exito" ? (
            <div role="status" className="mt-5">
              <p className="text-[17px] leading-[1.6]">{copy.exito}</p>
              <button
                type="button"
                onClick={cerrar}
                autoFocus
                className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-verde-profundo text-[15px] font-semibold text-crema-claro"
              >
                {copy.cerrar}
              </button>
            </div>
          ) : (
            <form ref={formRef} noValidate onSubmit={onSubmit} className="mt-3">
              <p className="mb-6 text-[15px] leading-[1.6] text-musgo">{copy.texto}</p>
              <input type="hidden" name="sede" value={sede} />
              {/* Honeypot: hidden from people and assistive tech, filled by bots. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                  Empresa
                  <input type="text" name="empresa" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <div className="flex flex-col gap-4">
                {campo("nombre", "text", "name")}
                {campo(
                  "telefono",
                  "tel",
                  "tel",
                  <p id={`${id}-telefono-ayuda`} className="mt-1.5 text-[13px] text-musgo">
                    {copy.campos.telefono.ayuda}
                  </p>,
                )}
                {campo("email", "email", "email")}
              </div>
              {error && (
                <p role="alert" className="mt-4 text-[14px] text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={estado === "enviando"}
                className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-verde-profundo text-[15px] font-semibold text-crema-claro disabled:cursor-wait disabled:opacity-60"
              >
                {estado === "enviando" ? copy.enviando : copy.enviar}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
