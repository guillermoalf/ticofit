# Task — Build the ticofit public landing page

Read `CLAUDE.md` and `AGENTS.md` first. The design for this task lives in
`design/landing/` — read `design/landing/README.md` before anything else, then read
all six files in `design/landing/reference/`.

Those six artboards are the **approved design**. Reproduce them. Do not redesign,
do not "improve" the layout, do not substitute your own component library.

This task is the landing page ONLY. Build nothing from the internal system.

---

## Before you write code

Show me:
1. The route map and the file tree you intend to create.
2. The shape of `src/content/landing.ts` (keys only, no values).
3. The `BRAND` tokens you will add to `src/config/brand.ts`.

Then stop and wait for approval.

---

## Stack rules for this task

- Next.js App Router, TypeScript, Tailwind. No new dependencies without telling me why.
- **Every string, price and class name goes in `src/content/landing.ts`.** Components
  read from it. Never hardcode copy in a component.
- **Every colour and font token goes in `src/config/brand.ts`.** Components read from
  it. Never hardcode a hex.
- Copy in Costa Rican Spanish, taken verbatim from the reference files. Code and
  comments in English.
- Server Components by default. `"use client"` only on the three interactive pieces
  listed below.

## Typography

Load with `next/font/google`:
- Display serif → **Instrument Serif** (400, and 400 italic)
- Body sans → **Figtree** (400, 500, 600)

The size jump between them is part of the brand. Headlines run 38–76px in Instrument
Serif; body is 15–17px Figtree. Take the exact sizes from the reference files.

## Palette (add to `brand.ts`)

| Token | Hex |
|---|---|
| `verdeProfundo` | `#24301C` |
| `limaClaro` | `#B4D780` |
| `cremaClaro` | `#FFFEE1` |
| `celeste` | `#81B6BD` |
| `amarilloVerde` | `#E1E289` |
| `negroGrisaceo` | `#242424` |

Rules: never white or cream text on `#B4D780` — use `#24301C`. Never white on
`#FFFEE1`. Verify every text/background pair you create at WCAG AA (4.5:1) and report
any that fail.

## Images

Move `design/landing/images/*.jpg` into `public/img/landing/`. Use `next/image` with
`fill` + `object-fit: cover` inside the positioned containers. Every image needs a
real Spanish `alt` — the reference files already carry them, copy those.

Mark only the home hero image `priority`.

---

## Routes to build

| Route | From | Notes |
|---|---|---|
| `/` | `Main.dc.html` | hero · intro 2-col · 4 tiles · classes band · sedes · "¿No sabe por dónde empezar?" · wide CTA · reviews · footer |
| `/sedes` | `Sedes.dc.html` | tab switcher between the two locations |
| `/clases` | `Clases.dc.html` | sede filter + alternating editorial rows |
| `/numa` | `Numa.dc.html` | Numa ProteinBar |
| `/membresias` | `Membresias.dc.html` | dark page, sede switcher, plans, comparison table |
| `/comunidad` | `Comunidad.dc.html` | story, team, reviews, footer |

### Shared components

- `<SiteHeader />` — identical on every page. Nav items in this order:
  **Sedes** (with a chevron, opens a dropdown with the two locations) · **Clases** ·
  **Numa ProteinBar** · **Membresías** · **Comunidad**, then the `Reservar` pill.
  On `/membresias` the header sits on the dark background and flips to cream text.
  The active link is underlined.
  `"use client"` — it owns the dropdown state.
- `<SiteFooter />` — identical on `/` and `/comunidad`. Four columns plus the
  tagline and the WhatsApp button.

### The three interactive pieces (`"use client"`)

1. Header's Sedes dropdown. Closes on outside click and on Escape.
2. `/sedes` and `/membresias` sede switcher — `role="tablist"` with real `<button>`s
   and `aria-selected`. Default: `/sedes` opens on Pavas, `/membresias` opens on
   Parque del Café.
3. `/clases` sede filter — three buttons: Todas / ticofit pavas / ticofit parque del
   café. Defaults to Todas.

Everything else is static. No animation library for this task.

### `Reservar` / `RESERVAR` buttons

Every one of them links to `/login` for now. The booking flow is a later phase.

---

## Content rules — read this twice

The reference files already say exactly what the public sees. **Do not add operational
detail back in.** Specifically, these never appear on the public site:

- Building capacity numbers (25, 40, 50)
- "se abre un espacio cada hora"
- The number of reformer beds
- Per-class headcount ("6 a 8 personas")

They are translated into benefit language in the reference files — *sin reserva*,
*con reserva*, *grupos pequeños*, *cupo muy limitado*, *nunca lleno*. Keep that wording.

**Never invent** trainer names, certifications, reviews, opening dates, the Numa menu
or the club's history. The reference files mark those `[Pendiente — Jeremy]`. Keep the
placeholder visible on the page until the client sends real content. If you are
tempted to write a plausible review, stop and leave the placeholder.

Prices come from the reference files and are already correct. All are monthly, IVA
separate. Keep the `+ IVA` label next to every one.

---

## Responsive

Desktop is 1440px. Everything must also work at 390px:
- The nav collapses into a hamburger with a full-screen panel.
- The 2-col grids and the alternating class rows stack.
- The membership comparison table scrolls horizontally inside an `overflow-x: auto`
  box — do not shrink the type to make it fit.
- The home hero drops to ~520px tall and the headline to ~44px.

## Definition of done

Per `AGENTS.md`: `yarn lint` clean, `yarn build` passes, **screenshots of all six
routes at 1440px and 390px reviewed by you**, contrast verified, self-review of the
diff with 🔴/🟡/🔵/⚪ severity. Then merge and delete the branch yourself.

Branch: `feat/landing-page`
