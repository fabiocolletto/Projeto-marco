const normalizeWorkerUrl = (workerUrl) => {
  const base = String(workerUrl || "").trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

export async function validateLicense(workerUrl, userRef) {
  const base = normalizeWorkerUrl(workerUrl);
  const url = `${base}/license/validate?user=${encodeURIComponent(userRef)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return {
      user: userRef,
      license: {
        status: "offline",
      },
      error: String(error),
    };
  }
}

export async function subscribe(workerUrl, email, plan = "pro") {
  const base = normalizeWorkerUrl(workerUrl);
  const url = `${base}/subscribe`;
  const payload = { email, plan };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`subscribe HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchPlans(workerUrl) {
  const base = normalizeWorkerUrl(workerUrl);
  const response = await fetch(`${base}/plans`);
  if (!response.ok) {
    throw new Error(`plans HTTP ${response.status}`);
  }
  return response.json();
}
