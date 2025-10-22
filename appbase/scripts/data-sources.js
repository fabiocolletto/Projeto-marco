import { resolveSupabaseConfig } from './supabase-config.js';

function buildSupabaseHeaders(config){
  const headers = new Headers();
  headers.set('apikey', config.anonKey);
  headers.set('Authorization', `Bearer ${config.anonKey}`);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  if (config.schema) {
    headers.set('Accept-Profile', config.schema);
  }
  return headers;
}

async function fetchFromSupabase(path, { search } = {}){
  const config = resolveSupabaseConfig();
  if (!config) {
    return null;
  }

  try {
    const url = new URL(`${config.url}/rest/v1/${path}`);
    if (search) {
      Object.entries(search).forEach(([key, value]) => {
        if (value != null) {
          url.searchParams.set(key, value);
        }
      });
    }
    if (!url.searchParams.has('select')) {
      url.searchParams.set('select', '*');
    }

    const response = await fetch(url.toString(), {
      headers: buildSupabaseHeaders(config)
    });
    if (!response.ok) {
      console.warn(`[data] Supabase request ${path} failed`, response.status);
      return null;
    }
    const data = await response.json();
    return { config, data };
  } catch (error) {
    console.warn(`[data] Supabase request ${path} failed`, error);
    return null;
  }
}

async function fetchJson(path){
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`[data] Fallback request failed for ${path}`, error);
    return null;
  }
}

function normalizeMiniappRow(row){
  const translations = row.translations && typeof row.translations === 'object' ? row.translations : null;
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

export async function fetchMiniappsCatalog(){
  const supabaseResult = await fetchFromSupabase('miniapps_catalog_v1');
  if (supabaseResult && Array.isArray(supabaseResult.data) && supabaseResult.data.length){
    const normalized = supabaseResult.data.map(normalizeMiniappRow).filter(item => item.isActive);
    if (normalized.length){
      return { source: 'supabase', items: normalized };
    }
  }

  const fallback = await fetchJson('../miniapps/catalog.json');
  if (Array.isArray(fallback) && fallback.length){
    const normalized = fallback.map(item => ({
      id: item.id,
      name: item.name,
      entry: item.entry,
      manifest: item.manifest,
      snippetSource: item.snippet,
      snippetPath: item.snippet,
      displayNames: null,
      isActive: true
    }));
    return { source: 'fallback', items: normalized };
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
  const supabaseResult = await fetchFromSupabase('release_log_latest_v1');
  if (supabaseResult && Array.isArray(supabaseResult.data) && supabaseResult.data.length){
    const row = supabaseResult.data[0];
    return {
      source: 'supabase',
      entry: {
        version: row.version,
        date: row.release_date,
        description: row.description,
        status: row.status ?? '',
        metadata: row.metadata ?? null
      }
    };
  }

  const fallback = await fetchFallbackReleaseEntry();
  if (fallback){
    return { source: 'fallback', entry: fallback };
  }

  return null;
}

export async function fetchFeatureFlags(){
  const supabaseResult = await fetchFromSupabase('feature_flags', {
    search: { select: 'flag_key,is_enabled,description,rollout' }
  });
  if (supabaseResult && Array.isArray(supabaseResult.data)){
    return supabaseResult.data.map(row => ({
      key: row.flag_key,
      enabled: !!row.is_enabled,
      description: row.description ?? '',
      rollout: row.rollout ?? {}
    }));
  }
  return null;
}
