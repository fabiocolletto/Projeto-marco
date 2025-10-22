import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveSupabaseConfig } from './supabase-config.js';

let cachedClient = null;
let cachedSignature = null;

function getSignature(config){
  if (!config) return null;
  return `${config.url}::${config.anonKey}::${config.schema || 'public'}`;
}

export function getSupabaseClient(){
  const config = resolveSupabaseConfig();
  if (!config) {
    return null;
  }
  const signature = getSignature(config);
  if (!cachedClient || cachedSignature !== signature) {
    cachedClient = createSupabaseClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        storageKey: 'appbase.supabase.auth'
      },
      db: {
        schema: config.schema || 'public'
      }
    });
    cachedSignature = signature;
  }
  return cachedClient;
}

export async function ensureAnonymousSession(){
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data: sessionResult, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    console.warn('[supabase] Falha ao recuperar sessão', sessionError);
  }
  if (sessionResult?.session) {
    return sessionResult.session;
  }
  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    console.warn('[supabase] Falha ao autenticar anonimamente', error);
    return null;
  }
  return data?.session ?? null;
}

export { createSupabaseClient as createClient };
