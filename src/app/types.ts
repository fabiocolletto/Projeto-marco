export interface AppConfig {
  readonly publicAdmin: boolean;
  readonly baseHref: string;
}

export interface RegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly adminOnly?: boolean;
  readonly visible?: boolean;
}

export interface MiniAppManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly entry?: string;
  readonly adminOnly?: boolean;
  readonly visible?: boolean;
}

export interface ManifestCacheEntry {
  readonly manifest: MiniAppManifest;
  readonly entryUrl: string;
}
