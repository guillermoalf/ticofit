-- 0031: salones and disciplines are the owners' call; a person can show a title
-- other than their role; parque bellavista gets its real rooms.
-- Run in the Supabase SQL editor after supabase/dry-runs/0031_dry_run.sql passes.
-- Idempotent. Depends on 0023–0030.
--
--   * salons.manage (owners only): create, rename, deactivate and delete salones and
--     disciplines, and pick a discipline's default salón. Until now settings.manage
--     (admins too) could do it.
--   * structure_delete(kind, id): deletes a salón or a discipline with every class
--     and weekly-schedule entry that used it (their reservations go with them).
--   * staff.display_title: what the desk shows instead of the role name ("Administrador"
--     for an owner who prefers it). Permissions still come from the role only.
--   * parque bellavista is open gym plus a consultorio: Salón 1 → Open gym,
--     Salón 2 → Consultorio, Salones 3–5 removed (they had no classes).

-- 1. Permission -------------------------------------------------------------------------------
insert into public.staff_permissions (id, label)
values ('salons.manage', 'Crear, renombrar y borrar salones y disciplinas')
on conflict (id) do nothing;
insert into public.staff_role_permissions (role_id, permission_id) values ('owner', 'salons.manage')
on conflict do nothing;

-- 2. Policies: settings.manage → salons.manage --------------------------------------------------
drop policy if exists "settings staff add salones" on public.salones;
create policy "settings staff add salones" on public.salones for insert to authenticated
  with check (public.staff_can_sede('salons.manage', sede_id));
drop policy if exists "settings staff edit salones" on public.salones;
create policy "settings staff edit salones" on public.salones for update to authenticated
  using (public.staff_can_sede('salons.manage', sede_id))
  with check (public.staff_can_sede('salons.manage', sede_id));

drop policy if exists "settings staff add disciplines" on public.disciplines;
create policy "settings staff add disciplines" on public.disciplines for insert to authenticated
  with check (coalesce(public.staff_can('salons.manage'), false));
drop policy if exists "settings staff edit disciplines" on public.disciplines;
create policy "settings staff edit disciplines" on public.disciplines for update to authenticated
  using (coalesce(public.staff_can('salons.manage'), false))
  with check (coalesce(public.staff_can('salons.manage'), false));

drop policy if exists "settings staff set discipline salons" on public.discipline_salons;
create policy "settings staff set discipline salons" on public.discipline_salons for insert to authenticated
  with check (public.staff_can_sede('salons.manage', sede_id));
drop policy if exists "settings staff change discipline salons" on public.discipline_salons;
create policy "settings staff change discipline salons" on public.discipline_salons for update to authenticated
  using (public.staff_can_sede('salons.manage', sede_id))
  with check (public.staff_can_sede('salons.manage', sede_id));
drop policy if exists "settings staff unset discipline salons" on public.discipline_salons;
create policy "settings staff unset discipline salons" on public.discipline_salons for delete to authenticated
  using (public.staff_can_sede('salons.manage', sede_id));

-- 3. Delete a salón or a discipline -----------------------------------------------------------
create or replace function public.structure_delete(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sede text;
begin
  if not public.staff_can('salons.manage') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  if p_kind = 'salon' then
    select sede_id into v_sede from public.salones where id = p_id;
    if v_sede is null or v_sede not in (select public.staff_sede_ids()) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.classes where salon_id = p_id;
    delete from public.class_templates where salon_id = p_id;
    delete from public.salones where id = p_id;

  elsif p_kind = 'discipline' then
    if not exists (select 1 from public.disciplines where id = p_id) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    -- Disciplines are shared by both sedes: only someone in every sede that used it.
    if exists (
      select 1 from public.classes where discipline_id = p_id and sede_id not in (select public.staff_sede_ids())
      union all
      select 1 from public.class_templates where discipline_id = p_id and sede_id not in (select public.staff_sede_ids())
    ) then
      raise exception 'NOT_ALLOWED' using errcode = '42501';
    end if;
    delete from public.classes where discipline_id = p_id;
    delete from public.class_templates where discipline_id = p_id;
    delete from public.disciplines where id = p_id;

  else
    raise exception 'UNKNOWN_KIND' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.structure_delete(text, uuid) from public, anon;
grant execute on function public.structure_delete(text, uuid) to authenticated;

-- 4. Display title ------------------------------------------------------------------------------
alter table public.staff add column if not exists display_title text
  check (display_title is null or char_length(btrim(display_title)) between 2 and 40);
comment on column public.staff.display_title is 'Shown instead of the role name. Never grants anything.';
grant update (display_title) on public.staff to authenticated;

create or replace function public.current_staff()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'id', st.id,
    'full_name', st.full_name,
    'role_id', st.role_id,
    'role_label', coalesce(st.display_title, r.label),
    'can_manage_payroll', st.can_manage_payroll,
    'permissions', coalesce((
      select json_agg(rp.permission_id order by rp.permission_id)
      from public.staff_role_permissions rp where rp.role_id = st.role_id), '[]'::json),
    'sede_ids', coalesce((select json_agg(x order by x) from public.staff_sede_ids() x), '[]'::json)
  )
  from public.staff st
  join public.staff_roles r on r.id = st.role_id
  where st.id = public.current_staff_id();
$$;

create or replace function public.desk_staff_list()
returns table (id uuid, full_name text, role_label text, has_pin boolean)
language sql
security definer
set search_path = public
stable
as $$
  select st.id, st.full_name, coalesce(st.display_title, r.label),
         exists (select 1 from public.staff_pins p where p.staff_id = st.id)
  from public.staff st
  join public.staff_roles r on r.id = st.role_id
  where st.active
    and exists (select 1 from public.staff_sedes ss
                where ss.staff_id = st.id and ss.sede_id in (select public.desk_sede_ids()))
  order by st.full_name;
$$;

update public.staff set display_title = 'Administrador'
where id = '423357a5-633c-40f9-86a5-47c433075e11' and display_title is null;

-- 5. parque bellavista: open gym + consultorio ----------------------------------------------------
update public.salones set name = 'Open gym'
where sede_id = 'bellavista' and name = 'Salón 1';
update public.salones set name = 'Consultorio'
where sede_id = 'bellavista' and name = 'Salón 2';
delete from public.salones s
where s.sede_id = 'bellavista' and s.name in ('Salón 3', 'Salón 4', 'Salón 5')
  and not exists (select 1 from public.classes c where c.salon_id = s.id)
  and not exists (select 1 from public.class_templates t where t.salon_id = s.id);
