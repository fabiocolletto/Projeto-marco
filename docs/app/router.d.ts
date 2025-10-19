type RouteMode = 'catalog' | 'setupMaster' | 'loginMaster';
export declare const isAuthRoute: (hash: string) => boolean;
export declare function getSelectedAppId(): string | null;
export declare function setSelectedAppId(id: string | null): void;
export declare function getRouteMode(): RouteMode;
export declare function setRouteMode(mode: RouteMode): void;
export declare function applyRouteFromLocation(): void;
export declare function setRouteForSelection(id: string | null): void;
export declare function getStoredSelectedAppId(): string | null;
export declare function clearStoredSelectedAppId(): void;
export {};
//# sourceMappingURL=router.d.ts.map