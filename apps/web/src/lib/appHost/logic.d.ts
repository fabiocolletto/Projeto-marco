import type {
  AppId,
  AppManifest,
  AppManifestEntry,
  AppManifestOverrides,
} from './types';
import type { ComponentType } from 'svelte';

export interface MergeManifestResult {
  list: AppManifestEntry[];
  map: AppManifest;
}

export declare function mergeManifest(
  baseList: readonly AppManifestEntry[],
  overrides?: Partial<AppManifest | AppManifestOverrides>,
): MergeManifestResult;

export declare function resolveActiveId(
  candidate: AppId | null | undefined,
  map: AppManifest,
  list: readonly AppManifestEntry[],
): AppId | null;

export declare function loadVertical<T>(
  entry: AppManifestEntry,
  importer: (loader: string) => Promise<T>,
): Promise<ComponentType>;
