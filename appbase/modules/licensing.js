function resolveWorkerUrl(input) {
  if (typeof input === "string") return input;
  if (input && typeof input.worker_url === "string") return input.worker_url;
  throw new Error("worker_url não definido");
}

export async function validateLicense(cfgOrUrl, userRef) {
  const workerUrl = resolveWorkerUrl(cfgOrUrl).replace(/\/$/, "");
  const url = `${workerUrl}/license/validate?user=${encodeURIComponent(userRef)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } catch {
    return { user: userRef, license: { status: "offline" } };
  }
}

export async function subscribe(cfgOrUrl, email, plan = "pro", userId) {
  const workerUrl = resolveWorkerUrl(cfgOrUrl).replace(/\/$/, "");
  const body = { email, plan };
  if (userId) body.user_id = userId;
  const r = await fetch(`${workerUrl}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("subscribe HTTP " + r.status);
  return r.json();
}
