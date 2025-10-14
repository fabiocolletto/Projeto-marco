export async function validateLicense(config, userRef) {
  const url = `${config.worker_url.replace(/\/$/,'')}/license/validate?user=${encodeURIComponent(userRef)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("validateLicense HTTP " + r.status);
    return await r.json();
  } catch (e) {
    return { user: userRef, license: { status: "offline", plan: null } };
  }
}
export async function subscribe(config, email, plan="pro", user_id) {
  const url = `${config.worker_url.replace(/\/$/,'')}/subscribe`;
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, user_id, plan }) });
  if (!r.ok) throw new Error("subscribe HTTP " + r.status);
  return await r.json();
}
