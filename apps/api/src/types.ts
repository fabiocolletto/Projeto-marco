export type SyncProvider = 'google' | 'microsoft';

export interface ProviderToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface SnapshotPayload {
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
}

export interface SnapshotMetadata {
  provider: SyncProvider;
  projectId: string;
  deviceId: string;
  hash: string;
  updatedAt: number;
  size: number;
}

export interface SnapshotRecord {
  id: string;
  payload: SnapshotPayload;
  meta: SnapshotMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface SnapshotInput {
  provider: SyncProvider;
  projectId: string;
  deviceId: string;
  payload: SnapshotPayload;
  hash: string;
  updatedAt: number;
}

export interface ProviderClient {
  push(record: SnapshotRecord, token: ProviderToken): Promise<void>;
  pull(projectId: string, token: ProviderToken): Promise<SnapshotRecord | null>;
}
