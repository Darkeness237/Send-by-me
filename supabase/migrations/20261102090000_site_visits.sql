-- Mesure d'audience maison : une ligne par page vue, sans cookie ni donnée personnelle.
-- Le visiteur est une empreinte qui change chaque jour (impossible de suivre quelqu'un d'un jour à l'autre).
create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  day date not null default (now() at time zone 'Europe/Paris')::date,
  path text not null,
  visitor text not null,
  source text,
  device text not null default 'mobile',
  created_at timestamptz not null default now()
);

create index if not exists site_visits_day_idx on public.site_visits (day);

-- Écrit et lu uniquement par le serveur (clé secrète) : aucune politique pour les membres.
alter table public.site_visits enable row level security;

-- Statistiques sur une période, en un seul appel pour l'onglet Audience de l'admin.
create or replace function public.audience_stats(p_days int)
returns jsonb
language sql
stable
set search_path = public
as $$
  with v as (
    select * from site_visits where day > (now() at time zone 'Europe/Paris')::date - p_days
  )
  select jsonb_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct (day, visitor)) from v),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'views', views, 'visitors', visitors) order by d)
      from (select day as d, count(*) as views, count(distinct visitor) as visitors from v group by day) t
    ), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'views', views) order by views desc)
      from (select path, count(*) as views from v group by path order by views desc limit 10) t
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'visitors', visitors) order by visitors desc)
      from (select coalesce(source, 'Direct') as source, count(distinct (day, visitor)) as visitors from v group by 1 order by 2 desc limit 8) t
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'visitors', visitors) order by visitors desc)
      from (select device, count(distinct (day, visitor)) as visitors from v group by device) t
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.audience_stats(int) from public, anon, authenticated;
