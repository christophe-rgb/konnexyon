-- ============================================================
-- Musique de fond : playlist gérée depuis l'admin (upload MP3)
-- ============================================================

create table if not exists public.music_tracks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  url        text not null,
  position   int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.music_tracks enable row level security;

drop policy if exists music_select on public.music_tracks;
create policy music_select on public.music_tracks
  for select using (active = true or public.is_admin());

drop policy if exists music_admin on public.music_tracks;
create policy music_admin on public.music_tracks
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.music_tracks to anon, authenticated;
grant insert, update, delete on public.music_tracks to authenticated;

-- Playlist publique (pistes actives, ordonnées) — lue par le lecteur du site.
create or replace function public.get_music()
returns table (id uuid, title text, url text)
language sql security definer set search_path = public as $$
  select id, title, url from public.music_tracks
  where active = true order by position asc, created_at asc;
$$;
grant execute on function public.get_music() to anon, authenticated;

-- Admin : liste complète (actives + inactives).
create or replace function public.admin_list_music()
returns setof public.music_tracks language sql security definer set search_path = public as $$
  select * from public.music_tracks where public.is_admin() order by position asc, created_at asc;
$$;
grant execute on function public.admin_list_music() to authenticated;

-- Admin : ajouter une piste (après upload du MP3 dans le bucket 'music').
create or replace function public.admin_add_music(p_title text, p_url text)
returns uuid language plpgsql security definer set search_path = public as $$
declare vid uuid; nextpos int;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if coalesce(btrim(p_title),'') = '' or coalesce(btrim(p_url),'') = '' then
    raise exception 'titre et fichier requis'; end if;
  select coalesce(max(position),0) + 1 into nextpos from public.music_tracks;
  insert into public.music_tracks (title, url, position)
  values (btrim(p_title), p_url, nextpos) returning id into vid;
  return vid;
end; $$;
grant execute on function public.admin_add_music(text, text) to authenticated;

-- Admin : supprimer / (dés)activer / réordonner.
create or replace function public.admin_delete_music(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.music_tracks where id = p_id;
end; $$;
grant execute on function public.admin_delete_music(uuid) to authenticated;

create or replace function public.admin_set_music_active(p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.music_tracks set active = coalesce(p_active, true) where id = p_id;
end; $$;
grant execute on function public.admin_set_music_active(uuid, boolean) to authenticated;

create or replace function public.admin_set_music_position(p_id uuid, p_position int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.music_tracks set position = p_position where id = p_id;
end; $$;
grant execute on function public.admin_set_music_position(uuid, int) to authenticated;

-- Bucket 'music' public (héberge les MP3), écriture réservée à l'admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music','music', true, 26214400,
        array['audio/mpeg','audio/mp3','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/aac','audio/webm'])
on conflict (id) do update set
  public = true, file_size_limit = 26214400,
  allowed_mime_types = array['audio/mpeg','audio/mp3','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/aac','audio/webm'];

drop policy if exists "music_insert_admin" on storage.objects;
create policy "music_insert_admin" on storage.objects for insert
  with check (bucket_id = 'music' and public.is_admin());
drop policy if exists "music_update_admin" on storage.objects;
create policy "music_update_admin" on storage.objects for update
  using (bucket_id = 'music' and public.is_admin());
drop policy if exists "music_delete_admin" on storage.objects;
create policy "music_delete_admin" on storage.objects for delete
  using (bucket_id = 'music' and public.is_admin());
