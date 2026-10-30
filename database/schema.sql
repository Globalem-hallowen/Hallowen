-- =====================================================================
--  Jurado Halloween 2026 · Globalem
--  Esquema PostgreSQL para Supabase
--
--  Cómo ejecutarlo: Supabase → SQL Editor → New query → pega este archivo → Run.
--  Se puede ejecutar varias veces: no duplica tablas ni datos.
--
--  La página (index.html) usa solo las funciones hw_* del final. Las tablas
--  tienen RLS sin políticas: la clave pública no puede leerlas directamente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Jurados y administración (cada uno entra con su PIN de 4 dígitos)
-- ---------------------------------------------------------------------
create table if not exists public.usuarios (
    id          smallint generated always as identity primary key,
    nombre      text        not null unique,
    rol         text        not null check (rol in ('jurado', 'admin')),
    pin_hash    text,                                   -- "salt$sha256"; nunca el PIN en claro
    creado_en   timestamptz not null default now()
);

create table if not exists public.sesiones (
    token       text        primary key,
    usuario_id  smallint    not null references public.usuarios (id) on delete cascade,
    creada_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Grupos (cada grupo tiene una isla y una temática)
-- ---------------------------------------------------------------------
create table if not exists public.grupos (
    id          smallint primary key check (id between 1 and 4),
    isla        text not null unique,
    tematica    text not null,
    detalle     text
);

-- ---------------------------------------------------------------------
-- Participantes del concurso de disfraces
-- ---------------------------------------------------------------------
create table if not exists public.participantes (
    id          integer generated always as identity primary key,
    nombre      text        not null,
    grupo_id    smallint    not null references public.grupos (id),
    orden       integer     not null default 0,
    activo      boolean     not null default true,      -- false = quitado del concurso (conserva sus notas)
    creado_en   timestamptz not null default now(),
    unique (nombre, grupo_id)
);

create index if not exists ix_participantes_grupo on public.participantes (grupo_id, orden);

-- ---------------------------------------------------------------------
-- Calificaciones: una fila por jurado y por isla o participante.
-- Criterios (1 a 10):
--   Isla:    c1 Coherencia · c2 Creatividad · c3 Detalle y elaboración · c4 Ambientación
--   Disfraz: c1 Coherencia · c2 Creatividad · c3 Elaboración y detalle · c4 Caracterización
-- c2 (Creatividad y originalidad) es el criterio de desempate.
-- ---------------------------------------------------------------------
create table if not exists public.calificaciones (
    id              bigint generated always as identity primary key,
    jurado_id       smallint    not null references public.usuarios (id),
    categoria       text        not null check (categoria in ('isla', 'disfraz')),
    grupo_id        smallint    references public.grupos (id),          -- categoria = 'isla'
    participante_id integer     references public.participantes (id),   -- categoria = 'disfraz'
    c1              smallint    check (c1 between 1 and 10),
    c2              smallint    check (c2 between 1 and 10),
    c3              smallint    check (c3 between 1 and 10),
    c4              smallint    check (c4 between 1 and 10),
    excluido        boolean     not null default false,                -- "No se disfrazó / no corresponde"
    actualizado_en  timestamptz not null default now(),
    constraint ck_calificacion_objetivo check (
        (categoria = 'isla'    and grupo_id is not null and participante_id is null and not excluido) or
        (categoria = 'disfraz' and participante_id is not null and grupo_id is null)
    )
);

-- Un jurado califica cada isla y cada participante una sola vez (se actualiza la misma fila).
create unique index if not exists ux_calif_isla
    on public.calificaciones (jurado_id, grupo_id) where categoria = 'isla';
create unique index if not exists ux_calif_disfraz
    on public.calificaciones (jurado_id, participante_id) where categoria = 'disfraz';

-- ---------------------------------------------------------------------
-- Estado del concurso (una sola fila)
-- version sube con cada cambio; la app la usa para refrescar en tiempo real.
-- ---------------------------------------------------------------------
create table if not exists public.estado_concurso (
    id                    smallint    primary key default 1 check (id = 1),
    votacion_cerrada      boolean     not null default false,
    resultados_revelados  boolean     not null default false,
    resultados            jsonb,                 -- top 3 publicado al presionar "Revelar resultados"
    version               bigint      not null default 1,
    actualizado_en        timestamptz not null default now()
);
-- true cuando la pantalla de premiación llegó al final: en cualquier dispositivo se muestran directo los
-- ganadores. Vuelve a false al ocultar o volver a revelar resultados.
alter table public.estado_concurso add column if not exists premiacion_terminada boolean not null default false;

-- Con la votación cerrada, la base de datos rechaza cualquier cambio de notas.
create or replace function public.bloquear_si_votacion_cerrada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if (select votacion_cerrada from public.estado_concurso where id = 1) then
        raise exception 'La votación está cerrada.';
    end if;
    new.actualizado_en := now();
    return new;
end;
$$;

drop trigger if exists tg_bloqueo_votacion_cerrada on public.calificaciones;
create trigger tg_bloqueo_votacion_cerrada
    before insert or update on public.calificaciones
    for each row execute function public.bloquear_si_votacion_cerrada();

-- ---------------------------------------------------------------------
-- Vistas de resultados: suma de los 3 jurados (máx. 120), desempate por Creatividad.
-- ---------------------------------------------------------------------
create or replace view public.v_resultados_isla
with (security_invoker = true) as
select
    g.id                                          as grupo_id,
    g.isla,
    g.tematica,
    coalesce(sum(c.c1 + c.c2 + c.c3 + c.c4), 0)   as total,
    coalesce(sum(c.c2), 0)                        as creatividad,
    count(c.id) filter (where c.c1 is not null and c.c2 is not null
                          and c.c3 is not null and c.c4 is not null) as jurados_completos,
    rank() over (order by coalesce(sum(c.c1 + c.c2 + c.c3 + c.c4), 0) desc,
                          coalesce(sum(c.c2), 0) desc)              as puesto
from public.grupos g
left join public.calificaciones c on c.categoria = 'isla' and c.grupo_id = g.id
group by g.id;

create or replace view public.v_resultados_disfraz
with (security_invoker = true) as
with agregado as (
    select
        p.id                                                                       as participante_id,
        p.nombre,
        p.grupo_id,
        coalesce(sum(c.c1 + c.c2 + c.c3 + c.c4) filter (where not c.excluido), 0)  as total,
        coalesce(sum(c.c2) filter (where not c.excluido), 0)                       as creatividad,
        coalesce(bool_or(c.excluido), false)                                       as excluido,
        count(c.id) filter (where c.excluido or (c.c1 is not null and c.c2 is not null
                              and c.c3 is not null and c.c4 is not null))          as jurados_completos
    from public.participantes p
    left join public.calificaciones c on c.categoria = 'disfraz' and c.participante_id = p.id
    where p.activo
    group by p.id
)
select
    a.*,
    case when a.excluido then null
         else rank() over (partition by a.excluido order by a.total desc, a.creatividad desc)
    end as puesto
from agregado a;

-- Alertas: islas o personas a las que les falta la nota de algún jurado.
create or replace view public.v_alertas_faltantes
with (security_invoker = true) as
select 'isla'::text as categoria, g.isla as nombre, u.nombre as jurado_faltante
from public.grupos g
cross join public.usuarios u
left join public.calificaciones c
       on c.categoria = 'isla' and c.grupo_id = g.id and c.jurado_id = u.id
      and c.c1 is not null and c.c2 is not null and c.c3 is not null and c.c4 is not null
where u.rol = 'jurado' and c.id is null
union all
select 'disfraz', p.nombre, u.nombre
from public.participantes p
cross join public.usuarios u
left join public.calificaciones c
       on c.categoria = 'disfraz' and c.participante_id = p.id and c.jurado_id = u.id
      and (c.excluido or (c.c1 is not null and c.c2 is not null and c.c3 is not null and c.c4 is not null))
where u.rol = 'jurado' and p.activo and c.id is null
  and not exists (select 1 from public.calificaciones x
                  where x.categoria = 'disfraz' and x.participante_id = p.id and x.excluido);

-- ---------------------------------------------------------------------
-- Seguridad: RLS sin políticas. La API pública de Supabase (claves
-- anon/authenticated) no puede leer ni escribir tablas; solo ejecutar
-- las funciones hw_*, que validan PIN y sesión.
-- ---------------------------------------------------------------------
alter table public.usuarios        enable row level security;
alter table public.sesiones        enable row level security;
alter table public.grupos          enable row level security;
alter table public.participantes   enable row level security;
alter table public.calificaciones  enable row level security;
alter table public.estado_concurso enable row level security;

revoke all on public.v_resultados_isla, public.v_resultados_disfraz, public.v_alertas_faltantes
    from anon, authenticated;

-- =====================================================================
--  Datos iniciales
-- =====================================================================
insert into public.estado_concurso (id) values (1) on conflict (id) do nothing;

-- Cambio de nombre del tercer jurado: "Anonimo" → "Invitado especial" → "Juliana". Conserva su id, sus
-- notas y sus sesiones. El hash del PIN incluye el nombre, así que se borra y más abajo recibe el PIN inicial (2593).
do $$
declare
    viejo text;
begin
    foreach viejo in array array['Anonimo', 'Invitado especial'] loop
        if exists (select 1 from public.usuarios where nombre = viejo)
           and not exists (select 1 from public.usuarios where nombre = 'Juliana') then
            if to_regclass('public.intentos_login') is not null then
                delete from public.intentos_login where nombre = viejo;
            end if;
            update public.usuarios set nombre = 'Juliana', pin_hash = null where nombre = viejo;
        end if;
    end loop;
end $$;

-- Los PIN iniciales se asignan más abajo, solo a quien aún no tenga PIN.
insert into public.usuarios (nombre, rol) values
    ('Jorge',   'jurado'),
    ('Juliana', 'jurado'),
    ('Tifanny', 'jurado'),
    ('admin',   'admin')
on conflict (nombre) do nothing;

insert into public.grupos (id, isla, tematica, detalle) values
    (1, 'Isla 1', 'Alicia en el País de las Maravillas', null),
    (2, 'Isla 2', 'Tim Burton', 'El extraño mundo de Jack y El cadáver de la novia'),
    (3, 'Isla 3', 'Alicia en el País de las Maravillas', null),
    (4, 'Isla 4', 'Piratas del Caribe', null)
on conflict (id) do nothing;

insert into public.participantes (nombre, grupo_id, orden) values
    ('Santiago Masmela', 1, 1), ('Maria Margarita Sierra', 1, 2), ('Jefry Cardenas', 1, 3),
    ('Sebastian Ortega', 1, 4), ('Yojan Ortega', 1, 5), ('Angie Garcia', 1, 6),
    ('Geiner Riascos', 1, 7), ('Fredys Caro', 1, 8), ('Amin Marin', 1, 9),
    ('Jhonatan Gomez', 1, 10), ('Edson Gomez', 1, 11), ('Diana Sanchez', 1, 12),
    ('Sandra Sanchez', 1, 13),

    ('Carlos Chisnes', 2, 1), ('Natalia Bello', 2, 2), ('Andrés Buitrago', 2, 3),
    ('Miguel Norato', 2, 4), ('Andres Fuentes', 2, 5), ('David Alferez', 2, 6),
    ('Hugo Calderon', 2, 7), ('Cristian Culma', 2, 8), ('Gabriela Muñoz', 2, 9),
    ('Wilson Muñoz', 2, 10), ('Andrea Díaz', 2, 11), ('Paula Quitian', 2, 12),
    ('Paola Archila', 2, 13),

    ('Karen Farfán', 3, 1), ('Camila Sanchez', 3, 2), ('Laura Páez', 3, 3),
    ('Cesar Lizarazo', 3, 4), ('Jeimmy Santander', 3, 5), ('Royman Arevalo', 3, 6),
    ('Juan Hamon', 3, 7), ('Angy Murcia', 3, 8), ('Ruben García', 3, 9),
    ('Jhon Avellaneda', 3, 10), ('Carol Lopez', 3, 11), ('Johan Amado', 3, 12),
    ('Juan Rojas', 3, 13),

    ('María Londoño', 4, 1), ('Andrea Quintero', 4, 2), ('Erika Milaguy', 4, 3),
    ('Ingrith Ortiz', 4, 4), ('Laura Clavijo', 4, 5), ('Camilo Gutiérrez', 4, 6),
    ('María Cardozo', 4, 7), ('Jenny Vergel', 4, 8), ('Edison Bohórquez', 4, 9),
    ('Felipe Ramírez', 4, 10), ('Julián Vásquez', 4, 11), ('Juan Camilo Romero', 4, 12)
on conflict (nombre, grupo_id) do nothing;

-- =====================================================================
--  API para la página (funciones que llama index.html por la API de Supabase)
--
--  Errores: RAISE con SQLSTATE 'PTxxx' hace que Supabase responda HTTP xxx.
-- =====================================================================

-- Intentos fallidos de PIN: 5 seguidos bloquean a ese usuario 5 minutos.
create table if not exists public.intentos_login (
    nombre           text        primary key references public.usuarios (nombre) on delete cascade,
    fallos           integer     not null default 0,
    bloqueado_hasta  timestamptz
);
alter table public.intentos_login enable row level security;

-- ---------- Funciones internas ----------
create or replace function public._hw_pin_hash(p_salt text, p_who text, p_pin text)
returns text
language sql immutable
set search_path = public, pg_catalog
as $$
    select p_salt || '$' || encode(sha256(convert_to(p_salt || '|' || p_who || '|' || p_pin, 'UTF8')), 'hex')
$$;

create or replace function public._hw_new_salt()
returns text
language sql volatile
set search_path = public, pg_catalog
as $$
    select substr(md5(random()::text || clock_timestamp()::text), 1, 16)
$$;

create or replace function public._hw_user(p_token text, p_role text default null)
returns public.usuarios
language plpgsql stable security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios;
begin
    select us.* into u
    from public.sesiones s join public.usuarios us on us.id = s.usuario_id
    where s.token = p_token and s.creada_en > now() - interval '7 days';
    if not found or (p_role is not null and u.rol <> p_role) then
        raise exception 'Sesión no válida. Vuelve a entrar con tu PIN.' using errcode = 'PT401';
    end if;
    return u;
end;
$$;

create or replace function public._hw_bump()
returns bigint
language sql volatile security definer
set search_path = public, pg_catalog
as $$
    update public.estado_concurso set version = version + 1, actualizado_en = now() where id = 1 returning version
$$;

create or replace function public._hw_key(c public.calificaciones)
returns text
language sql immutable
set search_path = public, pg_catalog
as $$
    select case when c.categoria = 'isla' then 'isla-' || c.grupo_id else 'p-' || c.participante_id end
$$;

create or replace function public._hw_entry(c public.calificaciones)
returns jsonb
language sql immutable
set search_path = public, pg_catalog
as $$
    select jsonb_build_object(
        'c',    jsonb_build_array(c.c1, c.c2, c.c3, c.c4),
        'excl', c.excluido,
        'kind', c.categoria,
        'at',   (extract(epoch from c.actualizado_en) * 1000)::bigint)
$$;

create or replace function public._hw_state(p_all boolean)
returns jsonb
language sql stable security definer
set search_path = public, pg_catalog
as $$
    select jsonb_build_object(
        'closed',   votacion_cerrada,
        'revealed', resultados_revelados,
        'results',  case when p_all or resultados_revelados then resultados end,
        'awardsDone', resultados_revelados and premiacion_terminada)
    from public.estado_concurso where id = 1
$$;

-- ---------- Público ----------
-- Participantes y estado. Con p_v igual a la versión actual responde {unchanged: true}.
create or replace function public.hw_public(p_v bigint default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_catalog
as $$
declare
    v bigint := (select version from public.estado_concurso where id = 1);
begin
    if p_v = v then
        return jsonb_build_object('v', v, 'unchanged', true);
    end if;
    return jsonb_build_object(
        'v', v,
        'people', coalesce((
            select jsonb_agg(jsonb_build_object('id', id::text, 'name', nombre, 'group', grupo_id, 'order', orden)
                             order by grupo_id, orden, nombre)
            from public.participantes where activo), '[]'::jsonb),
        'state', public._hw_state(false));
end;
$$;

-- Detalle de resultados: total por criterio (suma de los 3 jurados, sin notas individuales) de cada isla y
-- participante. Solo responde cuando la premiación terminó; antes devuelve {locked: true}.
-- Misma lógica que js/results.js: total = suma de criterios; empate por Creatividad (c2); un "excluido" de
-- cualquier jurado saca al participante del premio.
create or replace function public.hw_results_detail()
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_catalog
as $$
begin
    if not exists (select 1 from public.estado_concurso
                   where id = 1 and resultados_revelados and premiacion_terminada) then
        return jsonb_build_object('locked', true);
    end if;
    return jsonb_build_object(
        'islas', coalesce((
            select jsonb_agg(jsonb_build_object('group', x.id, 'c', jsonb_build_array(x.s1, x.s2, x.s3, x.s4),
                                                'total', x.total, 'place', x.puesto)
                             order by x.puesto, x.id)
            from (
                select g.id, s.s1, s.s2, s.s3, s.s4, s.s1 + s.s2 + s.s3 + s.s4 as total,
                       rank() over (order by s.s1 + s.s2 + s.s3 + s.s4 desc, s.s2 desc) as puesto
                from public.grupos g
                cross join lateral (
                    select coalesce(sum(c.c1), 0)::int s1, coalesce(sum(c.c2), 0)::int s2,
                           coalesce(sum(c.c3), 0)::int s3, coalesce(sum(c.c4), 0)::int s4
                    from public.calificaciones c where c.categoria = 'isla' and c.grupo_id = g.id) s
            ) x), '[]'::jsonb),
        'disfraces', coalesce((
            select jsonb_agg(jsonb_build_object('id', x.id::text, 'name', x.nombre, 'group', x.grupo_id,
                                                'c', jsonb_build_array(x.s1, x.s2, x.s3, x.s4), 'total', x.total,
                                                'excl', x.excluido, 'place', x.puesto)
                             order by x.excluido, x.puesto, x.nombre)
            from (
                select a.*, a.s1 + a.s2 + a.s3 + a.s4 as total,
                       case when a.excluido then null
                            else rank() over (partition by a.excluido
                                              order by a.s1 + a.s2 + a.s3 + a.s4 desc, a.s2 desc) end as puesto
                from (
                    select p.id, p.nombre, p.grupo_id,
                           coalesce(sum(c.c1) filter (where not c.excluido), 0)::int s1,
                           coalesce(sum(c.c2) filter (where not c.excluido), 0)::int s2,
                           coalesce(sum(c.c3) filter (where not c.excluido), 0)::int s3,
                           coalesce(sum(c.c4) filter (where not c.excluido), 0)::int s4,
                           coalesce(bool_or(c.excluido), false) as excluido
                    from public.participantes p
                    left join public.calificaciones c on c.categoria = 'disfraz' and c.participante_id = p.id
                    where p.activo
                    group by p.id
                ) a
            ) x), '[]'::jsonb));
end;
$$;

-- Devuelve {token, role, judge} o {error} (no lanza error para que el intento fallido quede registrado).
create or replace function public.hw_login(p_who text, p_pin text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
    u   public.usuarios;
    il  public.intentos_login;
    tok text;
begin
    select * into u from public.usuarios where nombre = p_who;
    if not found then
        raise exception 'Usuario desconocido' using errcode = 'PT400';
    end if;

    select * into il from public.intentos_login where nombre = p_who;
    if il.bloqueado_hasta is not null and il.bloqueado_hasta > now() then
        return jsonb_build_object('error', format('Demasiados intentos. Espera %s minutos.',
            ceil(extract(epoch from il.bloqueado_hasta - now()) / 60)::int));
    end if;

    if u.pin_hash is null or coalesce(p_pin, '') !~ '^[0-9]{4}$'
       or u.pin_hash is distinct from public._hw_pin_hash(split_part(u.pin_hash, '$', 1), p_who, p_pin) then
        insert into public.intentos_login (nombre, fallos) values (p_who, 1)
        on conflict (nombre) do update set
            fallos = case when intentos_login.fallos + 1 >= 5 then 0 else intentos_login.fallos + 1 end,
            bloqueado_hasta = case when intentos_login.fallos + 1 >= 5 then now() + interval '5 minutes'
                                   else intentos_login.bloqueado_hasta end;
        return jsonb_build_object('error', 'Ese PIN no abre este ataúd. Intenta de nuevo.');
    end if;

    delete from public.intentos_login where nombre = p_who;
    delete from public.sesiones where creada_en < now() - interval '7 days';
    tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    insert into public.sesiones (token, usuario_id) values (tok, u.id);
    return jsonb_build_object(
        'token', tok,
        'role',  case when u.rol = 'admin' then 'admin' else 'judge' end,
        'judge', case when u.rol = 'admin' then null else u.nombre end);
end;
$$;

create or replace function public.hw_session(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios := public._hw_user(p_token);
begin
    return jsonb_build_object(
        'role',  case when u.rol = 'admin' then 'admin' else 'judge' end,
        'judge', case when u.rol = 'admin' then null else u.nombre end);
end;
$$;

create or replace function public.hw_logout(p_token text)
returns jsonb
language sql volatile security definer
set search_path = public, pg_catalog
as $$
    delete from public.sesiones where token = p_token;
    select jsonb_build_object('ok', true);
$$;

-- ---------- Jurado ----------
create or replace function public.hw_mine(p_token text, p_v bigint default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios := public._hw_user(p_token, 'jurado');
    v bigint := (select version from public.estado_concurso where id = 1);
begin
    if p_v = v then
        return jsonb_build_object('v', v, 'unchanged', true);
    end if;
    return jsonb_build_object('v', v, 'scores', coalesce((
        select jsonb_object_agg(public._hw_key(c), public._hw_entry(c))
        from public.calificaciones c where c.jurado_id = u.id), '{}'::jsonb));
end;
$$;

-- p_key: 'isla-1'..'isla-4' o 'p-<id participante>'. p_c: arreglo JSON de 4 notas (1-10 o null).
create or replace function public.hw_save_score(p_token text, p_key text, p_c jsonb, p_excl boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
    u    public.usuarios := public._hw_user(p_token, 'jurado');
    n    smallint[] := array[null, null, null, null]::smallint[];
    e    jsonb;
    r    public.calificaciones;
    pid  integer;
begin
    if (select votacion_cerrada from public.estado_concurso where id = 1) then
        raise exception 'La votación está cerrada.' using errcode = 'PT409';
    end if;
    if jsonb_typeof(p_c) is distinct from 'array' or jsonb_array_length(p_c) <> 4 then
        raise exception 'Calificación inválida: deben ser 4 criterios.' using errcode = 'PT400';
    end if;
    for i in 0..3 loop
        e := p_c -> i;
        if jsonb_typeof(e) = 'null' then
            continue;
        end if;
        if jsonb_typeof(e) <> 'number' or (e #>> '{}')::numeric not in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10) then
            raise exception 'Calificación inválida: cada criterio va de 1 a 10.' using errcode = 'PT400';
        end if;
        n[i + 1] := ((e #>> '{}')::numeric)::smallint;
    end loop;

    if p_key ~ '^isla-[1-4]$' then
        insert into public.calificaciones (jurado_id, categoria, grupo_id, c1, c2, c3, c4, excluido)
        values (u.id, 'isla', substr(p_key, 6)::smallint, n[1], n[2], n[3], n[4], false)
        on conflict (jurado_id, grupo_id) where categoria = 'isla'
        do update set c1 = excluded.c1, c2 = excluded.c2, c3 = excluded.c3, c4 = excluded.c4
        returning * into r;
    elsif p_key ~ '^p-[0-9]{1,9}$' then
        pid := substr(p_key, 3)::integer;
        if not exists (select 1 from public.participantes where id = pid and activo) then
            raise exception 'Esa persona no existe.' using errcode = 'PT404';
        end if;
        insert into public.calificaciones (jurado_id, categoria, participante_id, c1, c2, c3, c4, excluido)
        values (u.id, 'disfraz', pid, n[1], n[2], n[3], n[4], coalesce(p_excl, false))
        on conflict (jurado_id, participante_id) where categoria = 'disfraz'
        do update set c1 = excluded.c1, c2 = excluded.c2, c3 = excluded.c3, c4 = excluded.c4,
                      excluido = excluded.excluido
        returning * into r;
    else
        raise exception 'Esa isla o persona no existe.' using errcode = 'PT404';
    end if;

    perform public._hw_bump();
    return public._hw_entry(r);
end;
$$;

-- ---------- Administración ----------
create or replace function public.hw_admin_all(p_token text, p_v bigint default 0)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios := public._hw_user(p_token, 'admin');
    v bigint := (select version from public.estado_concurso where id = 1);
begin
    if p_v = v then
        return jsonb_build_object('v', v, 'unchanged', true);
    end if;
    return jsonb_build_object(
        'v', v,
        'scores', coalesce((
            select jsonb_object_agg(j.nombre, coalesce((
                select jsonb_object_agg(public._hw_key(c), public._hw_entry(c))
                from public.calificaciones c where c.jurado_id = j.id), '{}'::jsonb))
            from public.usuarios j where j.rol = 'jurado'), '{}'::jsonb),
        'state', public._hw_state(true));
end;
$$;

-- p_patch: {closed?: bool, revealed?: bool, results?: json, awardsDone?: bool}
-- Publicar resultados nuevos, ocultarlos o reabrir la votación reinicia la premiación (awardsDone = false).
create or replace function public.hw_admin_state(p_token text, p_patch jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios := public._hw_user(p_token, 'admin');
begin
    -- Los resultados solo se revelan con la votación cerrada.
    if coalesce((p_patch ->> 'revealed')::boolean, false)
       and not coalesce((p_patch ->> 'closed')::boolean,
                        (select votacion_cerrada from public.estado_concurso where id = 1)) then
        raise exception 'Primero cierra la votación para poder revelar los resultados.' using errcode = 'PT409';
    end if;
    -- Reabrir la votación reinicia los resultados: se ocultan, se borra el top 3 y la premiación queda sin terminar.
    update public.estado_concurso set
        votacion_cerrada     = coalesce((p_patch ->> 'closed')::boolean, votacion_cerrada),
        resultados_revelados = case when (p_patch ->> 'closed')::boolean is false then false
                                    else coalesce((p_patch ->> 'revealed')::boolean, resultados_revelados) end,
        resultados           = case when (p_patch ->> 'closed')::boolean is false then null
                                    when p_patch ? 'results' then p_patch -> 'results' else resultados end,
        premiacion_terminada = case
            when (p_patch ->> 'closed')::boolean is false then false
            when p_patch ? 'awardsDone' then coalesce((p_patch ->> 'awardsDone')::boolean, false)
            when p_patch ? 'results' or (p_patch ->> 'revealed')::boolean is false then false
            else premiacion_terminada end
    where id = 1;
    perform public._hw_bump();
    return public._hw_state(true);
end;
$$;

-- Si la persona había sido quitada, se reactiva con sus notas.
create or replace function public.hw_admin_add_person(p_token text, p_name text, p_group integer)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios := public._hw_user(p_token, 'admin');
    p public.participantes;
begin
    if coalesce(btrim(p_name), '') = '' or p_group not between 1 and 4 then
        raise exception 'Nombre y grupo (1 a 4) son obligatorios.' using errcode = 'PT400';
    end if;
    insert into public.participantes (nombre, grupo_id, orden)
    values (btrim(p_name), p_group,
            (select coalesce(max(orden), 0) + 1 from public.participantes where grupo_id = p_group))
    on conflict (nombre, grupo_id) do update set activo = true
    returning * into p;
    perform public._hw_bump();
    return jsonb_build_object('id', p.id::text, 'name', p.nombre, 'group', p.grupo_id, 'order', p.orden);
end;
$$;

create or replace function public.hw_admin_update_person(p_token text, p_id integer, p_name text, p_group integer)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios := public._hw_user(p_token, 'admin');
begin
    if coalesce(btrim(p_name), '') = '' or p_group not between 1 and 4 then
        raise exception 'Nombre y grupo (1 a 4) son obligatorios.' using errcode = 'PT400';
    end if;
    begin
        update public.participantes set nombre = btrim(p_name), grupo_id = p_group where id = p_id;
    exception when unique_violation then
        raise exception 'Ya existe una persona con ese nombre en ese grupo.' using errcode = 'PT409';
    end;
    if not found then
        raise exception 'Participante no encontrado.' using errcode = 'PT404';
    end if;
    perform public._hw_bump();
    return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.hw_admin_remove_person(p_token text, p_id integer)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios := public._hw_user(p_token, 'admin');
begin
    update public.participantes set activo = false where id = p_id;
    if not found then
        raise exception 'Participante no encontrado.' using errcode = 'PT404';
    end if;
    perform public._hw_bump();
    return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.hw_admin_set_pin(p_token text, p_who text, p_pin text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
    u public.usuarios := public._hw_user(p_token, 'admin');
begin
    if coalesce(p_pin, '') !~ '^[0-9]{4}$' then
        raise exception 'El PIN debe tener exactamente 4 dígitos.' using errcode = 'PT400';
    end if;
    update public.usuarios set pin_hash = public._hw_pin_hash(public._hw_new_salt(), p_who, p_pin)
    where nombre = p_who;
    if not found then
        raise exception 'Usuario desconocido.' using errcode = 'PT404';
    end if;
    delete from public.intentos_login where nombre = p_who;
    return jsonb_build_object('ok', true);
end;
$$;

-- ---------- Permisos: la clave pública solo puede ejecutar las funciones hw_* ----------
revoke execute on function
    public._hw_pin_hash(text, text, text), public._hw_new_salt(), public._hw_user(text, text),
    public._hw_bump(), public._hw_key(public.calificaciones), public._hw_entry(public.calificaciones),
    public._hw_state(boolean), public.bloquear_si_votacion_cerrada()
from public, anon, authenticated;

revoke execute on function
    public.hw_public(bigint), public.hw_results_detail(), public.hw_login(text, text), public.hw_session(text), public.hw_logout(text),
    public.hw_mine(text, bigint), public.hw_save_score(text, text, jsonb, boolean),
    public.hw_admin_all(text, bigint), public.hw_admin_state(text, jsonb),
    public.hw_admin_add_person(text, text, integer), public.hw_admin_update_person(text, integer, text, integer),
    public.hw_admin_remove_person(text, integer), public.hw_admin_set_pin(text, text, text)
from public;

grant execute on function
    public.hw_public(bigint), public.hw_results_detail(), public.hw_login(text, text), public.hw_session(text), public.hw_logout(text),
    public.hw_mine(text, bigint), public.hw_save_score(text, text, jsonb, boolean),
    public.hw_admin_all(text, bigint), public.hw_admin_state(text, jsonb),
    public.hw_admin_add_person(text, text, integer), public.hw_admin_update_person(text, integer, text, integer),
    public.hw_admin_remove_person(text, integer), public.hw_admin_set_pin(text, text, text)
to anon, authenticated;

-- ---------- PIN iniciales (solo a quien no tenga PIN). Cámbialos en Panel → Ajustes. ----------
update public.usuarios u set pin_hash = public._hw_pin_hash(public._hw_new_salt(), u.nombre, d.pin)
from (values ('Jorge', '4817'), ('Juliana', '2593'), ('Tifanny', '7364'), ('admin', '3108')) as d (nombre, pin)
where u.nombre = d.nombre and u.pin_hash is null;

-- Recarga el catálogo de la API para que las funciones nuevas queden disponibles de inmediato.
notify pgrst, 'reload schema';
