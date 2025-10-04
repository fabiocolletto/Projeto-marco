import rawManifest from './manifest.config.json';
import { mergeManifest } from './logic.js';
import type { AppId, AppManifest, AppManifestEntry } from './types';

const baseList = (rawManifest as AppManifestEntry[]).map((entry) => ({ ...entry }));
const normalized = mergeManifest(baseList);

export const manifestList: AppManifestEntry[] = normalized.list;
export const manifest: AppManifest = normalized.map;

export type { AppId, AppManifest, AppManifestEntry };

export default manifest;
