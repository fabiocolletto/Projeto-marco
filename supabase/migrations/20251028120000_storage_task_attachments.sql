begin;

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do update set
  name = excluded.name,
  public = true;

-- Public read-only access
drop policy if exists "Task attachments are publicly readable" on storage.objects;
create policy "Task attachments are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'task-attachments');

-- Service role manages writes
drop policy if exists "Task attachments managed by service role" on storage.objects;
create policy "Task attachments managed by service role"
  on storage.objects
  for all
  using (bucket_id = 'task-attachments' and auth.role() = 'service_role')
  with check (bucket_id = 'task-attachments' and auth.role() = 'service_role');

insert into public.release_log (version, release_date, description, status, metadata)
values (
  '012',
  date '2025-10-28',
  'Ativado bucket de anexos, relatórios via Edge Functions e sincronização Make.com.',
  'operational',
  jsonb_build_object(
    'bucket', 'task-attachments',
    'edge_functions', jsonb_build_array('generate-task-report', 'sync-release-log'),
    'alerts', jsonb_build_object('storage_quota', 'enabled')
  )
)
on conflict (version) do update set
  release_date = excluded.release_date,
  description = excluded.description,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = timezone('utc', now());

commit;
