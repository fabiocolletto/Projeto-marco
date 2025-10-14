import { validateLicense, subscribe } from "./licensing.js";
async function ensurePaywall(ui) {
  if (ui?.renderPaywall) return ui;
  const res = await fetch('./components/paywall.html', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Falha ao carregar paywall.html');
  const html = await res.text();
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const fragment = template.content.cloneNode(true);
  const scripts = [...fragment.querySelectorAll('script')].map((script) => {
    const clone = document.createElement('script');
    for (const attr of script.attributes) {
      clone.setAttribute(attr.name, attr.value);
    }
    clone.textContent = script.textContent;
    script.remove();
    return clone;
  });
  document.body.appendChild(fragment);
  for (const script of scripts) {
    document.body.appendChild(script);
  }
  return window.AppBase?.ui || ui || {};
}
export async function bootSingleApp({ config, ui, users, miniapps }) {
  const current = users.getCurrent() || users.ensureAnonymous();
  const lic = await validateLicense(config, current.ref || current.email || 'anon');
  const allowed = lic?.license?.status === 'active';
  const resolvedUI = await ensurePaywall(ui);
  resolvedUI.enterFullscreen?.();
  resolvedUI.hideCatalog?.();
  if (allowed) {
    await miniapps.load(config.miniapp_id);
    const paywall = document.getElementById('paywall');
    if (paywall) paywall.style.display = 'none';
    resolvedUI.toast?.('Licença ativa: ' + (lic.license.plan || 'pro'));
  } else {
    resolvedUI.renderPaywall?.({
      title: 'Ative sua assinatura',
      message: 'Para usar este MiniApp, ative sua licença do plano PRO.',
      onSubscribe: async (email) => {
        const sub = await subscribe(config, email, config.licensing.plan_required, current.ref);
        if (sub?.subscription?.init_point) window.open(sub.subscription.init_point, '_blank');
        else resolvedUI.toast?.('Solicitação enviada. Verifique seu e-mail de cobrança.');
      }
    });
  }
}
