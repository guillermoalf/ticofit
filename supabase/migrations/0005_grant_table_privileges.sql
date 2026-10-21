-- grant DML privileges on all portal tables to authenticated and
-- service_role.  Raw SQL migrations in Supabase do not auto-grant the way
-- dashboard tables do, so every table created via SQL needs explicit grants.
-- Idempotent: GRANT is safe to re-run.
-- Depends on 0003_portal_foundation.sql (tables must exist first).

grant select, insert, update, delete on public.exercises       to authenticated;
grant select, insert, update, delete on public.programs        to authenticated;
grant select, insert, update, delete on public.program_items   to authenticated;
grant select, insert, update, delete on public.routines        to authenticated;
grant select, insert, update, delete on public.routine_items   to authenticated;
grant select, insert, update, delete on public.visits          to authenticated;
grant select, insert, update, delete on public.measurements    to authenticated;
grant select, insert, update, delete on public.evidence_photos to authenticated;
grant select, insert, update, delete on public.clients_meta    to authenticated;

grant all on public.exercises        to service_role;
grant all on public.programs         to service_role;
grant all on public.program_items    to service_role;
grant all on public.routines         to service_role;
grant all on public.routine_items    to service_role;
grant all on public.visits           to service_role;
grant all on public.measurements     to service_role;
grant all on public.evidence_photos  to service_role;
grant all on public.clients_meta     to service_role;
