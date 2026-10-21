import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { WhatsAppIcon, InstagramIcon, TikTokIcon } from "@/components/icons";
import { SITE, SOCIALS, NAV_LINKS } from "@/content/site";

const socialLinks = [
  { href: SOCIALS.instagram, label: "Instagram", Icon: InstagramIcon },
  { href: SOCIALS.tiktok, label: "TikTok", Icon: TikTokIcon },
  { href: SOCIALS.whatsapp, label: "WhatsApp", Icon: WhatsAppIcon },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo className="h-7" />
          <p className="mt-3 max-w-xs text-sm text-muted-2">{SITE.tagline}</p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex gap-3">
          {socialLinks.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-ink"
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </div>
      </Container>

      <Container className="mt-10 text-center text-xs text-muted-2 md:text-left">
        © {new Date().getFullYear()} {SITE.name}. Todos los derechos reservados.
      </Container>
    </footer>
  );
}
