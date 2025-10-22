begin;

alter table if exists public.tasks enable row level security;

drop policy if exists "Tasks readable by owner" on public.tasks;
create policy "Tasks readable by owner" on public.tasks
  for select using (profile_id = auth.uid());

drop policy if exists "Tasks managed by owner" on public.tasks;
create policy "Tasks managed by owner" on public.tasks
  for insert with check (profile_id = auth.uid());

drop policy if exists "Tasks updated by owner" on public.tasks;
create policy "Tasks updated by owner" on public.tasks
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "Tasks deleted by owner" on public.tasks;
create policy "Tasks deleted by owner" on public.tasks
  for delete using (profile_id = auth.uid());

drop policy if exists "Task items readable by owner" on public.task_items;
drop policy if exists "Task items insert restricted" on public.task_items;
drop policy if exists "Task items update restricted" on public.task_items;
drop policy if exists "Task items removal restricted" on public.task_items;

create policy "Task items readable by owner v2" on public.task_items
  for select using (owner_id = auth.uid());

create policy "Task items managed by owner v2" on public.task_items
  for insert with check (owner_id = auth.uid());

create policy "Task items updated by owner v2" on public.task_items
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Task items deleted by owner v2" on public.task_items
  for delete using (owner_id = auth.uid());

drop policy if exists "Feature flags managed by creator" on public.feature_flags;
drop policy if exists "Feature flags update restricted" on public.feature_flags;
drop policy if exists "Feature flags removal restricted" on public.feature_flags;

create policy "Feature flags managed by creator v2" on public.feature_flags
  for insert with check (created_by = auth.uid());

create policy "Feature flags updated by creator v2" on public.feature_flags
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "Feature flags deleted by creator v2" on public.feature_flags
  for delete using (created_by = auth.uid());

commit;
