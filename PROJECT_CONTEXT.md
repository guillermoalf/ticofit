# ticofit — Project Context

> Paste this file as the first message of a new AI chat (or hand it to a new developer)
> to get fully up to speed. It was written on 2026-11-27 from the code, the database
> migrations, the docs and the git history of this repo. Anything I could not confirm
> from the code is marked **⚠️ Unclear / needs confirmation**.
>
> Other docs that stay authoritative:
> - `CLAUDE.md`: business context, brand and scope. Loads automatically in Claude Code.
> - `AGENTS.md`: working rules (git, commands, definition of done).
> - `design/internal/SISTEMA-INTERNO.md`: internal-system spec. Its §0b holds Guillermo's
>   decisions and overrides the rest.
> - `PROGRESS.md`: phase-by-phase log of the internal system, with decisions D1–D12,
>   architecture A1–A7 and known issues.

---

## 1. What the app is

**ticofit wellness club** is a boutique gym in Rohrmoser, San José, Costa Rica.
- **Owner:** Jeremy. His right hand is Mack.
- **Developer and product owner of this repo:** Guillermo Alfaro.
- **Second location:** opening in Parque del Café (target: late 2026). It moves from open
  gym to a class-and-booking model and has a protein bar/café, **nüma protein bar &
  coffee**, run by Jeremy's wife (called "Healthy Bar" and "Numa ProteinBar" in older docs).

This repo is a **single-client, custom gym platform** for ticofit. It has three faces:

1. **Public website (landing)** at `/`, `/membresias`, `/numa`, `/comunidad`, `/sedes`
   and `/clases`. It shows the brand, the two locations ("sedes"), the live class
   schedule, plans and prices, the café and the community. CTAs go to WhatsApp.
2. **Client portal** at `/portal/...`. An invited client sees:
   - their current routine (exportable to PDF);
   - their progress charts from monthly body measurements;
   - their membership status, with SINPE receipt upload;
   - class booking and cancelling.
3. **Staff desk ("Escritorio")** at `/escritorio/...` and `/bloqueo`. The gym's shared
   computers stay signed in as a sede account, and each employee unlocks it with a
   personal 4-digit PIN. From there staff manage:
   - clients and their files;
   - measurements and routines;
   - payment receipts and who is paid up;
   - salones, classes and reservations;
   - staff, the time clock and payroll.

The repo was seeded on 2026-10-21 from a white-label "fit-crm" codebase. That is why the
`package.json` name is `fit-crm` and some legacy coach-oriented screens and tables remain.

**Sedes (locations):**
- **ticofit parque bellavista** (id `bellavista`) is the Rohrmoser gym. It is open and
  runs as open gym only.
  - `CLAUDE.md` calls it **AyD**, and the landing used "Pavas" early on.
  - Building capacity is 25. Since migration 0031 its rooms are "Open gym" and
    "Consultorio".
- **ticofit parque del café** (id `cafe`) is not open yet: the landing shows a waitlist.
  - Building capacity is 50, with several salones for classes.

---

## 2. The problem we solve

**Before this app, ticofit ran on Google Docs and Excel:**
- One file per client.
- Routines typed by hand into a template.
- Exercise videos sent one by one over WhatsApp.
- Payments tracked by hand.
- Events announced in a WhatsApp group.

The pain points and how the app solves each:

| Pain | How the app addresses it |
|---|---|
| Client data scattered across files | One client file (`clients`) per person, owned by the sede. It holds the profile, a restricted clinical history, measurements, routine, membership, payments and reservations (`/escritorio/clientes/[id]`). |
| Monthly InBody/tape measurements on paper sheets | The measurement form follows the paper sheet field by field. Derived values (BMI, % fat and muscle, waist/hip, "ELEVADO") are computed on read and shown as progress charts to the client. |
| Routines typed by hand, videos sent over WhatsApp | Exercise library with YouTube links or uploaded videos, a routine builder with templates, and a client view with a printable PDF that has a QR code per video. |
| Payment gateway fees too high (~₡400k/month at ~200 clients) | **No gateway.** Clients upload a photo of their SINPE transfer, staff approve it from a queue, and staff record cash directly. Status (active / overdue / suspended) is computed from each client's own billing anchor. |
| Shared gym computers, but every change must be traceable | Desk accounts plus a personal PIN. Every write is stamped with the employee behind the PIN, at database level. |
| Café moves to classes with capacity | Salones, a weekly schedule, one-off classes, and reservations with per-salón and per-building capacity enforced under a lock. Live occupancy is shown on the desk. |
| Staff attendance and payroll done by hand | PIN time clock on the lock screen, corrections, and payroll runs (draft → approved → paid) with CSV and PDF. The payroll rates are pending Jeremy's accountant. |
| Owners must fix mistakes without calling the developer | Role **Dueño** (`owner`): only owners can delete or revert any record and manage salones and disciplines (migrations 0030–0031). |

---

## 3. Core features (today)

### Public site (`src/app/(site)/`)
- **Home (`/`):**
  - intro animation (the logo "writes itself" and travels into the navbar);
  - full-bleed service slider hero;
  - a sede picker that filters the page;
  - the live class schedule `#horario`, read from the database through
    `public_schedule()`;
  - reviews, illustrated maps with Waze and Google Maps buttons;
  - the Café waitlist modal.
- **`/membresias`:** plans and prices per sede (copy in `src/content/landing.ts`).
- **`/numa`:** the café.
- **`/comunidad`:** a full-height video with three scenes.
- **`/clases`:** redirects to `/#horario`.
- **`/sedes`:** redirects to the home's sede picker (`/?sede=…#sedes`); the navbar's "Sedes" links do the same.
- **Header:** a small sign-in icon goes to `/login`. "Reservar" and "Comprar" CTAs open
  WhatsApp. The schedule's "Reservar" goes to `/portal/clases`.

### Login (`/login`)
- **Animated entry:** a verde profundo field with the logo lifts off a celeste page with
  a curved edge.
- **Sign-in options:** email + password, Google OAuth, and "forgot password" (a recovery
  link to `/portal/crear-contrasena`).
- **Success:** the field drops back and the app goes to `/portal`, which routes by role.
- **Invite only:** an unknown Google account lands on `/sin-acceso`.

### Client portal (`/portal/...`, role `client`)
- `inicio` (home), `rutina` (current routine, PDF at `/imprimir/rutina/[id]`)
- `progreso` (charts per metric against past measurements)
- `pagos` (membership status, receipt upload, receipt states)
- `clases` (salones → day calendar → book or cancel)
- `perfil`, `crear-contrasena`, `lista-espera`
- A suspended membership blocks the routine with a message and a pay button.

### Staff desk (`/escritorio/...`, desk account + PIN)
Navigation lives in `src/app/escritorio/nav.ts`. Each item hides itself without the
permission:
- **Hoy:** dashboard.
- **Clientes:** roster, new client, client file with these tabs:
  - Perfil;
  - Historia clínica (restricted, append-only versions);
  - Mediciones (one per 30 days; admins override with a reason);
  - Rutina;
  - Membresía y pagos;
  - Reservas.

  The file also has the portal invitation button.
- **Comprobantes:** the receipt review queue (approve or reject with a reason).
- **Quién está al día:** who is paid up, with a WhatsApp reminder.
- **Salones y clases:**
  - salones per sede with live occupancy (refreshed every 30 s);
  - day calendar per salón and class roster with check-in;
  - booking for a client;
  - weekly schedule (`horario`);
  - "Salones y disciplinas" (`configurar`), owners only.
- **Ejercicios y rutinas:** exercise library (search with Spanish synonyms, filters,
  favorites), routine templates, and the routine builder per client.
- **Personal:** staff, roles, sedes, PIN, and the "Cargo que se muestra" display title.
- **Reloj:** time-clock entries. Managers correct them; everyone else sees their own.
- **Planilla** (per-person payroll flag; owners always have it): payroll data, rates,
  runs, CSV and print.
- **Ajustes:** sede settings, plans, payment rules, desk accounts.
- **Lock screen (`/bloqueo`):**
  - "¿Quién está trabajando?": pick a name, type the PIN;
  - "Marcar entrada o salida" is the time clock and needs no unlock.
- **Owner "Borrar" (red) buttons** on:
  - a client and everything attached, login included;
  - a measurement, a clinical version, a routine;
  - a payment (reverts its months) and a receipt (with its payment);
  - the whole membership, a one-off class, a person;
  - an approved or paid payroll;
  - a salón or a discipline, with their classes.

### Legacy screens (from fit-crm, still in the repo)
- `/portal/clientes`, `/portal/programas`, `/portal/visitas`, `/portal/evidencias`,
  `/portal/ejercicios` and `/portal/admin` are coach and admin screens of the old model.
- They are dark-themed and nobody uses them; the new desk replaces them.
- Desk and legacy `admin` logins are redirected from `/portal` to `/escritorio`
  (`src/app/portal/layout.tsx`).

---

## 4. Tech stack

| Piece | What / why |
|---|---|
| **Next.js 15.5 (App Router)** | Server Components and Server Actions for every write, so pages and mutations share one server-side Supabase client that carries the staff PIN token. Pinned to `15.5.29` (upgraded on 2026-11-10). Dev runs with `next dev --turbopack`. |
| **React 19.2** | Comes with Next 15.5. |
| **TypeScript 5.9** | Strict. `yarn build` type-checks. |
| **Tailwind CSS v4** | CSS-first tokens (`@theme inline` in `src/app/globals.css`). Brand colours are injected as CSS variables from `src/config/brand.ts` (`siteCssVars()`, `appCssVars()`). |
| **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) | Postgres, Auth, Storage and RLS. Project ref **`branjuyfmqqrbisclasy`**; never touch any other project. Most business logic lives in **SECURITY DEFINER SQL functions (RPCs)**, so rules hold even if the UI is bypassed. |
| **pgcrypto** (in Postgres) | bcrypt hashes for staff PINs; SHA-256 of staff session tokens. |
| **Auth** | Supabase Auth: email + password, magic link and recovery, Google OAuth. Invite only, enforced by the `handle_new_user()` trigger and the `preauthorized_emails` ledger (0009/0010). |
| **Storage buckets** | `receipts` (private, 10 MB, images or PDF; clients upload to their own folder, staff read via 10-minute signed URLs) · `exercise-videos` (public, 50 MB) · `evidence` (private, legacy progress photos). |
| **sonner** | Toasts. |
| **lucide-react** | Icons. |
| **framer-motion / gsap (@gsap/react)** | Landing animations (home intro, hero slider). |
| **qrcode** | QR per exercise video on the printed routine. |
| **class-variance-authority, clsx, tailwind-merge** | UI primitives (`cn()` in `src/lib/utils.ts`). |
| **Charts** | No library: a hand-rolled SVG line chart (decision D3 in `PROGRESS.md`). |
| **Playwright** (`@playwright/test`) | End-to-end walkthrough (`e2e/`), run against the local dev server and the **real** Supabase project, with self-cleaning DEMO accounts. |
| **bcryptjs** (dev) | Only used by `e2e/data.mjs` to seed a test PIN hash. |
| **Fonts** | Self-hosted with `next/font/local` in `src/fonts/`. **Google Sans** (sans, root layout, with `GoogleSans-OFL.txt`) and **Antic Didone** (display serif, marked "TRIAL" in `src/lib/fonts.ts`). ⚠️ `CLAUDE.md` says to use Instrument Serif and Figtree; the code uses Google Sans and Antic Didone (commit "Google Sans (brand manual) as the only sans" on 2026-11-11). Confirm which is final and that the Google Sans license is OK. |
| **Package manager** | **yarn 1.22.22** (`packageManager` in `package.json`). Node ≥ 20. |
| **Hosting** | **Vercel**: project `ticofit` deploys the **`staging` branch as production** (`ticofit.vercel.app`); other branches get preview deployments. The repo also has `amplify.yml`, and `AGENTS.md` says AWS Amplify. ⚠️ Which host is canonical, what `main` deploys to, and whether a custom domain exists. |

---

## 5. Architecture overview

```
Browser ──► Next.js (Vercel)
             ├─ (site)/*            public pages, static content from src/content/landing.ts
             │                      + public_schedule() via the browser Supabase client (anon)
             ├─ /login              client component, supabase-js in the browser
             ├─ /auth/callback      route handler: code exchange → /portal (or /sin-acceso)
             ├─ /portal/*           server components, requireProfile(); client role
             ├─ /bloqueo            desk lock screen (pick name + PIN, time clock)
             ├─ /escritorio/*       server components, requireStaff(permission)
             ├─ /imprimir/*         print views (routine, payroll)
             └─ middleware.ts       refreshes the Supabase session on /portal, /escritorio,
                                    /bloqueo, /imprimir only (the public site never pays it)
                      │
                      ▼  anon key + user JWT (+ x-staff-token header on desks)
                 Supabase (Postgres + RLS + RPCs, Auth, Storage)
```

### Auth and identity model
1. **Clients** sign in as themselves (`profiles.role = 'client'`). Their file in
   `clients` is linked by `clients.user_id`; walk-ins have no login (`user_id` is NULL).
2. **Desk accounts** (`profiles.role = 'desk'`, or legacy `'admin'`) are the shared gym
   computers. `desk_sedes` binds a desk to one or more sedes. A desk bound to both sedes
   gets the sede switcher. `isDeskRole()` lives in `src/lib/staff/context.ts`.
3. **Staff** are rows in `staff`, **not** auth users. On a desk, a person picks their
   name and types the PIN, and `staff_unlock()` (SECURITY DEFINER) then:
   - checks the bcrypt hash;
   - counts failures (5 → locked 15 min);
   - creates a `staff_sessions` row whose random token is stored only as SHA-256.

   The token lives in the httpOnly cookie `tf_staff` (`src/lib/staff/token.ts`). The
   server client (`src/lib/supabase/server.ts`) forwards it as the **`x-staff-token`**
   header, and SQL reads it through `current_staff_id()`. The session:
   - is bound to the desk account that opened it;
   - expires after an idle window (default 10 min; `staff_session_touch()` slides it);
   - also ends when someone locks the desk.

   **Why:** it keeps one shared login per computer but enforces each employee's role in
   the database. A custom JWT per employee would need the project's JWT secret and fight
   key rotation (`PROGRESS.md` A2).
4. **Permissions** are data, not code:
   - `staff_roles` × `staff_permissions` → `staff_role_permissions`;
   - code asks `can(staff, "clients.write")` (`src/lib/staff/permissions.ts`), and SQL
     asks `staff_can('...')`, `staff_can_client(perm, client_id)` and
     `staff_can_sede(perm, sede_id)`;
   - `payroll.manage` is the per-person flag `staff.can_manage_payroll`.

   The roles:
   - **`owner` (Dueño):** every permission, plus `data.delete` and `salons.manage`, which
     no other role holds. Only an owner can create or change an owner; the last active
     owner can't be removed (`guard_owner_role` trigger).
   - **`admin` (Administrador):** everything except payroll (unless granted),
     `data.delete` and `salons.manage`.
   - **`coach`:** clients, clinical history, measurements, routines, payments, receipts,
     reservations.

   `staff.display_title` changes only the label shown, never permissions. Guillermo is
   `owner` shown as "Administrador".
5. **Audit:** every staff write sets `created_by_staff` / `updated_by_staff` with triggers
   (`stamp_staff_audit`) from `current_staff_id()`, so client code can't forge it.

### Data flow conventions
- **Reads:** server components call the server client. RLS policies scope rows to the
  acting employee's sedes, or to the client's own data.
- **Writes:**
  - server actions (`actions.ts` next to each page) call **RPCs** (`routine_save`,
    `receipt_review`, `payment_record_cash`, `reservation_book`, `staff_clock`,
    `payroll_run_compute`, `owner_delete`, …);
  - tables mostly grant only SELECT, plus column-level INSERT/UPDATE where a direct
    write is safe;
  - every action re-checks the permission with `staffForAction(perm)`.
- **Service role** (`src/lib/supabase/admin.ts`, `SUPABASE_SERVICE_ROLE_KEY`) is used
  server-side only for things RLS can't do:
  - invitations and auth user creation (`src/lib/clients/invite.ts`);
  - deleting a client's login or receipt files after `owner_delete()`
    (`src/app/escritorio/undo-actions.ts`).
- **Computed on read, never stored:** BMI, % fat and muscle, waist/hip and its
  "ELEVADO" flag, membership status, due date and days overdue (view
  `membership_overview`), aguinaldo, vacation balance. Storing derived values would make
  history unfixable when a formula changes.
- **Time zone:** Costa Rica is fixed UTC−6. Helpers in `src/lib/schedule.ts`
  (`crInstant`, `crTime`, `crClock`, `crDate`, `pickDay`, `dayLabel`) and `today_cr()`
  in SQL.

### Folder structure
```
src/
├─ app/
│  ├─ (site)/            public landing pages + layout (fonts, colour tokens, header)
│  ├─ login/             animated sign-in (page.tsx + layout.tsx)
│  ├─ auth/callback/     OAuth/magic-link code exchange (route.ts)
│  ├─ auth/invitacion/   invitation landing page
│  ├─ sin-acceso/        "you are not invited" page
│  ├─ portal/            client portal (+ legacy coach/admin screens)
│  ├─ bloqueo/           desk lock screen
│  ├─ escritorio/        staff desk: one folder per module, each with page.tsx + actions.ts
│  ├─ imprimir/          print views (rutina, planilla)
│  └─ api/_debug-host/   TEMPORARY debug endpoint (see §10)
├─ components/  site/ portal/ desk/ clients/ billing/ routines/ schedule/ brand/ ui/ motion/
├─ config/brand.ts       ⭐ brand tokens (palette, fonts, contact). Read BRAND; never hardcode.
├─ content/landing.ts    ⭐ all landing copy, prices, CTAs. One file for Jeremy's data.
├─ lib/
│  ├─ supabase/          client.ts (browser), server.ts (+ staff token), admin.ts, middleware.ts, env.ts
│  ├─ staff/             context.ts (getStaff/requireStaff/staffForAction), permissions.ts,
│  │                     token.ts, clock.ts, payroll.ts, undo.ts
│  ├─ clients/           fields (the sheet), body (derived metrics), invite, parse
│  ├─ billing/           types, signed-urls
│  ├─ routines/          library, server
│  ├─ schedule.ts        CR time helpers, slots
│  ├─ public-origin.ts   public origin behind a proxy (OAuth redirects)
│  └─ portal.ts          requireProfile(), hasPassword()
├─ fonts/                self-hosted woff2
└─ middleware.ts
supabase/
├─ migrations/           0001–0031, applied by hand in the SQL Editor
├─ dry-runs/             000X_dry_run.sql per migration since 0023 (see §7)
├─ tests/rls_check.sql   rerunnable RLS check → RLS_OK / RLS_FALLAS
└─ cleanup/              LOCAL ONLY (excluded via .git/info/exclude), never committed
e2e/                     Playwright walkthrough (walkthrough.spec.ts, data.mjs, global setup/teardown)
design/                  landing handoff + motion spec; internal-system spec + research
```

### UI conventions
- UI copy in **Costa Rican Spanish with voseo** ("Reservá", "Subí", "Elegí"). Code,
  comments, commits and table names in **English**.
- Desk forms are always `method="post"`, and their submit button stays disabled until
  hydrated, so a pre-hydration submit can't fall back to GET and put data in the URL.
- Inputs use `text-[16px] text-ink`, **never `text-base`**: `base` is a colour token
  here (`--color-base`).
- Confirmations are inline ("¿Seguro? Sí / No"). Avoid native `confirm()`: it froze
  Chrome automation during testing (`components/desk/owner-delete.tsx` is the pattern).

---

## 6. Data model

All tables have RLS on. The main entities, by migration:

**Legacy (0001–0022, from fit-crm)**
- `profiles` holds every auth user: `role` (enum `user_role`: client, coach, admin, plus
  desk), `authorized` (the suspend switch), `coach_id` and intake columns.
  - These intake columns are **legacy and unused**: `profiles` is self-editable on every
    column, so business data moved to `clients`.
- `preauthorized_emails` is the invitation ledger (`intended_role`, `consumed_at`).
  `handle_new_user()` refuses any signup without a pending row.
- `exercises` is the shared library: 38 system exercises seeded in 0018, plus staff rows.
- Legacy model, kept but unused by the new screens:
  - `programs` / `program_items`, `routines` / `routine_items`;
  - `exercise_weight_logs`;
  - `visits`, `measurements` (its stored `muscle_pct` and `fat_pct` are derived values:
    don't use them), `evidence_photos`;
  - `clients_meta` (the old coach-billing model).
- `waitlist` holds Café pre-registrations.

**Sedes, staff, PIN (0023)**
- `sedes` (`bellavista`, `cafe`; `status` open/…, hours, capacity) and `app_settings`
  (key/value with check constraints per key).
- `staff` holds `role_id`, `can_manage_payroll`, `active` and `display_title` (0031).
- `staff_sedes`, `staff_roles`, `staff_permissions`, `staff_role_permissions`.
- `staff_pins` holds the bcrypt hash and lockout. It is separate so no policy can ever
  expose it.
- `staff_sessions` (token hash, desk, expiry) and `desk_sedes`.

**Clients (0024)**
- `clients` is the file the sede owns: profile fields from the paper sheet,
  `user_id → profiles` for the login, `sede_id`, `join_date`.
- `client_clinical_history` is **append-only** versions: the restricted health data.
  It never appears in listings or exports.
- `client_measurements` holds one session per row with **raw values only**.
  - One per `measurements.interval_days` (30); an override needs a written reason.
  - `guard_client_measurement` enforces this.

**Billing (0025, 0026)**
- `plans` (per sede; `kind` membership/package) and `client_memberships` (**one per
  client**: plan, `start_date`, `periods_paid`, `reactivated_until`).
- `membership_events` (assigned / plan changed / restarted / reactivated).
- `payment_receipts` (SINPE photo in the `receipts` bucket; pending, approved or
  rejected with a reason) and `payments` (`method` receipt or cash, `periods`).
- View `membership_overview`:
  - `paid_through = start_date + periods_paid months − 1 day`, always recomputed from
    the anchor (no 31st→28th drift);
  - `status` = active / overdue (within `payments.grace_days`) / suspended;
  - 0026 made the due date a payment day, not a late day.
- Writes go only through `membership_assign`, `membership_reactivate`,
  `payment_record_cash` and `receipt_review`, plus `owner_delete` for undo.

**Library and routines (0027)**
- `exercises` gains `muscle_groups`, `equipment`, `level`, `instructions`, `video_path`
  and `archived`. Also `staff_exercise_favorites`.
- `client_routines` → `client_routine_days` → `client_routine_items`.
  - A routine with `client_id NULL` is a **template**.
  - The client sees only their newest assigned routine (`current_routine_id()`).
  - Routines are 2–6 days, valid 4–6 weeks, saved whole by `routine_save()`.

**Salones and reservations (0028, 0031)**
- `salones` (per sede, capacity) and `disciplines` (shared by both sedes, `slug`
  matches the landing's `?servicio=`).
- `discipline_salons` holds the default salón per discipline per sede.
- `class_templates` is the weekly schedule. `classes` are dated occurrences, generated
  lazily by `classes_ensure()` / `class_slots()` / `public_schedule()`, so no cron job.
  - Cancelling keeps the row (`status 'cancelled'`) so it is never regenerated.
  - One-off classes have no template.
- `class_reservations`: `reservation_book()` enforces per-class and per-building
  capacity under a lock on the sede row.
  - Settings: `reservations.cancel_cutoff_hours` (2) and
    `reservations.book_ahead_days` (7).
  - Clients book only in their own sede, only if the sede is `open`, and only with an
    active or overdue membership.
  - There is **no per-membership class limit** (out of scope).

**Payroll (0029)**
- `staff_employment` (cédula, job title, hire date, IBAN `^CR[0-9]{20}$`, `pay_type`
  monthly/hourly/per_class, `rate`).
- `staff_time_entries`: one open entry per person, a 16 h max, and source pin/manual.
- `staff_vacations` and `payroll_rates` (CCSS employee/employer %, Banco Popular %,
  income-tax brackets, vacation days per 50 weeks; **seeded EMPTY**).
- `payroll_runs` (draft → approved → paid) and `payroll_lines`. Once approved, a run is
  a **frozen snapshot**: rates are copied in at compute time.
- Aguinaldo and vacation balance are computed on read in `payroll_people()`.

**Owners and undo (0030, 0031)**
- Role `owner` plus the permissions `data.delete` and `salons.manage`.
- `owner_delete(kind, id)` deletes a record **and reverts what it caused**:
  - deleting a payment takes its months off `periods_paid`;
  - deleting a receipt's payment sends the receipt back to pending;
  - deleting a receipt also deletes the payment it created.

  It returns the storage paths and the client login that the server must remove (SQL
  can't delete storage objects or auth users).
- `structure_delete('salon' | 'discipline', id)` removes a salón or discipline with its
  classes and templates.

---

## 7. Problems we've solved (and why)

1. **Staff identity on shared computers.**
   - **Problem:** one login per gym computer, but every change must carry the real
     employee and their role must be enforced.
   - **Solution:** a PIN session token forwarded as `x-staff-token`, read in SQL by
     `current_staff_id()`. Permissions live in data, and audit columns are filled by
     triggers.
   - **Why:** enforcement in the database, not just the UI. Custom per-employee JWTs
     were rejected (JWT secret, key rotation).
   - **Where:** `0023_sedes_staff_pin.sql`, `src/lib/staff/*`, `src/lib/supabase/server.ts`.
2. **The PIN pad unlocked ~140 times in 4 minutes and never got in.**
   - **Problem:** the PIN was sent from inside a React `setPin` updater, which React
     replays. Each unlock ended the session the previous one opened.
   - **Solution:** send it once from the click/key handler, guarded by a ref.
   - **Where:** `src/app/escritorio/desk-lock.tsx`.
3. **`staff_set_pin` let any signed-in account set any PIN** (caught before applying).
   - **Problem:** with no PIN session, the guard evaluated to NULL and passed.
   - **Lesson:** dry runs must run the **whole migration file**, never a trimmed copy.
   - **Where:** 0023; `PROGRESS.md` → Known issues.
4. **Migrations on a live database with no local Postgres.**
   - **Problem:** there is no Supabase CLI or local DB on the dev machine, and the
     remote project is production.
   - **Solution:** each migration since 0023 ships a **dry-run file**
     (`supabase/dry-runs/00XX_dry_run.sql`). It wraps the full migration in
     `execute $mig$…$mig$` and runs dozens of permission/RLS cases with
     `dryrun_check()`, then always raises so everything rolls back.
     - The first line says `DRYRUN_OK` or `DRYRUN_FALLAS (n): …`.
     - Guillermo pastes it into the SQL Editor; on `DRYRUN_OK` he runs the migration,
       and the agent verifies read-only through the Supabase MCP.
   - **Why:** catches real bugs. Examples: 0029's invalid sede on clock-out, and
     same-transaction timestamps fixed with `clock_timestamp()`.
   - **Where:** `supabase/dry-runs/`. The generator scripts were scratch files and are
     not in the repo.
5. **Desk forms leaking data into the URL.**
   - **Problem:** a submit before hydration fell back to the browser's GET.
   - **Solution:** `method="post"` everywhere, and buttons disabled until hydrated.
   - **Where:** `src/components/desk/record-form.tsx`.
6. **Membership off-by-one and date drift.**
   - **Problem:** the due date counted as a late day, and month arithmetic drifted from
     the 31st to the 28th.
   - **Solution:** compute everything from the anchor `start_date` + `periods_paid` in
     the view (0026).
   - **Why:** no stored state to fix, and changing grace days applies immediately (D8).
7. **Derived values stored in the old schema.**
   - **Problem:** the legacy `measurements` stored % fat and muscle.
   - **Solution:** the new tables store raw values only; everything is computed in
     `src/lib/clients/body.ts`.
   - **Why:** formulas and thresholds can change without corrupting history.
8. **Capacity race conditions.**
   - **Problem:** two clients could take the last spot at the same time.
   - **Solution:** `reservation_book()` locks the sede row and checks both class and
     building capacity.
   - **Where:** 0028.
9. **Live occupancy.**
   - **Problem:** Supabase Realtime can't carry the `x-staff-token` header.
   - **Solution:** `router.refresh()` every 30 s (`AutoRefresh` on the salones page).
10. **OAuth redirects to `localhost` in production.**
    - **Problem:** behind AWS Amplify's proxy, `request.url` carries `localhost:3000`.
    - **Solution:** `resolvePublicOrigin()` reads `x-forwarded-host`, then
      `NEXT_PUBLIC_SITE_URL`, then the request origin. The browser side uses
      `window.location.origin`.
    - **Where:** `src/lib/public-origin.ts`, `src/app/auth/callback/route.ts`.
    - **Still open on Vercel (2026-11-24):** Google sign-in on staging bounced to
      localhost because Supabase Auth's Site URL and Redirect URLs didn't include
      `https://ticofit.vercel.app`. That is a dashboard setting, not code. ⚠️ Confirm
      it was changed.
11. **The service role key missing at runtime on Amplify.**
    - **Problem:** Amplify doesn't forward runtime env vars to the SSR compute.
    - **Solution:** `next.config.ts` inlines `SUPABASE_SERVICE_ROLE_KEY` into the
      **server** bundle at build. `admin.ts` is never imported by a client component.
12. **Middleware latency.**
    - **Problem:** `getUser()` could take ~30 s on a stale cookie.
    - **Solution:** the middleware matcher is limited to `/portal`, `/escritorio`,
      `/bloqueo` and `/imprimir`.
    - **Where:** `src/middleware.ts`.
13. **Black flash of the old portal after login (2026-11-24).**
    - **Problem:** Guillermo's legacy `admin` login rendered the dark legacy `/portal`
      shell before going to the desk.
    - **Solution:** `src/app/portal/layout.tsx` now redirects every `isDeskRole()` login
      to `/escritorio` before painting.
14. **The login form hidden under the curve.**
    - **Problem:** the animated band was absolute or fixed, so scrolling and autofill
      could put fields under it.
    - **Solution:** the band now sits in normal flow, and the form follows it with a
      margin equal to the curve height.
    - **Where:** `src/app/login/page.tsx`, CSS `tf-login-*` in `globals.css`.
15. **Owners must undo tests and mistakes without the developer (0030).**
    - **Solution:** one RPC, `owner_delete()`, with a kind per entity and the revert
      logic inside, plus the reusable `OwnerDelete` inline-confirm component.
    - **Why:** a single audited entry point is safer than per-table delete grants.
16. **Exercise videos without licensing risk.**
    - **Decision:** no third-party exercise database was imported (licences unclear).
      Coaches add their own videos or YouTube links, with Spanish search synonyms.
    - **Where:** `design/internal/exercise-library-research.md`, 0027.
17. **Receipt privacy.**
    - **Solution:** files go from the browser straight to the client's own folder in the
      private bucket. Staff see them only through 10-minute signed URLs, issued after
      RLS shows them the row (D12).
18. **Testing against production safely.**
    - **Solution:** Playwright creates `DEMO E2E` accounts with the service role, runs
      12 serial steps as desk and client, and its teardown deletes everything.
      `supabase/tests/rls_check.sql` rechecks isolation.
    - **Where:** `e2e/`, `supabase/tests/`.

---

## 8. Work history / timeline

| Date | Work |
|---|---|
| 2026-10-21 | Repo seeded from the fit-crm white-label base. |
| 2026-10-26 | Project docs (`CLAUDE.md`, `AGENTS.md`), landing design handoff, brand assets. Public landing (6 pages) built from the approved design. `staging` made the base branch. |
| 2026-11-08 → 11-09 | Home intro animation (the logo writes itself into the navbar). Inline SVG logo. Middleware scoped for performance. |
| 2026-11-10 | Full-bleed service slider hero. Next.js 15.5.29 / React 19.2.9. Sede cards. Live-ish schedule and reviews. "Pavas" renamed to **parque bellavista**. Café waitlist (table + modal + staff view). Instagram link. |
| 2026-11-11 | Google Sans as the sans. Display serif trial (Antic Didone). Every Reservar goes to WhatsApp. Illustrated sede maps with Waze and Google Maps. Google Cloud client secret files ignored. |
| 2026-11-12 → 11-15 | Colour-blocked landing sections, sede picker filtering the page, `/membresias` fixes, sede switch at the map. |
| 2026-11-19 → 11-21 | `/comunidad` video page. Navbar Sedes links to the picker. nüma wordmark in the nav. **Internal-system spec** with Guillermo's decisions (§0b). |
| 2026-11-22 | Internal system phases 1–3: desk, staff PIN, settings (0023); clients, clinical history, measurements, progress (0024); plans, memberships, SINPE receipts, cash, "who is paid up" (0025). PIN-loop bug fixed. |
| 2026-11-23 | Phases 4–8: due-day fix (0026); exercise library and routines with QR print (0027); salones, schedule and reservations, plus the landing `#horario` on real data (0028); time clock and payroll (0029); RLS check; DEMO cleanup; Playwright 12/12. **Everything merged to `staging`** at Guillermo's request. **Dueño role and undo** (0030). |
| 2026-11-24 | Sign-in icon in the header. **Animated login** (verde profundo / celeste). Login fixes (in-flow band, no legacy-portal flash, Google error shown). Salones and disciplines owner-only with delete, display title, bellavista = Open gym + Consultorio (0031). |

---

## 9. Current state

### Finished
- Public landing (6 pages), with the schedule wired to the database.
- Animated login, invite-only auth, Google OAuth, password recovery.
- Internal system phases 0–8 and migrations 0023–0031 (all applied and verified).
- Client portal: routine, PDF, progress, payments, classes.
- Owner undo and owner-only salón management.
- Playwright walkthrough (12/12) and RLS check (`RLS_OK`).

### Waiting on Jeremy (`[Pendiente — Jeremy]`, never invented)
- Café salón names and capacities (still "Salón 1–5" at building capacity), coaches,
  the real weekly class schedule (empty), final sede names.
- Payroll rates from the accountant: CCSS %, Banco Popular %, income-tax brackets,
  vacation days, payroll frequency. Each employee's payroll data.
- Waist/hip "ELEVADO" thresholds (WHO 0.90 / 0.85 written from memory; confirm), the
  cancellation cutoff (2 h), the booking window (7 days), recovery session details.
- Real photography: landing images are AI-generated placeholders (`public/img/landing/`,
  `public/hero/`) waiting for ticofit's photos.

### Before real use
- **SMTP** for invitation emails: the built-in mailer only reaches team addresses.
- Supabase Auth:
  - `https://ticofit.vercel.app/auth/invitacion` and `/auth/callback` in Redirect URLs;
  - the Site URL;
  - Spanish email templates.
- `NEXT_PUBLIC_SITE_URL` set on the host.
- Guillermo changes his PIN (it was exposed in a chat), and Jeremy gets added as Dueño.
- A second payroll holder: owners now always hold payroll, so adding Jeremy covers this.
- Leaked-password protection turned on in Supabase Auth.
- Decide whether desk accounts may change their own email or password through Supabase
  Auth.

### Known issues / tech debt
- **Legacy fit-crm code and tables** are still present and unused: `/portal/clientes`,
  `programas`, `visitas`, `evidencias`, `ejercicios`, `admin`, and the tables
  `profiles.coach_id`, `clients_meta`, `visits`, `measurements`, `routines`, `programs`.
  Clean them up deliberately.
- `src/app/api/_debug-host/route.ts` is a **temporary** debug endpoint that should be
  removed.
- Migrations `0022`–`0024` were applied in the SQL Editor but are **missing from the
  migration log**. A future `supabase db push` would re-run them; they are idempotent.
- The Supabase advisor flags anon EXECUTE on the legacy 0001–0021 definer helpers, two
  functions with a mutable `search_path`, and leaked-password protection off.
  - The "authenticated can execute SECURITY DEFINER" warnings on new RPCs are by design:
    each checks the PIN session and permission inside.
- New routines have no weight logging (the legacy routines had it).
- Two edge cases leave orphans:
  - a receipt whose insert fails after the upload leaves an orphan file;
  - an invite whose link step fails leaves a login with no file.
- Toasts use the dark theme on the light desk. The file picker says "Choose File"
  (browser language).
- The consultorio is just a salón. The spec's per-slot service types and colours were
  deliberately **not** built (§0b.6). The roles **Pasante** (visible "P") and
  **Profesional externo** from `CLAUDE.md` are not built yet.
- `backups/2026-11-22-pre-internal-system.json` is a hand-written JSON export, not a
  full `pg_dump`.

---

## 10. Gotchas & conventions

- **Git flow (non-negotiable, see `CLAUDE.md` / `AGENTS.md`):**
  - every task gets a new branch from the latest `staging`
    (`feat/…`, `fix/…`, `docs/…`, `chore/…`);
  - merge it into `staging` with `--no-ff` and push;
  - **never delete branches** and **never commit on `staging` or `main`**;
  - `main` only moves (fast-forward to `staging`) when Guillermo says so.
- **`staging` IS production** (Vercel). Anything merged is live.
- **Never touch another Supabase project.** This one is `branjuyfmqqrbisclasy`.
- **Schema changes:**
  - each one is a new numbered migration plus a dry-run file;
  - Guillermo runs both in the SQL Editor; the agent verifies read-only afterwards;
  - destructive SQL is never run through the MCP: it goes through Guillermo.
- **RLS is on everywhere.** Tables grant SELECT (plus some column-level writes); real
  writes go through SECURITY DEFINER RPCs that check `staff_can…` themselves. Revoke
  anon EXECUTE on every new function.
- **Brand values** come from `src/config/brand.ts` (`BRAND`) and **landing copy and
  prices** from `src/content/landing.ts`. Never hardcode either in components.
- **Never invent business data.** Use `[Pendiente — Jeremy]` or an editable setting.
- The brand name is always lowercase: **ticofit wellness club**.
  - The old black + acid-lime identity (`#C4D82E`) is dead.
  - Never put white or cream text on `#B4D780`.
  - Check AA contrast (4.5:1) for every new pair.
- `text-base` is a **colour** in this Tailwind setup. Use `text-[16px]` for size.
- **Legacy `admin` profiles act as desk accounts** (`isDeskRole`), and the legacy
  `/portal` coach screens still exist. Don't build on them.
- **`profiles` is self-editable**, so never put business or restricted data there; use
  `clients`.
- **Don't use `localStorage` / `sessionStorage` for auth.** Supabase handles it. The
  staff token is an httpOnly cookie.
- **Secrets:**
  - `.env.local`, `client secret*.json` (a local Google Cloud OAuth secret),
    `backups/`, `e2e/.data/` (test credentials), `playwright-report/` and
    `test-results/` are gitignored;
  - `supabase/cleanup/` is excluded through `.git/info/exclude`;
  - never commit any of these, and never paste a real client's health data or sheet
    into the repo.
- **Don't run `yarn build` while `yarn dev` is running** in the same checkout: it
  corrupts `.next`. Build in a separate worktree.
- **Playwright runs against the real database** and needs `yarn dev` up and
  `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. `E2E_KEEP=1` skips the teardown; clean
  up afterwards.
- **Things that look wrong but are intentional:**
  - the `package.json` name is `fit-crm`;
  - payroll rates are empty (no deductions apply until the accountant's rates are set);
  - class occurrences are generated on read (no cron);
  - the Café can't receive bookings until `sedes.status` and `landing.ts` both say it is
    open;
  - `public_schedule` is anon-executable on purpose (the landing reads it).
- **Reply style for agents** (`CLAUDE.md`): final replies to Guillermo are at most 3
  short lines, in Spanish.

---

## 11. How to run it

```bash
# 1. Install (Node >= 20, yarn 1.22)
yarn install

# 2. Environment
cp .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_URL       Supabase → Settings → API
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY      server only (invites, owner undo, e2e)
#   NEXT_PUBLIC_SITE_URL           public origin for server-side redirects (prod)

# 3. Dev server
yarn dev            # http://localhost:3000 (Turbopack)

# 4. Checks
yarn lint
yarn build          # type-checks; not while `yarn dev` runs in the same checkout
yarn e2e            # Playwright, with `yarn dev` running; uses the real DB + DEMO accounts
```

- **Database:** there is no local Supabase. Apply new migrations by hand in the
  Supabase SQL Editor of project `branjuyfmqqrbisclasy`, always running the matching
  `supabase/dry-runs/…` file first, and expect `DRYRUN_OK`. To verify isolation, rerun
  `supabase/tests/rls_check.sql` and expect `RLS_OK`.
- **Deploy:** push to `staging`, and Vercel builds and publishes it as production
  (`ticofit.vercel.app`).
  - Env vars live in Vercel → Project → Settings → Environment Variables:
    `NEXT_PUBLIC_*` as plain Config, the service role key as Secret, for Production and
    Preview.
  - `amplify.yml` also exists for AWS Amplify. ⚠️ Unclear whether Amplify is still used.
- **Supabase Auth settings** (dashboard): Site URL and Redirect URLs must include every
  origin (`http://localhost:3000/**`, `https://ticofit.vercel.app/**`). Google OAuth is
  set up in Supabase with the Google Cloud client.
- **First access:** an owner adds staff in Escritorio → Personal. Clients are created in
  Clientes and invited by email, which requires SMTP.
