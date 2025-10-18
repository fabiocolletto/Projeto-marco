import { DriveStub } from './providers/DriveStub.js';
import { OneDriveStub } from './providers/OneDriveStub.js';

export interface SyncProvider {
  isConfigured(): boolean;
  push(fullBackup: unknown): Promise<{ ok: boolean; rev?: string }>;
  pull(): Promise<{ ok: boolean; backup?: unknown; rev?: string }>;
}

type ProviderKey = 'none' | 'drive' | 'onedrive';

type ProviderFactory = () => SyncProvider;

const factories: Record<Exclude<ProviderKey, 'none'>, ProviderFactory> = {
  drive: () => new DriveStub(),
  onedrive: () => new OneDriveStub(),
};

const resolveEnv = (key: string): string | undefined => {
  const globalRecord = globalThis as Record<string, unknown> & {
    process?: { env?: Record<string, string | undefined> };
  };
  const nodeEnv = globalRecord.process?.env;
  if (nodeEnv && key in nodeEnv) {
    return nodeEnv[key];
  }
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    const value = metaEnv?.[key];
    if (typeof value === 'string') return value;
  } catch (error) {
    // ignore
  }
  if (key in globalRecord) {
    const value = globalRecord[key];
    if (typeof value === 'string') return value;
  }
  return undefined;
};

export const resolveSyncProvider = (provider?: ProviderKey): SyncProvider | undefined => {
  const selected = (provider ?? (resolveEnv('SYNC_PROVIDER') as ProviderKey)) || 'none';
  if (selected === 'none') return undefined;
  const factory = factories[selected];
  return factory ? factory() : undefined;
};
