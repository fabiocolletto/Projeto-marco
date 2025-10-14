const MP_API_BASE = "https://api.mercadopago.com";

function normalizePath(path: string): string {
  if (!path) return "/";
  const cleaned = path.replace(/\/+/g, "/");
  return cleaned.endsWith("/") && cleaned !== "/" ? cleaned.slice(0, -1) : cleaned || "/";
}

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function withCORS(req: Request, res: Response, env: Env): Response {
  const headers = new Headers(res.headers);
  const allowed = (env as any).ORIGIN_ALLOWED || "*";
  const origin = req.headers.get("Origin");
  if (allowed === "*" || (origin && allowed.split(",").map((s: string) => s.trim()).includes(origin))) {
    headers.set("Access-Control-Allow-Origin", origin || allowed);
    headers.set("Vary", "Origin");
  } else if (allowed) {
    headers.set("Access-Control-Allow-Origin", allowed);
  }
  headers.set("Access-Control-Allow-Headers", req.headers.get("Access-Control-Request-Headers") || "Content-Type,Authorization");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return new Response(res.body, { ...res, headers });
}

async function handleOptions(req: Request, env: Env): Promise<Response> {
  const res = new Response(null, { status: 204 });
  return withCORS(req, res, env);
}

function requiredEnv(env: Env, key: keyof Env | string): string {
  const value = (env as any)[key];
  if (!value) throw new Error(`Missing env var: ${String(key)}`);
  return value;
}

function resolvePlanId(env: Env, plan: string): string | null {
  const key = `PLAN_${plan.toUpperCase()}_ID`;
  return (env as any)[key] || null;
}

async function fetchPreapproval(env: Env, preapprovalId: string): Promise<any> {
  const token = requiredEnv(env, "MP_ACCESS_TOKEN");
  const response = await fetch(`${MP_API_BASE}/preapproval/${encodeURIComponent(preapprovalId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`preapproval_fetch_failed:${response.status}:${errorBody}`);
  }
  return response.json();
}

async function createPreapproval(env: Env, email: string, planId: string): Promise<any> {
  const token = requiredEnv(env, "MP_ACCESS_TOKEN");
  const body: Record<string, any> = {
    payer_email: email,
    preapproval_plan_id: planId,
  };
  const backUrl = (env as any).BACK_URL;
  if (backUrl) body.back_url = backUrl;

  const response = await fetch(`${MP_API_BASE}/preapproval`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`preapproval_create_failed:${response.status}:${JSON.stringify(data)}`);
  }
  return data;
}

const ADMIN_SESSION_TTL = 2 * 60 * 60; // 2h
function uuid(){ return crypto.randomUUID(); }
async function kvSetJSON(kv: KVNamespace, key: string, val: any, ttl?: number){ await kv.put(key, JSON.stringify(val), ttl?{expirationTtl: ttl}:undefined); }
async function kvGetJSON<T=any>(kv: KVNamespace, key: string): Promise<T|null>{ const v = await kv.get(key); return v? JSON.parse(v) : null; }

async function refreshLicense(env: Env, user: string, license: any): Promise<any> {
  if (!license?.preapproval_id) return license;
  try {
    const sub = await fetchPreapproval(env, license.preapproval_id);
    const next = sub.next_payment_date || sub.auto_recurring?.next_payment_date || null;
    let status = "pending";
    if (sub.status === "authorized") status = "active";
    if (sub.status === "cancelled") status = "cancelled";
    if (sub.status === "paused") status = "paused";
    const updated = {
      ...license,
      status,
      next_payment_date: next,
      updated_at: new Date().toISOString(),
    };
    await kvSetJSON(env.BILLING_KV, `license:${user}`, updated);
    return updated;
  } catch (err) {
    return { ...license, error: String(err) };
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === "OPTIONS") {
      return handleOptions(req, env);
    }

    const url = new URL(req.url);
    const path = normalizePath(url.pathname);

    try {
      // <OP_ROUTES_START>
      if (req.method === "GET" && path === "/health") {
        return withCORS(req, json({ ok:true, time:new Date().toISOString() }), env);
      }

      if (req.method === "POST" && path === "/op/login") {
        const { passcode } = await req.json().catch(()=>({}));
        if (!passcode) return withCORS(req, json({ error:"passcode_required" }, { status:400 }), env);
        // Validação simples por secret (não expor no cliente)
        const ok = passcode === (env as any).ADMIN_PASSCODE;
        if (!ok) return withCORS(req, json({ error:"unauthorized" }, { status:401 }), env);
        const token = uuid();
        await env.BILLING_KV.put("admin_session:"+token, "1", { expirationTtl: ADMIN_SESSION_TTL });
        return withCORS(req, json({ token, ttl: ADMIN_SESSION_TTL }), env);
      }

      if (req.method === "POST" && path === "/op/license/refresh") {
        const auth = req.headers.get("authorization")||"";
        const token = auth.replace(/^Bearer\s+/i,"");
        const ok = token && await env.BILLING_KV.get("admin_session:"+token);
        if (!ok) return withCORS(req, json({ error:"unauthorized" }, { status:401 }), env);

        const { user } = await req.json().catch(()=>({}));
        if (!user) return withCORS(req, json({ error:"user_required" }, { status:400 }), env);

        // lê licença existente
        const key = "license:"+user;
        const lic = await kvGetJSON(env.BILLING_KV, key);
        if (!lic?.preapproval_id) return withCORS(req, json({ error:"license_not_found_or_missing_preapproval_id" }, { status:404 }), env);

        const accessToken = requiredEnv(env, "MP_ACCESS_TOKEN");
        const s = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(lic.preapproval_id)}`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const sub = await s.json();
        const next = sub.next_payment_date || sub.auto_recurring?.next_payment_date || null;
        let status = "pending";
        if (sub.status === "authorized") status = "active";
        if (sub.status === "cancelled")  status = "cancelled";
        if (sub.status === "paused")     status = "paused";

        const updated = { ...lic, status, next_payment_date: next, updated_at: new Date().toISOString() };
        await kvSetJSON(env.BILLING_KV, key, updated);
        return withCORS(req, json({ ok:true, license: updated }), env);
      }
      // <OP_ROUTES_END>

      if (req.method === "GET" && path === "/plans") {
        const plans = ["starter", "pro", "master"].map((slug) => ({
          slug,
          id: resolvePlanId(env, slug),
        }));
        return withCORS(req, json({ plans }), env);
      }

      if (req.method === "GET" && path === "/license/validate") {
        const user = url.searchParams.get("user");
        if (!user) return withCORS(req, json({ error: "user_required" }, { status: 400 }), env);
        const key = `license:${user}`;
        const stored = await kvGetJSON(env.BILLING_KV, key);
        if (!stored) {
          return withCORS(req, json({ ok: false, license: null }), env);
        }
        const refreshed = await refreshLicense(env, user, stored);
        return withCORS(req, json({ ok: true, license: refreshed }), env);
      }

      if (req.method === "POST" && path === "/subscribe") {
        const body = await req.json().catch(() => ({}));
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const plan = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "";
        if (!email) return withCORS(req, json({ error: "email_required" }, { status: 400 }), env);
        if (!plan) return withCORS(req, json({ error: "plan_required" }, { status: 400 }), env);
        const planId = resolvePlanId(env, plan);
        if (!planId) return withCORS(req, json({ error: "plan_not_configured" }, { status: 400 }), env);

        const subscription = await createPreapproval(env, email, planId);
        const license = {
          user: email,
          plan,
          preapproval_id: subscription.id,
          init_point: subscription.init_point || null,
          status: subscription.status || "pending",
          next_payment_date: subscription.next_payment_date || subscription.auto_recurring?.next_payment_date || null,
          created_at: new Date().toISOString(),
        };
        await kvSetJSON(env.BILLING_KV, `license:${email}`, license);
        return withCORS(req, json({ ok: true, subscription, license }), env);
      }

      return withCORS(req, json({ error: "not_found" }, { status: 404 }), env);
    } catch (error) {
      return withCORS(req, json({ error: String(error) }, { status: 500 }), env);
    }
  },
};

interface Env {
  BILLING_KV: KVNamespace;
  MP_ACCESS_TOKEN: string;
  PLAN_STARTER_ID?: string;
  PLAN_PRO_ID?: string;
  PLAN_MASTER_ID?: string;
  BACK_URL?: string;
  ORIGIN_ALLOWED?: string;
  ADMIN_PASSCODE?: string;
}
