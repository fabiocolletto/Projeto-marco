import express from 'express';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';
import { z } from 'zod';
import { snapshotStore } from './store.js';
import { providerRegistry } from './providers/index.js';
import { graphqlRoot, graphqlSchema } from './graphql.js';
import type { SyncProvider } from './types.js';

const providerSchema = z.enum(['google', 'microsoft']);

const payloadSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  salt: z.string().min(1),
  iterations: z.number().int().positive(),
});

const snapshotSchema = z.object({
  provider: providerSchema,
  projectId: z.string().min(1),
  deviceId: z.string().min(1),
  hash: z.string().min(1),
  updatedAt: z.number().finite(),
  payload: payloadSchema,
});

const tokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
});

function parseProvider(input: string): SyncProvider {
  return providerSchema.parse(input);
}

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.put('/api/providers/:provider/token', (req, res) => {
    const provider = parseProvider(req.params.provider);
    const token = tokenSchema.parse(req.body);
    providerRegistry.setToken(provider, token);
    res.status(204).end();
  });

  app.post('/api/snapshots', async (req, res) => {
    const input = snapshotSchema.parse(req.body);
    const record = await snapshotStore.upsert(input);
    try {
      await providerRegistry.push(record);
    } catch (error) {
      console.warn('[sync] Falha ao propagar snapshot', error);
    }
    res.status(201).json({ meta: record.meta });
  });

  app.get('/api/snapshots/:provider/:projectId', async (req, res) => {
    try {
      const provider = parseProvider(req.params.provider);
      const projectId = req.params.projectId;
      const cached = await snapshotStore.get(provider, projectId);
      if (cached) {
        return res.json({ meta: cached.meta, payload: cached.payload });
      }
      try {
        const remote = await providerRegistry.pull(provider, projectId);
        if (!remote) {
          return res.status(404).json({ error: 'Snapshot não encontrado' });
        }
        await snapshotStore.upsert({
          provider: remote.meta.provider,
          projectId: remote.meta.projectId,
          deviceId: remote.meta.deviceId,
          hash: remote.meta.hash,
          updatedAt: remote.meta.updatedAt,
          payload: remote.payload,
        });
        return res.json({ meta: remote.meta, payload: remote.payload });
      } catch (error) {
        return res.status(404).json({ error: (error as Error).message });
      }
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  });

  app.use(
    '/graphql',
    graphqlHTTP({
      schema: graphqlSchema,
      rootValue: graphqlRoot,
      graphiql: process.env.NODE_ENV !== 'production',
    })
  );

  return app;
}

export function start() {
  const app = createServer();
  const port = Number(process.env.PORT || 3333);
  app.listen(port, () => {
    console.log(`[sync] API escutando na porta ${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
