export function canonicalStringify(value) {
  const json = JSON.stringify(value);

  if (json === undefined) {
    throw new TypeError('Cannot stringify value: result is undefined');
  }

  const normalized = JSON.parse(json);
  return canonicalize(normalized);
}

function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalize(item));
    return `[${items.join(',')}]`;
  }

  const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const properties = keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
  return `{${properties.join(',')}}`;
}
