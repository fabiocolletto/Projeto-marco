import { fetchFeatureFlags } from './data-sources.js';

export const flags = { demo: true };

export async function loadFeatureFlags(){
  const result = await fetchFeatureFlags();
  if (!Array.isArray(result) || !result.length) {
    return flags;
  }

  result.forEach(flag => {
    flags[flag.key] = flag.enabled;
  });
  return flags;
}
