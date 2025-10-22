-- View para recuperar rapidamente a entrada mais recente do registro de lançamentos.
create or replace view public.release_log_latest_v1
with (security_invoker = true)
as
select r.version,
       r.release_date,
       r.description,
       r.status,
       r.metadata,
       r.updated_at
from public.release_log r
order by r.version::int desc
limit 1;
