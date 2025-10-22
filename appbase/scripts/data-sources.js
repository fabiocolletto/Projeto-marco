import { getSupabaseClient } from './supabaseClient.js';
import { projectStore } from './projectStore.js';

const CATALOG_CACHE_KEY = 'appbase.catalog.latest';
const RELEASE_CACHE_KEY = 'appbase.release.latest';
const FEATURE_FLAGS_CACHE_KEY = 'appbase.feature_flags.latest';

function normalizeMiniappRow(row){
  const translations = row && typeof row.translations === 'object' ? row.translations : null;
  const inlineSnippets = translations
    ? Object.fromEntries(Object.entries(translations).map(([locale, payload]) => [locale, payload?.snippet ?? {}]))
    : null;
  const displayNames = translations
    ? Object.fromEntries(Object.entries(translations).map(([locale, payload]) => [locale, payload?.display_name ?? row.name]))
    : null;

  return {
    id: row.id,
    name: row.name,
    entry: row.entry_path,
    manifest: row.manifest_path,
    snippetSource: inlineSnippets && Object.keys(inlineSnippets).length ? inlineSnippets : row.snippet_path,
    snippetPath: row.snippet_path,
    displayNames,
    isActive: row.is_active !== false
  };
}

function cacheValue(key, value){
  try {
    projectStore.set(key, value);
  } catch (error) {
    console.warn('[data] Falha ao salvar cache', key, error);
  }
}

function readCache(key){
  try {
    return projectStore.get(key, null);
  } catch (error) {
    console.warn('[data] Falha ao ler cache', key, error);
    return null;
  }
}

export async function fetchMiniappsCatalog(){
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('miniapps_catalog_v1')
        .select('id,name,entry_path,manifest_path,snippet_path,translations,is_active,updated_at');
      if (error) {
        console.warn('[data] Falha ao consultar catálogo no Supabase', error);
      } else if (Array.isArray(data)) {
        const normalized = data.map(normalizeMiniappRow).filter(item => item.isActive);
        cacheValue(CATALOG_CACHE_KEY, normalized);
        return { source: 'supabase', items: normalized };
      }
    } catch (error) {
      console.warn('[data] Erro inesperado ao consultar catálogo', error);
    }
  }

  const cached = readCache(CATALOG_CACHE_KEY);
  if (Array.isArray(cached)) {
    return { source: 'cache', items: cached };
  }

  return { source: 'empty', items: [] };
}

function parseReleaseMarkdown(markdown){
  const rows = markdown
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^\|\s*\d+/.test(line));
  if (!rows.length) {
    return null;
  }
  const [version, date, description, status] = rows[0]
    .split('|')
    .map(cell => cell.trim())
    .filter(Boolean);
  return {
    version,
    date,
    description,
    status: status || ''
  };
}

async function fetchFallbackReleaseEntry(){
  try {
    const response = await fetch('../docs/registro-log.md');
    if (!response.ok) {
      return null;
    }
    const markdown = await response.text();
    return parseReleaseMarkdown(markdown);
  } catch (error) {
    console.warn('[data] Falha ao carregar registro de fallback', error);
    return null;
  }
}

export async function getLatestReleaseEntry(){
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('release_log_latest_v1')
        .select('version,release_date,description,status,metadata')
        .limit(1);
      if (error) {
        console.warn('[data] Falha ao consultar release log', error);
      } else if (Array.isArray(data) && data.length) {
        const row = data[0];
        const payload = {
          version: row.version,
          date: row.release_date,
          description: row.description,
          status: row.status ?? '',
          metadata: row.metadata ?? null
        };
        cacheValue(RELEASE_CACHE_KEY, payload);
        return { source: 'supabase', entry: payload };
      }
    } catch (error) {
      console.warn('[data] Erro inesperado ao consultar release log', error);
    }
  }

  const cached = readCache(RELEASE_CACHE_KEY);
  if (cached) {
    return { source: 'cache', entry: cached };
  }

  const fallback = await fetchFallbackReleaseEntry();
  if (fallback){
    cacheValue(RELEASE_CACHE_KEY, fallback);
    return { source: 'fallback', entry: fallback };
  }

  return null;
}

export async function fetchFeatureFlags(){
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('flag_key,is_enabled,description,rollout');
      if (error) {
        console.warn('[data] Falha ao consultar feature flags', error);
      } else if (Array.isArray(data)) {
        const flags = data.map(row => ({
          key: row.flag_key,
          enabled: !!row.is_enabled,
          description: row.description ?? '',
          rollout: row.rollout ?? {}
        }));
        cacheValue(FEATURE_FLAGS_CACHE_KEY, flags);
        return flags;
      }
    } catch (error) {
      console.warn('[data] Erro inesperado ao consultar feature flags', error);
    }
  }

  const cached = readCache(FEATURE_FLAGS_CACHE_KEY);
  return Array.isArray(cached) ? cached : null;
}
