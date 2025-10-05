export function createTemplateModule(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('createTemplateModule requer um objeto de configuração válido.');
  }

  const key = config.key;
  if (!key) {
    throw new Error('createTemplateModule requer a propriedade "key".');
  }

  const meta = {
    key,
    id: config.id ?? key,
    card: { ...(config.card ?? {}) },
    badges: Array.isArray(config.badges) ? [...config.badges] : [],
    badgeKeys: Array.isArray(config.badgeKeys) ? [...config.badgeKeys] : [],
    panel: { ...(config.panel ?? {}) },
    marketplace: config.marketplace ? { ...config.marketplace } : null,
  };

  return {
    key,
    meta,
    init(container, context = {}) {
      if (!container) {
        return;
      }

      const templateId = meta.panel?.template;
      const uiContext = context.ui ?? {};
      const applyTranslations = typeof uiContext.applyTranslations === 'function' ? uiContext.applyTranslations : null;
      const translateWithFallback =
        typeof uiContext.translateWithFallback === 'function' ? uiContext.translateWithFallback : null;
      const translate = typeof uiContext.translate === 'function' ? uiContext.translate : null;

      if (templateId) {
        const template = document.getElementById(templateId);
        if (template) {
          container.appendChild(template.content.cloneNode(true));
          if (applyTranslations) {
            applyTranslations(container);
          }
        }
      }

      if (!container.hasChildNodes()) {
        const resolvedLabel =
          (translateWithFallback && translateWithFallback(meta.card?.labelKey, meta.card?.label ?? '')) ||
          (translate && meta.card?.labelKey
            ? (() => {
                const value = translate(meta.card.labelKey, {});
                return value !== meta.card.labelKey ? value : null;
              })()
            : null) ||
          meta.card?.label ||
          meta.key;

        const fallbackText =
          (translateWithFallback &&
            translateWithFallback(
              'panel.placeholder.default',
              `Selecione um mini-app para ${resolvedLabel}`,
              { label: resolvedLabel },
            )) ||
          (translate
            ? (() => {
                const value = translate('panel.placeholder.default', { label: resolvedLabel });
                return value !== 'panel.placeholder.default' ? value : null;
              })()
            : null) ||
          `Selecione um mini-app para ${resolvedLabel}`;

        const fallback = document.createElement('p');
        fallback.className = 'panel-note';
        fallback.textContent = fallbackText;
        container.appendChild(fallback);
      }
    },
  };
}
