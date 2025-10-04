const { equal, match, ok } = await import('node:assert/strict');
import test from 'node:test';

import manifestConfig from '../../apps/web/src/lib/appHost/manifest.config.json' with { type: 'json' };
import { loadVertical, mergeManifest, resolveActiveId } from '../../apps/web/src/lib/appHost/logic.js';

const baseList = manifestConfig;

function createEntry(id = 'evento') {
  const fromManifest = baseList.find((item) => item.id === id);
  if (!fromManifest) {
    return {
      id,
      label: 'Demo',
      icon: '✨',
      loader: './demo',
      requires: [],
    };
  }
  return { ...fromManifest };
}

test('mergeManifest combina overrides e adiciona novas verticais', () => {
  const overrides = {
    evento: {
      label: 'Eventos atualizados',
      requires: ['projectData'],
    },
    extra: {
      id: 'extra',
      label: 'Extra',
      icon: '➕',
      loader: './extra.svelte',
      requires: [],
    },
  };

  const { list, map } = mergeManifest(baseList, overrides);

  const evento = list.find((item) => item.id === 'evento');
  ok(evento);
  equal(evento.label, 'Eventos atualizados');
  ok(evento.requires.includes('projectData'));

  const extra = list.find((item) => item.id === 'extra');
  ok(extra);
  equal(extra.icon, '➕');
  equal(map.extra.label, 'Extra');
});

test('resolveActiveId aplica fallback para ids desconhecidos', () => {
  const { list, map } = mergeManifest(baseList);
  const firstId = list[0]?.id ?? null;

  equal(resolveActiveId('evento', map, list), 'evento');
  equal(resolveActiveId('desconhecido', map, list), firstId);
  equal(resolveActiveId(null, map, list), firstId);
});

test('loadVertical aceita default export', async () => {
  const entry = createEntry('evento');
  const component = await loadVertical(entry, async (loader) => {
    equal(loader, entry.loader);
    return { default: () => 'ok' };
  });

  equal(typeof component, 'function');
  equal(component(), 'ok');
});

test('loadVertical aceita export nomeado', async () => {
  const entry = createEntry('overview');
  const component = await loadVertical(entry, async () => ({ Overview: () => 'overview' }));
  equal(component(), 'overview');
});

test('loadVertical normaliza erros de importação', async () => {
  const entry = createEntry('tarefas');
  const error = await loadVertical(entry, async () => {
    throw new Error('arquivo ausente');
  }).catch((err) => err);

  ok(error instanceof Error);
  equal(error.name, 'AppHostLoadError');
  match(error.message, /tarefas/);
  ok(error.cause instanceof Error);
});

test('loadVertical falha quando nenhum componente é exportado', async () => {
  const entry = createEntry('mensagens');
  const error = await loadVertical(entry, async () => ({ default: 'não é função' })).catch((err) => err);
  ok(error instanceof Error);
  equal(error.name, 'AppHostLoadError');
  match(error.message, /mensagens/);
});
