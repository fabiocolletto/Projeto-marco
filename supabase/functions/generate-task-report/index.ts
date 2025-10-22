import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const BUCKET_ID = 'task-attachments';
const DRY_RUN = (Deno.env.get('EDGE_FUNCTION_DRY_RUN') ?? '').toLowerCase() === 'true';

function formatCsv(rows: string[][]): { csv: string; bytes: number } {
  const encodedRows = rows
    .filter((row) => Array.isArray(row) && row.length > 0)
    .map((row) =>
      row
        .map((value) => {
          const normalized = String(value ?? '')
            .replace(/\r?\n+/g, ' ')
            .trim();
          return `"${normalized.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

  const csv = encodedRows.join('\n');
  const bytes = new TextEncoder().encode(csv).byteLength;
  return { csv, bytes };
}

function buildDryRunUrl(filePath: string): string {
  const base = (Deno.env.get('TASK_ATTACHMENTS_PUBLIC_BASE_URL') ?? 'https://example.local/storage/task-attachments').replace(/\/+$/, '');
  return `${base}/${filePath}`;
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

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (error) {
    console.error('[generate-task-report] Invalid JSON payload', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: RESPONSE_HEADERS }
    );
  }

  const rows = Array.isArray((payload as Record<string, unknown>)?.rows)
    ? ((payload as { rows: unknown[] }).rows as unknown[])
    : [];

  const normalizedRows = rows
    .map((row) => (Array.isArray(row) ? (row as unknown[]).map((value) => String(value ?? '')) : []))
    .filter((row) => row.length > 0);

  if (normalizedRows.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'No rows provided for report generation' }),
      { status: 400, headers: RESPONSE_HEADERS }
    );
  }

  const filePath = `reports/tasks-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}.csv`;
  const { csv, bytes } = formatCsv(normalizedRows as string[][]);

  if (DRY_RUN) {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: buildDryRunUrl(filePath),
          path: filePath,
          bytes,
          dryRun: true
        }
      }),
      { status: 200, headers: RESPONSE_HEADERS }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[generate-task-report] Missing Supabase service credentials');
    return new Response(
      JSON.stringify({ success: false, error: 'Supabase credentials are not configured' }),
      { status: 500, headers: RESPONSE_HEADERS }
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-App-Source': 'generate-task-report' } }
  });

  const storage = client.storage.from(BUCKET_ID);

  const { error: uploadError } = await storage.upload(filePath, new TextEncoder().encode(csv), {
    contentType: 'text/csv; charset=utf-8',
    cacheControl: '3600',
    upsert: false
  });

  if (uploadError) {
    console.error('[generate-task-report] Failed to upload report', uploadError);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to upload report to storage' }),
      { status: 502, headers: RESPONSE_HEADERS }
    );
  }

  const { data: publicUrlData, error: publicUrlError } = storage.getPublicUrl(filePath);

  if (publicUrlError || !publicUrlData?.publicUrl) {
    console.error('[generate-task-report] Unable to resolve public URL', publicUrlError);
    return new Response(
      JSON.stringify({ success: false, error: 'Report generated but public URL is unavailable' }),
      { status: 502, headers: RESPONSE_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        url: publicUrlData.publicUrl,
        path: filePath,
        bytes,
        dryRun: false
      }
    }),
    { status: 200, headers: RESPONSE_HEADERS }
  );
});
