export type ThemeMode = 'light' | 'dark';
export interface ThemeDetectionOptions {
    readonly seguirSistema: boolean;
    readonly temaPreferido: ThemeMode;
    readonly systemTheme?: ThemeMode;
}
export declare const detectInitialTheme: ({ seguirSistema, temaPreferido, systemTheme, }: ThemeDetectionOptions) => ThemeMode;
export interface ThemeApplierOptions {
    readonly theme: ThemeMode;
    readonly document?: Document;
}
export declare const applyTheme: ({ theme, document }: ThemeApplierOptions) => void;
export type SystemThemeListener = (theme: ThemeMode) => void;
export interface SystemThemeObserverOptions {
    readonly document?: Document;
    readonly onChange: SystemThemeListener;
}
export declare const observeSystemTheme: ({ document, onChange, }: SystemThemeObserverOptions) => (() => void) | undefined;
//# sourceMappingURL=themeManager.d.ts.map