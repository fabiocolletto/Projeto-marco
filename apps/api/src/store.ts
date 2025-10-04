import { randomUUID } from 'node:crypto';
import type { SnapshotInput, SnapshotRecord, SyncProvider } from './types.js';

export class SnapshotStore {
  private records = new Map<string, SnapshotRecord>();

  private key(provider: SyncProvider, projectId: string): string {
    return `${provider}:${projectId}`;
  }

  async upsert(input: SnapshotInput): Promise<SnapshotRecord> {
    const now = Date.now();
    const key = this.key(input.provider, input.projectId);
    const size = input.payload.ciphertext.length + input.payload.iv.length;
    const record: SnapshotRecord = {
      id: this.records.get(key)?.id ?? randomUUID(),
      payload: input.payload,
      meta: {
        provider: input.provider,
        projectId: input.projectId,
        deviceId: input.deviceId,
        hash: input.hash,
        updatedAt: input.updatedAt,
        size,
      },
      createdAt: this.records.get(key)?.createdAt ?? now,
      updatedAt: now,
    };
    this.records.set(key, record);
    return record;
  }

  async get(provider: SyncProvider, projectId: string): Promise<SnapshotRecord | null> {
    const record = this.records.get(this.key(provider, projectId));
    if (!record) return null;
    return record;
  }

  async list(provider?: SyncProvider): Promise<SnapshotRecord[]> {
    return [...this.records.values()].filter((item) => (provider ? item.meta.provider === provider : true));
  }
}

export const snapshotStore = new SnapshotStore();
