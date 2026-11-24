# ticofit — Internal system build (overnight, unattended run)

You are building the ticofit internal system end to end, unattended, overnight.
Guillermo is asleep. **Nobody will answer questions.** Read this whole file before
writing any code, then execute it phase by phase.

UI copy in Costa Rican Spanish (voseo: "Reservá", "Subí", "Elegí"). Code, comments,
commit messages and table/column names in English.

---

## 0. Ground rules for an unattended run — read twice

1. **Never stop to ask.** When something is ambiguous, pick the most reasonable option,
   build it so it is easy to change later, and log it in `PROGRESS.md` under
   `## Decisions` (what you chose, why, what the alternative was).
2. **Keep `PROGRESS.md` at the repo root up to date** after every phase: phase status,
   what was built, migrations created, decisions, open questions for Guillermo, known
   issues. If the session is cut off (usage limits), the next session resumes from this
   file. On start, **if `PROGRESS.md` already exists, read it and continue from where it
   left off** instead of starting over.
3. **Git:** work on branch `feat/internal-system` (create it from `staging`). Commit at
   the end of every phase (and mid-phase for big ones). Push the branch.
   **Do NOT merge into `staging` or `main`. Do NOT deploy.** `staging` is the Vercel
   production branch — merging it would publish half-reviewed work. This overrides the
   self-merge rule in `AGENTS.md` for this run only.
4. **Database — remote project, so be careful:**
   - Before the first migration, confirm the linked Supabase project ref is
     **`branjuyfmqqrbisclasy`**. If it is anything else, stop the DB work, log it in
     `PROGRESS.md`, and continue with code only. Never touch the fit-crm or sport-lab
     projects.
   - Before the first migration, back up the remote DB (schema + data) with
     `supabase db dump` into `backups/` (add `backups/` to `.gitignore`).
   - Migrations are **additive only**: create tables/columns/policies/functions.
     **No `DROP TABLE`, `TRUNCATE`, `DELETE` without `WHERE`, or destructive column
     changes on tables that already hold data.** If an existing table is in the way,
     add to it or create a new one and log the cleanup as a follow-up.
   - Numbered migrations in `supabase/migrations/`, following existing conventions.
     **RLS enabled on every table**, with policies written in the same migration.
   - No demo data in the remote DB except clearly flagged test rows you create for
     verification (`is_demo = true` or names prefixed `DEMO —`). **Delete them at the
     end of the run** and confirm in `PROGRESS.md`.
5. **Do not touch the public landing**, except wiring the `#horario` section to the
   real class schedule (phase 5). `/membresias` and the Numa ProteinBar page are
   off-limits.
6. **Never invent business data** (prices, names, schedules, coach names). Real data you
   do have is in section 2. Anything else: `[Pendiente — Jeremy]` or an editable setting.
7. **Definition of done per phase** (from `AGENTS.md`): `yarn lint` clean, `yarn build`
   passes, Playwright screenshots at 1440px and 390px reviewed by you (saved under
   `design/internal/screenshots/<phase>/`), AA contrast on every new color pair, and a
   self-review of the diff with 🔴/🟡/🔵/⚪ severity citing `file:line`, written into
   `PROGRESS.md`.
8. Before building anything, **inventory what already exists** in the repo (it was
   seeded from fit-crm and has Sport Lab's routine builder ported in): auth, roles,
   clients, routines, exercise library, measurements, waitlist, horario. **Reuse and
   extend; do not duplicate.** Write the inventory into `PROGRESS.md` first.

---

## 0b. Decisions from Guillermo (2026-11-21) — these override anything below

1. **Scope:** build everything in this file, payroll included. It replaces the Fase 1
   list in `CLAUDE.md` §3 for the internal system.
2. **Who logs in:**
   - **Clients** have their own login (invitation only), one account per person.
   - **Staff do not log in individually.** Desk computers stay signed in under a **sede
     account**. Every staff member has a **personal 4-digit PIN**; entering it identifies
     who is acting, and their role decides what that action is allowed to do. Every
     write records the employee behind the PIN (`created_by` / `updated_by` point at the
     employee, not at the sede account).
   - The **time clock** (check-in / check-out for staff attendance) also works with the
     PIN on the shared computer. It is in scope (Phase 7).
   - PINs are stored hashed, never in plain text; lock out after repeated wrong tries.
3. **Database:** write the migrations, but apply them to the remote project only once
   the code that uses them is done and verified. Same additive-only rules as §0.4.
4. **`staging` is production** (Vercel deploys it). ~~Never merge the internal system into
   `staging`~~ — **superseded 2026-11-23:** Guillermo asked to move everything to `staging` to
   test it there before showing Jeremy. `main` still only moves when he says so.
8. **Owners (2026-11-23):** Guillermo and Jeremy are the only people who can do absolutely
   everything: role `owner` (Dueño), every permission plus `data.delete`. Any test or mistake
   can be deleted or reverted by an owner (`owner_delete()`, migration 0030).
5. **Prices:** the ones on the public `/membresias` page (`src/content/landing.ts`) are
   the correct ones. Seed plans from there. They match §2.
6. **Consultorio:** not defined yet — do not build it. Only the disciplines (§2) and the
   salones are defined; Guillermo and Jeremy will name the salones in the app.
7. **Measurements and the client file follow the sheet they use today, field by
   field** (see §4 Phase 2 "Sheet fields"). Do not add fields the sheet doesn't have.

---

## 1. Brand & UI

Use the existing tokens in `src/config/brand.ts` and the existing components. Palette:
deep green `#24301C`, light lime `#B4D780`, cream `#FFFEE1`, sky `#81B6BD`,
yellow-green `#E1E289`, ink `#242424`. Fonts: Instrument Serif (display), Figtree
(sans). Never white/cream text on `#B4D780`; use `#24301C`. The logo is the existing
inline React SVG component — never typeset it.

The internal system is used on shared desk computers and on phones (it's a PWA). Coach
and admin screens: dense, fast, keyboard-friendly. Client screens: mobile first.

---

## 2. Business context (real data — use it)

- **Sedes** (names come from config/DB, editable — not final):
  - **ticofit parque bellavista** (Rohrmoser) — open now. Open gym, no reservation
    needed for open gym. Building capacity **25**.
  - **ticofit parque del café** — not open yet (landing shows a waitlist). Everything
    requires a reservation, including open gym: **max 40 per hour**, one open-gym slot
    per hour. Building capacity **50**.
- **Opening hours:** Mon–Fri 6:00–21:00, Sat 8:00–12:00. Store as editable settings per
  sede.
- **Disciplines:** Pilates Reformer, Yoga, Barre, Functional System (guided class),
  Open Gym, Recovery (sauna, infrared/red light therapy, cold plunge). Also Baile and
  Entrenamiento personal exist. Make disciplines an editable table.
- **Classes:** 6–8 people per class by default. **Pilates Reformer max 5** (5 machines).
- **Plans (monthly, IVA not included):**
  - Bellavista: Open gym ₡40.000. Personal training add-on: 4 sessions ₡17.500 each ·
    8 sessions ₡15.000 each · 12 sessions ₡12.500 each.
  - Café: Premium ₡60.000 (open gym + daily functional + 4 salón classes) · Plus
    Premium ₡80.000 (same + 8 salón classes) · Plus + ₡100.000 (same + recovery
    sessions).
  - Store plans in the DB, editable by admin. These are the seed values.
- **No payment gateway.** Clients upload a photo of their SINPE/transfer receipt; staff
  at the desk approve or reject it. Staff can also register cash payments directly.

---

## 3. Roles & access

Three roles now: **`client`**, **`coach`**, **`admin`**. Build the model so more roles
can be added later without a rewrite (role stored in a table/enum + a permissions layer,
not `if role === 'admin'` scattered in components). Planned future roles, do **not**
build them now: owner, intern (shown with a visible "P"), external professional.

- **Invitation only.** No pre-authorized email, no account. Enforce on the server and in
  RLS. Admin invites coaches and admins; coaches and admins invite clients (creating a
  client record sends the invitation).
- Every user belongs to one or both sedes. Staff only see data of their sede(s). Admins
  with access to both get a sede switcher.
- **`can_manage_payroll`** permission flag on admin profiles. Payroll and salaries are
  visible only to admins with this flag (Jeremy yes; other admins no by default).
- Each role sees only what is theirs:
  - **client:** own profile, own routine, own progress, own membership & receipts, own
    reservations, the class calendar.
  - **coach:** clients of their sede(s), measurements, routines, receipt approval,
    calendar, reservations, who's paid up. No payroll, no salaries.
  - **admin:** everything in their sede(s), employees, settings; payroll only with the
    flag.
- Every write records **who** did it and **when** (`created_by`, `updated_by`,
  timestamps). Approvals record the approver.

---

## 4. Build phases

Do them in order. Each phase ends with the definition of done (section 0.7), a commit,
and a `PROGRESS.md` update.

### Phase 1 — Auth, roles, sedes

- Login, invitation flow, role + sede scoping, permission helpers, route protection per
  role, RLS helper functions (e.g. `auth_role()`, `auth_sedes()`).
- App shell for each role with navigation to the modules below (empty states where a
  module isn't built yet).
- Settings (admin): sedes (name, address, building capacity, opening hours, status
  `open` / `coming_soon`).

### Phase 2 — Clients & medical file (expediente)

Three **separate** things. Do not merge them into one form.

**a) Client profile** (once): full name, cédula, address (domicilio), gender, date of
birth (**age is computed, never stored**), phone, blood type, occupation, sports
experience, emergency contact (name, relationship, phone), sede, join date.

**b) Clinical history & goals** (occasional, versioned with dates):
- Pathological history, medications, sports injuries, exercises to avoid.
- Goals (multi-select): gain muscle mass · reduce body fat % · improve physical
  condition · stay healthy and active.
- Weekly training frequency, available time per session (e.g. 1h30).
- Target weight, target body fat %, target muscle %.
- **Restricted access:** health data. Visible to coaches/admins of the client's sede and
  to the client. Never shown in lists, search results, or exports.

**c) Measurement session** (monthly):
- Date, coach (who measured), start/end time.
- Height (cm), weight (kg).
- InBody: muscle (kg), fat (kg), body water (%), metabolic age, health score.
- Tape: chest (pectoral), right arm, left arm, waist (cintura), umbilical, hip (cadera),
  right thigh, left thigh, right calf, left calf.
- Observations (free text).
- **Store raw values only. Compute derived values on read, never persist them:**
  muscle % and fat % (kg / weight), waist-to-hip ratio and its risk flag ("ELEVADO",
  with thresholds by gender in one config file), BMI, age.
- One measurement per client per month: block a second one inside the interval
  (admin can override, logged).

**Sheet fields (the sheet used today — this is the source of truth, §0b.7):**
- Profile: nombre · cédula · domicilio · género · fecha de nacimiento (edad computed) ·
  teléfono · tipo de sangre · ocupación · experiencia deportiva · contacto de emergencia
  (nombre, parentesco, teléfono) · frecuencia semanal · tiempo de disponibilidad.
- Objetivos (checkboxes): aumento de masa muscular · reducción de porcentaje graso ·
  mejorar condición física · mantenerse saludable y activo.
- Historia clínica: antecedentes patológicos · medicamentos · lesiones deportivas ·
  ejercicios no deseados.
- Evaluación (one per measurement): fecha de medición · coach · estatura · peso ·
  músculo (kg) → porcentaje computed · grasa (kg) → porcentaje computed · % agua ·
  peso objetivo · % grasa objetivo · % músculo objetivo · pectoral · brazo der · brazo
  izq · cintura · umbilical · cadera · muslo der · muslo izq · pantorrilla der ·
  pantorrilla izq · cint/cad computed with the "ELEVADO" flag · observaciones · edad
  metabólica · puntuación de salud.
- The sheet has **no start/end time** and puts the **targets on each evaluation**, not
  on the clinical history: follow the sheet. The grey bars next to músculo/grasa/agua
  are shown as the previous measurement against the current one.

**Coach portal:** create clients (sends invitation), client list with search and status
(paid up / overdue / suspended), client file with tabs: Perfil · Historia clínica ·
Mediciones · Rutina · Membresía y pagos · Reservas.

**Client "Progreso":** tabs per metric — **Grasa · Músculo · Agua · Perímetros** (plus
Peso). Each tab: a chart of the value across all past measurements, the latest value,
and the delta vs the previous one and vs the first one. Perímetros: pick a body part,
same chart. Measurements entered by the coach show up here automatically. Show the
client's targets as a reference line when set. Use the chart library already in the
repo; if none, Recharts.

### Phase 3 — Memberships & payments

- Client membership: plan, sede, start date, **billing day derived from the client's own
  join date** (not a shared date), status `active` / `overdue` / `suspended`, next due
  date.
- **Receipt upload (client):** photo or PDF of the transfer, amount, date, reference.
  Private storage bucket, signed URLs only.
- **Desk review (coach/admin):** queue of pending receipts with the image, approve or
  reject (rejection requires a reason the client sees). Approving extends the
  membership one period.
- Staff can register a cash payment directly (amount, date, who received it).
- **"Quién está al día":** list filtered by status with days overdue, last payment,
  plan; WhatsApp link (`wa.me/506…`) with a prefilled reminder.
- **Automatic suspension:** after a configurable grace period (default 5 days, setting)
  the membership goes to `suspended`. A suspended client sees their routine **locked**
  with a message and a button to upload a receipt, and cannot reserve. Any coach/admin
  can reactivate (logged). Implement the status change as a scheduled DB function
  (pg_cron if available) or computed status on read — pick one, log why.
- Client sees their membership status, payment history and the state of each receipt
  (pending / approved / rejected + reason).

### Phase 4 — Exercise library & routines

**4a. Exercise library research (do this first, write it up).**
The current library (inherited from Sport Lab) works well: it has instructions and a
category. Research free exercise databases and compare them against it. Candidates to
evaluate at minimum: the current Sport Lab library, `free-exercise-db`
(github.com/yuhonas/free-exercise-db), wger (wger.de API / data dumps), ExerciseDB,
plus anything else you find. Evaluate:
- **License** allows commercial use (and what attribution it requires).
- Media: images, GIFs or video, and whether we can **self-host** them (no hotlinking).
- Instructions, category, primary/secondary muscles, equipment, level.
- Spanish availability, or how cleanly it can be translated.
- Size and quality.

Write the comparison table and recommendation into
`design/internal/exercise-library-research.md`. **Switch only if a candidate is clearly
better for a coach building routines fast and a client understanding the movement.**
Otherwise keep the current library and enrich it (e.g. import missing exercises or
media from a compatible source). Respect licenses; record attribution in the app.

**4b. Library UX (coach):**
- Search in Spanish, with synonyms: typing **"espalda"** returns back exercises
  (lats, middle back, lower back, traps…), "pierna" returns quads/hamstrings/glutes/calves,
  etc. Map muscle groups to Spanish labels in one place.
- Filter chips: muscle group, equipment, category, level.
- Each exercise: media, instructions in Spanish, muscles, equipment.
- Coaches can add their own exercises with their own video upload (today they send
  videos one by one over WhatsApp — this replaces that).
- Favorites per coach for speed.

**4c. Routine builder (coach):**
- 2 to 6 days per routine. Per exercise: sets, reps (or time), rest, load/notes, order,
  supersets.
- Fast: add exercises from the filtered library without leaving the builder; duplicate a
  day; duplicate a whole routine for another client; save as template.
- Validity 4–6 weeks; renewal alert to the coach when it expires.
- Coach comments on the routine and on each exercise. Records who assigned it.
- Assign to a client. The client sees **only their current routine**.

**4d. Export (client & coach):** the client should not have to open the app every day
unless they want to.
- **PDF export** of the routine: one section per day, exercise name, sets/reps/rest,
  notes, a thumbnail, and a **QR code per exercise** that opens its video/demo. Brand
  styling, printable on A4/Letter, readable on a phone.
- Also a mobile-friendly read-only view the client can save to their home screen (PWA).
- Choose the PDF approach that fits the stack (e.g. `@react-pdf/renderer`); log why.

### Phase 5 — Salones, disciplines & calendar

- **Salones** (editable table): name, sede, capacity. There will be ~5 per sede but they
  are **not defined yet** — seed generic editable names and log it as pending for
  Jeremy.
- **Disciplines are the primary label; each discipline is assigned to a salón.** The
  class takes its salón from its discipline by default (overridable per class).
- **Classes:** discipline, salón, coach, sede, start, end, capacity (defaults: discipline
  default → salón capacity; Reformer 5). Weekly recurring templates + one-off classes +
  cancel a single occurrence.
- **Salón list → tap a salón → that salón's calendar for the day** (day navigation).
  **Same view for clients and staff**; staff see extra controls.
- **Wire the landing `#horario` section to this real data** (public, read-only, no
  internal capacity numbers shown — use "cupos disponibles" / "lleno" instead of raw
  aforo). Keep its current design and the `?servicio=` filter.

### Phase 6 — Reservations & capacity (aforo)

- Client reserves a class from the salón calendar or the horario. Requires an active
  membership. Show available spots.
- Client cancels; configurable cancellation cutoff (default 2 hours before, setting).
  Staff can cancel or book on behalf of a client.
- **Capacity enforced in the database** (transaction/constraint or locked function), not
  only in the UI — two clients cannot take the last spot at the same time.
- Per-salón capacity **and** building capacity per sede (25 / 50). Café open gym: one
  reservable slot per hour, max 40.
- **Live occupancy count:** per salón and per building for the current hour, updated in
  real time (Supabase Realtime). Staff can mark attendance (check-in) at the desk.
- No per-plan class limits for now (no credits system). Log this as a known gap.

### Phase 7 — Employees & payroll (admin with `can_manage_payroll`)

Jeremy manages his staff and payroll here. Costa Rica.
- **Employees:** linked to a user account when they have one (coaches/admins) or not
  (other staff). Name, cédula, position, sede(s), hire date, phone, email, bank account
  (IBAN), pay type: monthly salary / hourly / per class, rate, status.
- **Classes taught** come automatically from the schedule (phase 5) for per-class pay;
  hours can be entered or imported for hourly staff.
- **Payroll runs:** period (weekly / biweekly / monthly, setting), per employee: gross,
  deductions, net; employer charges; status `draft` → `approved` → `paid`, with who
  approved and when.
- **Rates are settings, not code:** CCSS employee and employer percentages, Banco
  Popular, income-tax salary brackets. Seed them with the values you can verify from an
  official source and note the source and date; anything you cannot verify is seeded
  empty and listed in `PROGRESS.md` as "verify with Jeremy's accountant". Never
  hardcode a rate.
- **Aguinaldo** (computed: earnings from December 1 to November 30 / 12) and
  **vacation balance** per employee. Show them; do not auto-pay.
- Export a payroll run to CSV and PDF.
- Bank accounts and salaries: strictest RLS in the system.

### Phase 8 — Final QA

- End-to-end walkthrough with Playwright for each role: invite → login → client file →
  measurement → progress charts → routine → PDF export → receipt upload → approval →
  reservation → capacity limit hit → cancellation → payroll run.
- RLS check: try reading another sede's data, another client's data, a coach reading
  payroll, a client reading clinical history of someone else. All must fail. Write
  these as SQL or script tests you can rerun.
- Delete all demo/test rows created in the remote DB.
- `yarn lint` + `yarn build`.
- Final `PROGRESS.md`: what's done, what's not, every decision, every
  `[Pendiente — Jeremy]`, the list of migrations, and a short "how to review this
  branch" checklist for Guillermo.

---

## 5. Pending data (do not invent — leave editable and list in PROGRESS.md)

Salón names and capacities per salón · coach names and the class schedule · final sede
names · cancellation cutoff and grace period confirmation · payroll rates not verifiable
from an official source · recovery session details.
