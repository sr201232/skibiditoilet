-- New project schema. Public toilet records are publicly readable; writes require an owner/admin.
create table if not exists public.toilets (
 id text primary key,
 name text not null,
 lat double precision not null check (lat between -90 and 90),
 lng double precision not null check (lng between -180 and 180),
 address text not null default '',
 hours text not null default '',
 type text not null default '',
 retrieved_at date not null
);
alter table public.toilets enable row level security;
revoke all on public.toilets from anon, authenticated;
grant select on public.toilets to anon, authenticated;
create policy "Public toilet read access" on public.toilets for select to anon, authenticated using (true);
