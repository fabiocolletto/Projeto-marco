export async function validateLicense(workerUrl, userRef) {
  const url = `${workerUrl.replace(/\/$/, '')}/license/validate?user=${encodeURIComponent(userRef)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    return await response.json();
  } catch (error) {
    return { user: userRef, license: { status: "offline" } };
  }
}

export async function subscribe(workerUrl, email, plan = "pro") {
  const url = `${workerUrl.replace(/\/$/, '')}/subscribe`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, plan })
  });
  if (!response.ok) {
    throw new Error(`subscribe HTTP ${response.status}`);
  }
  return response.json();
}
