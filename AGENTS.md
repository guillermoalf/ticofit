# AGENTS.md — ticofit

How to work in this repo. The business context, brand and scope live in `CLAUDE.md`,
which loads automatically — don't duplicate any of it here. If the two disagree, ask.

## Role

You are a senior full-stack developer on **ticofit**, the custom gym management platform
for ticofit wellness club. The system covers the public landing page, the client portal
and the internal staff tools.

Every task must be production-ready, clean and conflict-free. The budget is fixed, so
favor simple, maintainable solutions over abstractions, and build nothing outside the
agreed scope.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + Supabase + yarn
- AWS Amplify (frontend) + Supabase (database + auth)
- Shipped as a **PWA** — installable to the home screen, not a native app
- Brand values live in `src/config/brand.ts`. Read from `BRAND`, never hardcode them
  in components.
- Landing copy lives in `src/content/landing.ts`. Same rule.

## Golden rules

- NEVER modify more than what the task explicitly asks
- NEVER build outside the Fase 1 scope without asking first
- NEVER leave `console.log` in the code
- NEVER commit with TypeScript or lint errors
- NEVER hardcode secrets, personal emails or brand values
- NEVER add a dependency without saying why
- ALWAYS pull latest main before starting
- ALWAYS run lint and build before finishing
- ALWAYS write UI copy in Costa Rican Spanish; code and comments in English
- ALWAYS write schema changes as versioned migrations under `supabase/migrations/` —
  never ad-hoc SQL that isn't captured in a file
- ALWAYS show the plan (route map, data shape, design tokens) before writing code on any
  non-trivial task, and wait for approval

## Definition of done

A task is not finished until all of these pass:

1. `yarn lint` clean
2. `yarn build` passes (type-checks)
3. **Screenshot reviewed** — run the app, capture the page at desktop (1440px) and mobile
   (390px), and look at it. Code that compiles is not the same as a page that looks right.
4. Contrast verified on every text/background pair touched, AA (4.5:1). Report failures.
5. Self-review of the diff: 🔴 blocker / 🟡 medium / 🔵 low / ⚪ nit, citing `file:line`.
   Auto-fix small unambiguous findings.

"It builds" is not done.

## Workflow — every task

1. `git checkout main && git pull origin main`
2. `git checkout -b feat/task-name`
3. Make only the changes the task requires
4. Run the definition-of-done checklist above
5. `git add -A && git commit -m "feat: description"`
6. `git push origin feat/task-name`
7. When no 🔴/🟡 remain and lint + build are green, merge into main and delete the branch
   yourself, WITHOUT asking. You have standing authorization to self-merge — never request
   permission for it. Only pause on a REAL blocker (merge conflict, failing build you
   can't fix, git/permissions error); explain it and stop. "I need confirmation to merge"
   is NOT a valid reason to stop.

For sensitive tasks (roles, RLS, auth, schema), STOP after presenting the plan and SQL and
wait for approval before applying. The task will say so.

Branches: `feat/short-description` · `fix/short-description` · `chore/short-description`

## Database

- The ticofit Supabase project ref is `branjuyfmqqrbisclasy`. NEVER touch any other
  Supabase project — especially not fit-crm's or sport-lab's.
- Migrations in `supabase/migrations/`, numbered sequentially. New schema = next file.
- Apply migrations only when their dependent app code and routes exist — respect ordering
  (a strict signup trigger must not land before its UI).
- RLS is on for all tables. Respect policies; never bypass them except via service-role
  server actions where justified.

## Commands

```
yarn dev     # localhost:3000
yarn build   # production build, type-checks
yarn lint    # ESLint
```

## Environment variables (`.env.local`, never commit)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # server-side only, never exposed to the browser
NEXT_PUBLIC_SITE_URL
```

## What NOT to do

- Do not refactor outside the task scope
- Do not update dependencies unless the task requires it
- Do not hardcode brand values — use `src/config/brand.ts`
- Do not hardcode landing copy or prices — use `src/content/landing.ts`
- Do not remove existing functionality or the walk-in (no-account) client path
- Do not use `localStorage`/`sessionStorage` — Supabase handles auth state
- Do not expose the service role key client-side
- Do not build out-of-scope modules — see `CLAUDE.md` §3
- Do not label consultorio rooms by specialty — it is a rentable room; the booked slot's
  service type sets its colour
