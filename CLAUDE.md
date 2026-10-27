# ticofit — Project Context

This file loads automatically at the start of every session. It holds the business
context, the brand and the scope. `AGENTS.md` holds the working rules (git, commands,
what not to do). If the two disagree, ask.

> **Git, every task:** branch from the latest `staging`, merge back into `staging`.
> `main` is only updated from `staging` when the user asks. Full rules in `AGENTS.md`
> → "Branching".

---

## 1. What this is

A custom gym management platform for **ticofit wellness club**, a boutique gym in
Rohrmoser, San José, Costa Rica. The owner is **Jeremy**; his right hand is **Mack**.

Its own repo and its own Supabase project. It was seeded from the fit-crm codebase, but
this is now a single-client product: build for ticofit's real needs, not for hypothetical
other gyms.

ticofit is opening a **second location** in Parque del Café (target: late 2026) and moving
from open gym to a class-and-booking model. Jeremy's wife will run a "Healthy Bar" (soda)
inside the Café location.

**Today they run everything on Google Docs and Excel:** one file per client, routines typed
by hand into a template, exercise videos sent one by one over WhatsApp, events announced in
a WhatsApp group.

**Current priority: the public landing page.** Jeremy wants the website live with real info
— prices, memberships, gym info — before the internal system.

---

## 2. Brand

Rebranded October 2026. The identity is **premium, soft, modern and aspirational** — a
wellness brand, not a gym brand. Calm, airy, warm neutrals, organic shapes.

**The old black + acid-lime identity is dead.** If you find `#C4D82E`, the "TicoFit" capital
styling or the grey/lime TF monogram anywhere, it is a leftover. Remove it.

### Name
**ticofit wellness club** — lowercase, always. The wordmark carries a period after it
("ticofit.") and an ® in some lockups. It is *club*, not *center* — Jeremy changed this.

### Palette

| Token | Hex | Meaning |
|---|---|---|
| Verde lima claro | `#B4D780` | energía, naturaleza, movimiento |
| Amarillo suave | `#FFFEE1` | luz, comienzo, vitalidad |
| Celeste | `#81B6BD` | calma, respiración, recuperación |
| Verde profundo | `#24301C` | estabilidad, fuerza, conexión |
| Negro grisáceo | `#242424` | fuerza, estructura, entrenamiento |

These work as **full-bleed colour fields**, not as accents on black. Approved pairings:

- `#B4D780` background → `#24301C` text
- `#FFFEE1` background → `#24301C` or `#242424` text
- `#81B6BD` background → `#FFFEE1` text
- `#24301C` background → `#B4D780` or `#FFFEE1` text
- `#242424` background → `#B4D780` or `#FFFEE1` text

**Contrast rules:**
- `#B4D780` is light. Never white or `#FFFEE1` text on it — use `#24301C`.
- `#FFFEE1` is near-white. Never white text on it.
- Verify WCAG AA (4.5:1) on every pair you create and report failures.
- Never recolour semantic states (success / error / warning) with brand colours.

### Typography

The brand manual names Google Sans, Trendsetter Prestige and Biscotto. All three are
licensing problems — Google Sans is proprietary, the other two are commercial. **Use these
free substitutes unless told otherwise:**

- Display serif → **Instrument Serif** (Google Fonts)
- Geometric sans → **Figtree** (Google Fonts)

Load with `next/font`. Large size contrast between display and body is part of the look.

### Logo

Assets live in `public/branding/`, five colour variants at full size plus `@600` versions:
`white` · `cream` (#FFFEE1) · `green` (#24301C) · `lime` (#B4D780) · `ink` (#242424)

Pick by background: cream on verde profundo, green on lima or crema, white over photos.

Renders **flat** — no glow, no drop-shadow, no filter.
App icons (`app/favicon.ico`, `app/apple-icon.png`, `public/icon-192.png`,
`public/icon-512.png`) use the "ti" mark in lima on verde profundo.

### Visual language
- Organic blob and wavy container shapes, soft rounded forms
- Pill-shaped outlined labels for keywords: WELLNESS · STRENGTH · BALANCE · BREATHE · MOVE
- Four-pointed star/sparkle as a small decorative mark
- Photography: soft natural light, warm neutrals, motion blur, calm bodies mid-movement
- Tagline in use: **"Un nuevo comienzo se siente."**

### Contact
- Phone / WhatsApp: `+506 8827-2099` → `https://wa.me/50688272099`
- Locations: **AyD** (Rohrmoser) and **Café** (Parque del Café, not open yet)
- Google Maps: https://maps.app.goo.gl/DQkPhczxUTHfDDae9
- Google rating: 4.9 with 19 reviews

---

## 3. Scope — Fase 1 (agreed: 107 hours / $2,140)

Jeremy's budget is tight. This is deliberately cut back. Anything outside this list is a
later phase and must not be built without asking first.

| Module | What it includes | Hours |
|---|---|---|
| **Landing page** | Both locations · classes and disciplines · Healthy Bar section with info and prices · "Reservar" button that redirects to login · contact and location | 14 |
| **Cuentas y roles** | Login · cliente, coach, administrador · each sees only what they should | 10 |
| **Portal del cliente** | Assigned routine with exercises · membership status · upload payment receipt and see approval state · progress with tabs per metric (grasa, músculo, agua, perímetros), each with a chart against previous measurements | 28 |
| **Portal del coach** | Create clients and keep their expediente · record measurements, which fill the client's progress automatically · build and assign routines · approve/reject receipts · see who is paid up | 25 |
| **Salones y calendario** | List of salones · tap one to open its day calendar · same view for client and staff | 12 |
| **Reservas y aforo** | Client books a class from the salón calendar · cancel · per-salón capacity · live occupancy | 18 |

### Explicitly OUT of scope
- Interactive SVG floor map — **Jeremy rejected it**, he wants a plain list of salones
- Credits and class packages
- Measurement appointments booked by the client against coach availability
- Financial dashboard and reports
- Events module
- Payment gateway (ONVO Pay)
- Electronic invoicing with Hacienda
- Employee attendance / biometric clock-in (separate future product)
- Native mobile app

**Consequence:** without credits, the system does NOT limit how many classes a client books.
Per-salón capacity is enforced; per-membership limits are not. Fine while AyD is open gym;
must be solved before the Café opens.

---

## 4. Decisions already made — do not relitigate

**No payment gateway.** With ~200 clients at ₡38,000, fees would run roughly ₡400,000/month
— close to a salary. Clients upload a photo of their SINPE transfer and an employee approves
it from a list. Cash payments are recorded directly by the employee, with no receipt.

**Shared computers, personal PIN.** Gym computers stay logged in under a **sede account**.
Each employee has a 4-digit PIN entered when they make a change, so every record carries who
changed it and when. Sede is a property of the account: an AyD machine only ever shows AyD
data. Jeremy's account sees both and gets a sede switcher.

**Access is invite-only.** No pre-authorized email, no access. Enforce server-side and in RLS.

**Roles:**
- **Dueño (Jeremy)** — everything, both sedes, with a sede switcher
- **Admin (Mack)** — everything except the financial dashboard unless the owner grants it
- **Empleado** — clients, agenda, routines, measurements, approve receipts. No finances.
- **Pasante** — as empleado but cannot create routines or measurements. Shown with a visible
  `P` next to their name wherever they appear.
- **Profesional externo** (physio, nutritionist) — only their own patients; never prices or
  finances
- **Cliente** — only their own data

The inherited code has `admin / coach / client`. Changing the roles model is sensitive:
present the plan and SQL first.

**The consultorio is a rentable room, not a fixed specialty.** ticofit rents it by the hour.
Do not label rooms "Fisioterapia" or "Nutrición". Each booked slot carries a service type
that sets its colour — pick four distinguishable colours that work within the new palette
and report them.

---

## 5. Domain rules that affect the data model

**Measurements — three separate things, do not merge into one form:**

1. **Client profile** (once): nombre, cédula, domicilio, género, fecha de nacimiento,
   teléfono, tipo de sangre, ocupación, experiencia deportiva, contacto de emergencia
   (nombre, parentesco, teléfono)
2. **Historia clínica y objetivos** (occasional): antecedentes patológicos, medicamentos,
   lesiones deportivas, ejercicios no deseados, objetivos, frecuencia semanal, tiempo
   disponible. **Restricted** — must not appear in general listings or exports.
3. **Measurement session** (monthly): fecha, coach, hora inicio/fin, estatura, peso; from
   the InBody: músculo en kg, grasa en kg, % agua; by tape: pectoral, brazo derecho, brazo
   izquierdo, cintura, umbilical, cadera, muslo derecho, muslo izquierdo, pantorrilla
   derecha, pantorrilla izquierda; edad metabólica, puntuación de salud, observaciones.

**Store raw values, compute derived ones on read. Never persist them.** Percent muscle and
fat come from kg over weight. Waist/hip ratio and its "ELEVADO" flag are computed. BMI is
computed. Storing results makes the history unfixable if a formula or threshold changes.

One measurement per client per month — block requesting another before the interval passes.

**Routines.** 2 to 6 days. Valid 4–6 weeks, then an alert to renew. Shared exercise library
with video. Client sees only their current routine and can export it to PDF. Coach can leave
comments. Record who assigned it.

**Payments.** Each client has their own billing date from their signup date, not a common
monthly date. Automatic suspension on non-payment: the routine is blocked with a message and
a button to pay. Any employee can reactivate.

**Capacity.** AyD 25 people, Café 50 — building totals, with per-salón limits on top.

**Hours.** Monday to Friday 6am–9pm, Saturday 8am–12pm.

---

## 6. Content rules

All user-facing copy in **Costa Rican Spanish**, natural and direct. The brand voice is
premium and calm — aspirational, never shouty. No consultant language.

**All landing content lives in `src/content/landing.ts`.** Do not scatter copy, prices or
schedules through components. One file to edit when Jeremy sends the real data.

**Never invent:** prices, member counts, class schedules, trainer names, certifications,
testimonials, reviews, event names, mission statements, company history, or years in
business. Use the `[Pendiente — Jeremy]` placeholder. ticofit supplies all real content.

**Prices are not confirmed.** Their own posters contradict each other on the open gym
monthly rate (₡40,000 on one, ₡105,000 on another, while the quarterly ₡112,500 implies
₡37,500/month). Do not hardcode prices anywhere.

Photos and video come from the client. **No stock photography.**
