let cachedConfig = undefined;

function readMeta(name){
  if (typeof document === 'undefined') return '';
  const meta = document.querySelector(`meta[name="${name}"]`);
  return meta?.content?.trim() ?? '';
}

export function resolveSupabaseConfig(){
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  if (typeof window === 'undefined') {
    cachedConfig = null;
    return cachedConfig;
  }

  const globalConfig = window.__APPBASE_SUPABASE__ ?? window.__SUPABASE__ ?? null;
  const url = globalConfig?.url?.trim?.() ?? readMeta('supabase-url');
  const anonKey = globalConfig?.anonKey?.trim?.() ?? readMeta('supabase-anon-key');
  const schema = globalConfig?.schema?.trim?.() ?? readMeta('supabase-schema') || 'public';

  if (!url || !anonKey) {
    cachedConfig = null;
    return cachedConfig;
  }

  cachedConfig = { url: url.replace(/\/$/, ''), anonKey, schema };
  return cachedConfig;
}

export function clearSupabaseCache(){
  cachedConfig = undefined;
}
