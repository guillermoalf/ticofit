-- Borra SOLO los datos de prueba "DEMO" creados probando las fases 2 y 4.
-- Pegalo completo en el SQL Editor y correlo de una vez.

begin;

-- Fase 4: la plantilla de prueba (sus días y ejercicios se borran en cascada).
delete from public.client_routines
where client_id is null and name = 'DEMO plantilla'
returning id, name;

-- Fase 2 y 4: el cliente de prueba, con su historia clínica, mediciones y
-- rutinas (todo se borra en cascada).
delete from public.clients
where id = '4821a787-ef0a-4d3a-a24f-b7ea8c120bfc'
  and full_name = 'DEMO — Prueba'
  and user_id is null
returning id, full_name;

-- Fase 4: el ejercicio de prueba (va después, porque las rutinas lo usaban).
delete from public.exercises
where source = 'staff' and name = 'DEMO Sentadilla prueba'
returning id, name;

commit;
