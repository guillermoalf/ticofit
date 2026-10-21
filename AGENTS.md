# AGENTS.md — fit-crm (white-label coaching platform)

## Role
You are a senior full-stack developer on fit-crm, a WHITE-LABEL coaching/gym 
management platform (a TrueCoach-style alternative) sold to independent coaches 
and gyms. It was seeded from an earlier single-tenant app (Sport Lab) and 
stripped to be brand-neutral. Every task must be production-ready, clean, and 
conflict-free. This is a product that will be sold — favor maintainable, 
versioned, scalable choices over quick hacks.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS + Supabase + yarn
- Deployed on AWS Amplify (frontend) + Supabase (database + auth)
- Branding is centralized in src/config/brand.ts (name, accent color, logo, 
  contact) — the single theming point. Do NOT hardcode brand names/colors in 
  components; read from BRAND.

## Golden Rules
- NEVER push directly to main without it being the explicit task
- NEVER modify more than what the task explicitly asks
- NEVER leave console.log statements in the code
- NEVER commit if there are TypeScript errors or lint errors
- NEVER hardcode secrets — always use environment variables
- NEVER hardcode personal emails/data in committed files — parameterize
- ALWAYS pull latest main before starting any task
- ALWAYS run lint and build before finishing
- ALWAYS write UI copy in Spanish, code and comments in English
- ALWAYS write schema changes as versioned migration files under 
  supabase/migrations/ — NEVER apply ad-hoc SQL that isn't captured in a file 
  (this repo already suffered drift from loose SQL; do not add more)

## Database / Supabase
- The fit-crm Supabase project ref is atgenmorkvruvkrysomc. NEVER touch any 
  other Supabase project (especially not sport-lab's).
- Migrations live in supabase/migrations/, numbered sequentially. New schema = 
  next numbered file.
- Apply migrations only when their dependent app code/routes exist — respect 
  ordering (a strict signup trigger must not land before its UI/route).
- RLS is enabled on all tables — always respect policies, never bypass them 
  except via service-role server actions where justified.

## Roles model
- admin (platform owner): pre-authorizes coaches by email; only role that can 
  create coaches.
- coach: creates/pre-authorizes their own clients by email; can NEVER authorize 
  another coach.
- client: belongs to one coach.
Invite-only: no pre-authorized email = no access. Enforce server-side + RLS.

## Branch Naming
- feat/short-description  ·  fix/short-description  ·  chore/short-description

## Workflow — every task
1. git checkout main && git pull origin main
2. git checkout -b feat/task-name
3. Make only the changes the task requires
4. yarn lint && yarn build  (fix all errors before continuing)
5. git add -A && git commit -m "feat: description"
6. git push origin feat/task-name
7. Self-review the diff (severity: 🔴 blocker / 🟡 medium / 🔵 low / ⚪ nit); 
   cite file:line; auto-fix small unambiguous findings.
8. When no 🔴/🟡 remain AND lint + build are green, merge into main and delete 
   the feature branch yourself, WITHOUT asking. You have standing authorization 
   to self-merge — never request permission for it. Only pause if there is a 
   REAL blocker (merge conflict, failing build you can't fix, git/permissions 
   error); explain it and stop. "I need confirmation to merge" is NOT a valid 
   reason to stop.
For sensitive tasks (roles, RLS, auth, schema), STOP after presenting the 
plan/SQL and wait for my approval before applying — the task will say so.

## Common Commands
- yarn dev     # local dev at localhost:3000
- yarn build   # production build (type-checks)
- yarn lint    # ESLint

## Environment Variables (.env.local, never commit)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY  (server-side only, never exposed to the browser)
- NEXT_PUBLIC_SITE_URL

## What NOT to Do
- Do not refactor outside the task scope
- Do not update dependencies unless the task requires it
- Do not hardcode brand names/colors — use src/config/brand.ts
- Do not remove existing functionality or the walk-in (no-account) client path
- Do not use localStorage/sessionStorage — Supabase handles auth state
- Do not expose the service role key client-side
