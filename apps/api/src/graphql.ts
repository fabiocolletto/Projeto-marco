import { buildSchema } from 'graphql';
import { snapshotStore } from './store.js';
import { providerRegistry } from './providers/index.js';
import type { SnapshotInput, SnapshotRecord, SyncProvider } from './types.js';

const schema = buildSchema(`
  enum SyncProvider {
    google
    microsoft
  }

  type SnapshotPayload {
    ciphertext: String!
    iv: String!
    salt: String!
    iterations: Int!
  }

  type SnapshotMeta {
    provider: SyncProvider!
    projectId: String!
    deviceId: String!
    hash: String!
    updatedAt: Float!
    size: Int!
  }

  type Snapshot {
    id: ID!
    meta: SnapshotMeta!
    payload: SnapshotPayload!
    createdAt: Float!
    updatedAt: Float!
  }

  type SnapshotResult {
    meta: SnapshotMeta!
    payload: SnapshotPayload!
  }

  input SnapshotPayloadInput {
    ciphertext: String!
    iv: String!
    salt: String!
    iterations: Int!
  }

  input SnapshotInput {
    provider: SyncProvider!
    projectId: String!
    deviceId: String!
    hash: String!
    updatedAt: Float!
    payload: SnapshotPayloadInput!
  }

  type Query {
    snapshot(provider: SyncProvider!, projectId: String!): SnapshotResult
    snapshots(provider: SyncProvider): [Snapshot!]!
  }

  type Mutation {
    pushSnapshot(input: SnapshotInput!): Snapshot!
  }
`);

interface SnapshotArgs {
  provider: SyncProvider;
  projectId: string;
}

interface SnapshotsArgs {
  provider?: SyncProvider;
}

interface PushArgs {
  input: SnapshotInput;
}

const root = {
  snapshot: async ({ provider, projectId }: SnapshotArgs) => {
    const record = await snapshotStore.get(provider, projectId);
    if (!record) return null;
    return { meta: record.meta, payload: record.payload } satisfies SnapshotRecord;
  },
  snapshots: async ({ provider }: SnapshotsArgs) => {
    const list = await snapshotStore.list(provider);
    return list;
  },
  pushSnapshot: async ({ input }: PushArgs) => {
    const record = await snapshotStore.upsert(input);
    try {
      await providerRegistry.push(record);
    } catch (error) {
      console.warn('[sync] Falha ao propagar snapshot', error);
    }
    return record;
  },
};

export const graphqlSchema = schema;
export const graphqlRoot = root;
