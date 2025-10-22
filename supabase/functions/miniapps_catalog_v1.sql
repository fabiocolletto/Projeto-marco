-- View responsável por expor o catálogo de miniapps com traduções agregadas.
create or replace view public.miniapps_catalog_v1
with (security_invoker = true)
as
select
  m.id,
  m.name,
  m.entry_path,
  m.manifest_path,
  m.snippet_path,
  m.icon_url,
  m.is_active,
  m.updated_at,
  coalesce(jsonb_object_agg(mt.locale, jsonb_build_object(
    'display_name', mt.display_name,
    'snippet', mt.snippet_payload
  ) order by mt.locale), '{}'::jsonb) as translations
from public.miniapps m
left join public.miniapp_translations mt on mt.miniapp_id = m.id
where m.is_active is distinct from false
group by m.id, m.name, m.entry_path, m.manifest_path, m.snippet_path, m.icon_url, m.is_active, m.updated_at;
