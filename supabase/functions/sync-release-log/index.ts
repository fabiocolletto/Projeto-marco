import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const DRY_RUN = (Deno.env.get('EDGE_FUNCTION_DRY_RUN') ?? '').toLowerCase() === 'true';

interface ReleaseRecord {
  version: string;
  release_date: string;
  description: string;
  status: string;
  metadata: Record<string, unknown> | null;
}

function normaliseTarget(target: unknown): string {
  if (typeof target !== 'string') return 'make';
  const trimmed = target.trim();
  return trimmed.length > 0 ? trimmed : 'make';
}

function truncate(value: string, limit = 512): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}…`;
}

function safeMetadata(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: RESPONSE_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: RESPONSE_HEADERS }
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch (error) {
    console.error('[sync-release-log] Invalid JSON payload', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: RESPONSE_HEADERS }
    );
  }

  const version = typeof payload.version === 'string' ? payload.version.trim() : '';
  if (!version) {
    return new Response(
      JSON.stringify({ success: false, error: 'version is required' }),
      { status: 400, headers: RESPONSE_HEADERS }
    );
  }

  const overrideUrl = typeof payload.webhook_url === 'string' ? payload.webhook_url.trim() : '';
  const fallbackUrl = Deno.env.get('MAKE_WEBHOOK_URL') ?? '';
  const webhookUrl = overrideUrl || fallbackUrl;

  if (!webhookUrl) {
    console.error('[sync-release-log] No webhook URL configured');
    return new Response(
      JSON.stringify({ success: false, error: 'Webhook URL is not configured' }),
      { status: 500, headers: RESPONSE_HEADERS }
    );
  }

  const target = normaliseTarget(payload.target);
  const syncedAt = new Date().toISOString();

  if (DRY_RUN) {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          version,
          target,
          status: 'queued',
          webhookUrl,
          syncedAt,
          dryRun: true
        }
      }),
      { status: 200, headers: RESPONSE_HEADERS }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[sync-release-log] Missing Supabase service credentials');
    return new Response(
      JSON.stringify({ success: false, error: 'Supabase credentials are not configured' }),
      { status: 500, headers: RESPONSE_HEADERS }
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-App-Source': 'sync-release-log' } }
  });

  const { data: release, error: releaseError } = await client
    .from<ReleaseRecord>('release_log')
    .select('version, release_date, description, status, metadata')
    .eq('version', version)
    .maybeSingle();

  if (releaseError || !release) {
    console.error('[sync-release-log] Release not found', releaseError);
    return new Response(
      JSON.stringify({ success: false, error: 'Release not found' }),
      { status: 404, headers: RESPONSE_HEADERS }
    );
  }

  const syncPayload = {
    version: release.version,
    release_date: release.release_date,
    description: release.description,
    status: release.status,
    metadata: release.metadata ?? {},
    target,
    synced_at: syncedAt
  };

  let webhookResponse: Response;
  try {
    webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload)
    });
  } catch (error) {
    console.error('[sync-release-log] Failed to call webhook', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to reach webhook endpoint' }),
      { status: 502, headers: RESPONSE_HEADERS }
    );
  }

  const responsePreview = truncate(await webhookResponse.text());

  if (!webhookResponse.ok) {
    console.error('[sync-release-log] Webhook responded with error', webhookResponse.status, responsePreview);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Webhook call failed',
        details: {
          status: webhookResponse.status,
          body: responsePreview
        }
      }),
      { status: 502, headers: RESPONSE_HEADERS }
    );
  }

  const metadata = safeMetadata(release.metadata);
  metadata.last_external_sync = {
    target,
    url: webhookUrl,
    at: syncedAt
  };

  const { error: updateError } = await client
    .from('release_log')
    .update({ metadata })
    .eq('version', release.version);

  const warnings = updateError ? ['Unable to persist sync metadata'] : [];
  if (updateError) {
    console.error('[sync-release-log] Failed to update metadata', updateError);
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        version: release.version,
        target,
        status: 'synced',
        webhookUrl,
        responseStatus: webhookResponse.status,
        responseBodyPreview: responsePreview,
        metadataUpdated: !updateError,
        syncedAt,
        warnings
      }
    }),
    { status: 200, headers: RESPONSE_HEADERS }
  );
});
