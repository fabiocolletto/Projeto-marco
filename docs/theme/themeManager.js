export const detectInitialTheme = ({ seguirSistema, temaPreferido, systemTheme = 'light', }) => {
    return seguirSistema ? systemTheme : temaPreferido;
};
const COLOR_SCHEME_META = 'color-scheme';
export const applyTheme = ({ theme, document = globalThis.document }) => {
    if (!document)
        return;
    const root = document.documentElement;
    root.classList.remove(theme === 'dark' ? 'theme-light' : 'theme-dark');
    root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    let meta = document.querySelector(`meta[name="${COLOR_SCHEME_META}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', COLOR_SCHEME_META);
        document.head.prepend(meta);
    }
    meta.setAttribute('content', theme);
};
export const observeSystemTheme = ({ document = globalThis.document, onChange, }) => {
    if (!document?.defaultView?.matchMedia) {
        return undefined;
    }
    const media = document.defaultView.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => onChange(event.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
};
//# sourceMappingURL=themeManager.js.map