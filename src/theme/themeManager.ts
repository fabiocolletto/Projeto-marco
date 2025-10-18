export type ThemeMode = 'light' | 'dark';

export interface ThemeDetectionOptions {
  readonly seguirSistema: boolean;
  readonly temaPreferido: ThemeMode;
  readonly systemTheme?: ThemeMode;
}

export const detectInitialTheme = ({
  seguirSistema,
  temaPreferido,
  systemTheme = 'light',
}: ThemeDetectionOptions): ThemeMode => {
  return seguirSistema ? systemTheme : temaPreferido;
};

export interface ThemeApplierOptions {
  readonly theme: ThemeMode;
  readonly document?: Document;
}

const COLOR_SCHEME_META = 'color-scheme';

export const applyTheme = ({ theme, document = globalThis.document }: ThemeApplierOptions): void => {
  if (!document) return;
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

export type SystemThemeListener = (theme: ThemeMode) => void;

export interface SystemThemeObserverOptions {
  readonly document?: Document;
  readonly onChange: SystemThemeListener;
}

export const observeSystemTheme = ({
  document = globalThis.document,
  onChange,
}: SystemThemeObserverOptions): (() => void) | undefined => {
  if (!document?.defaultView?.matchMedia) {
    return undefined;
  }
  const media = document.defaultView.matchMedia('(prefers-color-scheme: dark)');
  const handler = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light');
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
};
