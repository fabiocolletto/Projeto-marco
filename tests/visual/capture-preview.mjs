import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..', '..');
const INDEX_HTML = resolve(ROOT_DIR, 'appbase', 'index.html');
const OUTPUT_DIR = resolve(ROOT_DIR, 'tests', 'artifacts', 'previews');

const VIEWPORT = { width: 1280, height: 720 };
const VARIANTS = [
  { name: 'light', colorScheme: 'light' },
  { name: 'dark', colorScheme: 'dark' },
];

async function ensureOutputDir() {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

async function captureVariant(browser, variant) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: variant.colorScheme,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(INDEX_HTML).toString(), {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('.ac-app', { state: 'visible', timeout: 10_000 });
  await page.evaluate((theme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    window.localStorage.setItem('marco-appbase:theme', theme);
  }, variant.name);
  await page.waitForTimeout(400);
  const fileName = `appbase-${VIEWPORT.width}x${VIEWPORT.height}-${variant.name}.png`;
  await page.screenshot({
    path: join(OUTPUT_DIR, fileName),
    fullPage: true,
  });
  await context.close();
  return fileName;
}

async function main() {
  await ensureOutputDir();
  const browser = await chromium.launch();
  try {
    const results = [];
    for (const variant of VARIANTS) {
      const fileName = await captureVariant(browser, variant);
      results.push({ variant: variant.name, fileName });
      console.log(`✅ Captured ${variant.name} preview at ${fileName}`);
    }
    console.log('\nPreview capture complete. Files stored in:', OUTPUT_DIR);
    return results;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Failed to capture previews:', error);
  process.exitCode = 1;
});
