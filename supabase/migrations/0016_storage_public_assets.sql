-- Public asset storage for CMS-managed images (team profile photos, etc.).
-- Bucket is public-read; writes are restricted to platform admins.
insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true)
on conflict (id) do update set public = true;

do $$ begin
  begin
    create policy "public_read_public_assets" on storage.objects
      for select using (bucket_id = 'public-assets');
  exception when duplicate_object then null; end;
  begin
    create policy "admin_insert_public_assets" on storage.objects
      for insert to authenticated with check (bucket_id = 'public-assets' and public.is_platform_admin());
  exception when duplicate_object then null; end;
  begin
    create policy "admin_update_public_assets" on storage.objects
      for update to authenticated using (bucket_id = 'public-assets' and public.is_platform_admin());
  exception when duplicate_object then null; end;
  begin
    create policy "admin_delete_public_assets" on storage.objects
      for delete to authenticated using (bucket_id = 'public-assets' and public.is_platform_admin());
  exception when duplicate_object then null; end;
end $$;
