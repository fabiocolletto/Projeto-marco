import type { ProviderClient, ProviderToken, SnapshotRecord, SyncProvider } from '../types.js';
import { GoogleDriveClient } from './google.js';
import { MicrosoftDriveClient } from './microsoft.js';

class ProviderRegistry {
  private clients: Record<SyncProvider, ProviderClient> = {
    google: new GoogleDriveClient(),
    microsoft: new MicrosoftDriveClient(),
  };

  private tokens = new Map<SyncProvider, ProviderToken>();

  setToken(provider: SyncProvider, token: ProviderToken): void {
    this.tokens.set(provider, token);
  }

  getToken(provider: SyncProvider): ProviderToken | undefined {
    return this.tokens.get(provider);
  }

  async push(record: SnapshotRecord): Promise<void> {
    const token = this.tokens.get(record.meta.provider);
    if (!token) {
      throw new Error(`Token ausente para provedor ${record.meta.provider}`);
    }
    await this.clients[record.meta.provider].push(record, token);
  }

  async pull(provider: SyncProvider, projectId: string): Promise<SnapshotRecord | null> {
    const token = this.tokens.get(provider);
    if (!token) {
      throw new Error(`Token ausente para provedor ${provider}`);
    }
    return this.clients[provider].pull(projectId, token);
  }
}

export const providerRegistry = new ProviderRegistry();
