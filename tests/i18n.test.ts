import { describe, expect, it } from 'vitest';
import { InMemoryTelemetryClient } from '../src/telemetry/eventBus.js';
import {
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  UNSUPPORTED_LOCALE_EVENT,
  createTranslator,
  detectLocale,
  mergeDictionaries,
} from '../src/localization/i18n.js';
import type { Locale } from '../src/core/types.js';

describe('localization utilities', () => {
  it('resolves the first supported locale from navigator languages', () => {
    const result = detectLocale({ locales: ['es-AR', 'en-US'] });
    expect(result.locale).toBe('en-US');
    expect(result.fallbackApplied).toBe(false);
  });

  it('falls back to pt-BR and records telemetry on unsupported locales', () => {
    const telemetry = new InMemoryTelemetryClient(() => new Date('2024-01-10T00:00:00Z'));
    const result = detectLocale({
      locales: ['fr-FR'],
      telemetry,
      device: 'iphone-15',
      now: () => new Date('2024-01-10T12:34:56Z'),
    });
    expect(result.locale).toBe(FALLBACK_LOCALE);
    expect(result.fallbackApplied).toBe(true);
    const events = telemetry.drain();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: UNSUPPORTED_LOCALE_EVENT,
      props: {
        localeDetectado: 'fr-FR',
        dispositivo: 'iphone-15',
      },
    });
  });

  it('translates keys and falls back to pt-BR per key', () => {
    const catalog = mergeDictionaries(
      {
        'pt-BR': {
          hello: 'Olá',
          kpi: 'Indicadores',
        },
      },
      {
        'en-US': {
          hello: 'Hello',
        },
      },
    );
    const translate = createTranslator({ catalog });
    expect(translate('hello', 'en-US')).toBe('Hello');
    expect(translate('kpi', 'en-US')).toBe('Indicadores');
    expect(translate('unknown', 'en-US')).toBe('unknown');
  });

  it('exposes the supported locales list for UI bindings', () => {
    expect(new Set(SUPPORTED_LOCALES)).toEqual(new Set(['pt-BR', 'es-419', 'en-US'] satisfies Locale[]));
  });
});
