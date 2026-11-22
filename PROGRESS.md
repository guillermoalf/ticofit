# Internal system — progress

Spec: `design/internal/SISTEMA-INTERNO.md` (its §0b holds Guillermo's 2026-11-21
decisions and overrides the rest). Branch: `feat/internal-system`. **Never merged into
`staging` (production) or `main`.**

## Status

| Phase | Status |
|---|---|
| 0 · Inventory + architecture | ✅ done |
| 1 · Auth, roles, sedes, staff PIN | ⏳ screens checked in the browser; save actions not exercised yet |
| 2 · Clients, expediente, measurements | ⬜ |
| 3 · Memberships & payments | ⬜ |
| 4 · Exercise library & routines | ⬜ |
| 5 · Salones, disciplines, calendar | ⬜ |
| 6 · Reservations & capacity | ⬜ |
| 7 · Employees, time clock, payroll | ⬜ |
| 8 · Final QA | ⬜ |

## Inventory (2026-11-22)

**Database** — project `branjuyfmqqrbisclasy` (confirmed through the MCP and
`.env.local`). Migrations 0001–0021 are in the remote log; `0022_waitlist` is applied
(the table exists) but missing from the log. Data: 1 profile (Guillermo, `admin`),
38 system exercises (= seed 0018), 2 waitlist test rows, 1 consumed pre-authorization,
1 private bucket `evidence`. Everything else is empty. Local backup:
`backups/2026-11-22-pre-internal-system.json` (gitignored). There is no Supabase CLI or
local Postgres on this machine, so the backup is a JSON export, not a `db dump`.

**Auth & roles** — `profiles` (role enum `user_role`: `client`, `coach`, `admin`).
Invite-only through `preauthorized_emails` + the `handle_new_user()` trigger (0010):
a signup with no pending pre-authorization is refused. `authorized` is the suspend
switch. Walk-in clients have a profile with no auth user (`has_account = false`, 0007
dropped the FK to `auth.users`). Helpers: `is_coach()`, `is_admin()`,
`is_own_client()`. Ownership model today: **coach owns client** (`profiles.coach_id`).
Login: `/login` (password, magic link, Google), `/auth/callback`, `/portal` redirects by
role (`ROLE_HOME`), `/portal/crear-contrasena`, `/sin-acceso`.

**Clients** — `/portal/clientes` roster, add-client panel, client detail with tabs.
Intake fields already on `profiles` (0011 + 0016): cédula, address, occupation, blood
type, emergency contact name + phone, sports experience, weekly frequency, session
minutes, goals[4], medical notes, medications, injuries, excluded exercises, birth date,
gender, height.

**Measurements** — `measurements` table (0003 + 0011): weight, SMM kg, fat kg, water
**litres**, chest, waist, hip, arms R/L, thighs R/L, a single calf, neck, InBody score,
visceral fat, segmental lean mass, vitals, `muscle_pct` / `fat_pct` columns (stored
derived values — not to be used). UI: `client-measurements.tsx`. No charts library.

**Routines & exercises** — `exercises` (system library: name, category, YouTube URL;
coach rows), `programs` / `program_items` (templates), `routines` / `routine_items`
(day_label, order, sets, reps, notes), routine builder, client `/portal/rutina`,
`exercise_weight_logs` (client logs sets). Ejercicios page with search.

**Other** — `visits` + `clients_meta` (fee, next payment date, payment status — a
coach-billing model), `evidence_photos`, `waitlist` (+ `/portal/lista-espera`), landing
`#horario` (static data in `src/content/landing.ts`). No sedes, plans, memberships,
receipts, salones, classes, reservations, employees or payroll yet.

**Stack** — Next 15 App Router, React 19, Supabase SSR, Tailwind 4, lucide, sonner,
framer-motion, gsap. No charts, PDF or QR libraries.

## Architecture decisions

**A1 · Who signs in.** Clients sign in as themselves (unchanged). Staff never sign in
individually: each desk computer is signed in as a **desk account** (`profiles.role =
'desk'`), bound to one or more sedes (`desk_sedes`). Jeremy's own login is a desk
account bound to both sedes, which gives him the sede switcher.

**A2 · Staff PIN session.** Staff are rows in `staff` (not auth users). On a desk, a
staff member taps their name and types their 4-digit PIN. `staff_unlock()` (security
definer) checks the bcrypt hash (`pgcrypto`), counts failures (5 wrong → locked 15 min),
and creates a row in `staff_sessions` with a random token (only its SHA-256 is stored).
The token lives in an httpOnly cookie; the server-side Supabase client forwards it as
the `x-staff-token` header, and RLS reads it through `current_staff_id()` (PostgREST
exposes request headers to SQL). The session is bound to the desk account that opened
it, so a stolen token is useless from another login. It expires after a configurable
idle time (default 10 min) or when the person locks the desk.
*Why:* it gives database-level enforcement of each employee's role while keeping one
shared login per computer, as Guillermo asked. *Alternative considered:* minting a
custom JWT per employee — needs the project's JWT secret and fights Supabase's key
rotation.

**A3 · Roles & permissions.** `staff.role` references `staff_roles`; what a role may
do lives in `staff_role_permissions` (role × permission). Code and RLS ask
`staff_can('clients.write')`, never `role = 'admin'`. Seeded roles: `admin`, `coach`.
Payroll is gated by the per-person flag `staff.can_manage_payroll`, as the spec says.
Future roles (owner, pasante with the visible "P", external professional) are new rows,
not a rewrite.

**A4 · Audit.** Every staff write stores the employee from the PIN session
(`created_by_staff`, `updated_by_staff`), filled by triggers from
`current_staff_id()`, so the client code can't forge it.

**A5 · Migrations.** Each phase gets its own migration. Before applying, the SQL is
dry-run against the remote database inside `begin … rollback`. It is applied once the
code that uses it builds and has been checked (§0b.3). Additive only.

## Decisions

*(chosen without asking during the run — what, why, alternative)*

- **D1 · Staff pick their name, then type the PIN** (like a POS), instead of typing a
  PIN alone. Four digits shared by many staff can't be guaranteed unique once hashed,
  and picking a name first makes a wrong PIN fail safely.

## Phase 1 review (2026-11-22)

Checked signed in, at 1440 and 390: every desk page through the menu, the Agregar
persona panel, sede switcher, lock, PIN pad, activity keep-alive, and navigation after
the session was locked from another tab.

- 🔴 fixed · `src/app/escritorio/layout.tsx`: expired PIN + client navigation had no
  lock screen to land on → `/bloqueo`.
- 🟡 fixed · desk inputs: `text-base` is a colour here (`--color-base`), so values
  rendered cream on white. Use `text-[16px] text-ink`, never `text-base`.
- 🟡 fixed · `personal/staff-manager.tsx`, `ajustes/desks-panel.tsx`: SlideOver forms
  had no padding.
- 🔵 fixed · `ajustes/sede-form.tsx`: time inputs clipped and wrapped badly on phones.

**Not exercised** (they write to the production database): create/edit staff, change a
PIN, save sede/settings, create or disable a desk account, the coach role in the UI,
wrong PIN in the UI (SQL covered by dry run 2). Screenshots were reviewed in the
session, not saved under `design/internal/screenshots/`.

**Local environment:** `node_modules` has Next 15.4.6 while package.json and yarn.lock
pin 15.5.29, so local builds and these checks ran on 15.4.6. Needs
`yarn install --frozen-lockfile`.

## Open questions for Guillermo

## Known issues / follow-ups

- **0023 testing, correction (2026-11-22):** the first dry run used a trimmed copy of
  the migration, not the file. It missed a 🔴 in `staff_set_pin`: with no PIN session
  the guard evaluated to NULL and let any signed-in account set any employee's PIN.
  Fixed in the file before it was ever applied. Dry runs must run the whole file.
- **0023 dry run 1 (run by Guillermo in the SQL Editor, rolled back):** found five more
  holes, all closed in the file: payroll holder PIN reset by an admin without payroll,
  disabled desk keeping permissions, payroll holder's flag revoked by that admin, staff
  pulled in from another sede, forgeable `created_by_staff`. From review: default
  `ALL` grants on new tables, and no bounds on the PIN attempt limit. Dry run 2 covers
  them (`supabase/dry-runs/0023_dry_run.sql`).
- Desk accounts can change their own email/password through Supabase Auth, so anyone at
  a signed-in computer could too. Decide before rollout.
- The only payroll holder can't have their PIN reset or flag restored from the app.
  Have a second holder, or recover with SQL.
- `backups/2026-11-22-pre-internal-system.json` was written by hand from a query result
  and references seed 0018 for the exercises: it is not a full dump (§0.4 asks for one).
- `0022_waitlist` and `0023_sedes_staff_pin` are applied (SQL Editor) but not in the
  migration log. A future `supabase db push` would re-run them; both are idempotent.
- For the next migration: revoke EXECUTE from `anon` on 0023's helper and trigger
  functions (security advisor WARN; `setting_int` lets anon read numeric settings).
- Advisor, older than this branch: anon can execute the 0001–0021 definer helpers, two
  functions have a mutable search_path, leaked-password protection is off.
- `/login` still has the old dark theme and says "Pediselo a tu entrenador".
- Legacy coach-ownership model (`profiles.coach_id`, `clients_meta`, `visits`) stays
  in place; the new screens don't use it. Clean up after review.
- `measurements.muscle_pct` / `fat_pct` hold derived values; the new code never writes
  or reads them.

## Migrations created

- `0023_sedes_staff_pin.sql`: applied 2026-11-22 by Guillermo in the SQL Editor after
  dry run 2 passed. Verified afterwards: function bodies match the file, 13 policies,
  grants, seeds, and `x-staff-token` reaching SQL through PostgREST.
