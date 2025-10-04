const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const weddingFixturePath = resolve(__dirname, 'data', 'casamento-evento.json');

/** @type {import('./types.js').WeddingFixture | null} */
let cachedWedding = null;

async function loadWeddingFixture() {
  if (cachedWedding) {
    return cachedWedding;
  }

  const raw = await readFile(weddingFixturePath, 'utf-8');
  cachedWedding = JSON.parse(raw);
  return cachedWedding;
}

module.exports = {
  loadWeddingFixture,
};
