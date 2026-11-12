import { TicofitLogo } from "@/components/brand/ticofit-logo";
import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { PANEL } from "./panel";
import { PillLink } from "./pill-link";
import { SmartLink } from "./smart-link";

const { footer, contacto } = landing;

/** Shared footer on `/` and `/comunidad`. */
export function SiteFooter() {
  return (
    <footer className={cn(PANEL, "bg-negro-grisaceo px-5 pt-[72px] pb-11 text-crema-claro lg:px-10 lg:pt-[88px]")}>
      <div className="flex flex-wrap gap-12 border-b border-linea-oscura pb-[52px]">
        <div className="min-w-0 flex-[999_1_400px]">
          <p className="font-tf-serif text-[34px] leading-[1.1] lg:text-[42px]">
            {footer.tagline.linea}
            <br />
            <span className="italic">{footer.tagline.italica}</span>
          </p>
          <PillLink
            href={footer.whatsappCta.href}
            variant="lima"
            className="mt-7 min-h-[50px] px-8 text-[15px]"
          >
            {footer.whatsappCta.label}
          </PillLink>
        </div>

        <div className="min-w-0 flex-[1_1_200px]">
          <h2 className="mb-3.5 text-[11px] font-normal tracking-[2.4px] text-lima-claro">
            {footer.sedes.titulo}
          </h2>
          {footer.sedes.items.map((sede) => (
            <p key={sede.nombre} className="mb-3 text-[15px] leading-normal text-niebla last:mb-0">
              {sede.nombre}
              <br />
              {sede.detalle}
            </p>
          ))}
        </div>

        <div className="min-w-0 flex-[1_1_200px]">
          <h2 className="mb-3.5 text-[11px] font-normal tracking-[2.4px] text-lima-claro">
            {footer.contacto.titulo}
          </h2>
          <p className="mb-2.5 text-[15px]">
            <SmartLink href={contacto.whatsappUrl} className="text-niebla no-underline hover:text-lima-claro">
              {contacto.telefono}
            </SmartLink>
          </p>
          <p className="mb-2.5 text-[15px]">
            <SmartLink href={contacto.mapsUrl} className="text-niebla no-underline hover:text-lima-claro">
              {footer.contacto.comoLlegar}
            </SmartLink>
          </p>
          <p className="text-[15px]">
            <SmartLink href={footer.contacto.instagram.href} className="text-niebla no-underline hover:text-lima-claro">
              {footer.contacto.instagram.label}
            </SmartLink>
          </p>
        </div>

        <div className="min-w-0 flex-[1_1_180px]">
          <h2 className="mb-3.5 text-[11px] font-normal tracking-[2.4px] text-lima-claro">
            {footer.club.titulo}
          </h2>
          {footer.club.links.map((link) => (
            <p key={link.href} className="mb-2.5 text-[15px] last:mb-0">
              <SmartLink href={link.href} className="text-niebla no-underline hover:text-lima-claro">
                {link.label}
              </SmartLink>
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-4 pt-[26px]">
        <TicofitLogo className="h-10 w-auto text-crema-claro" />
        <p className="text-[13px] text-niebla-suave">{footer.copyright}</p>
      </div>
    </footer>
  );
}
