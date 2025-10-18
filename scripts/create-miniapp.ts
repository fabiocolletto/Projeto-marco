import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface MiniAppOptions {
  admin: boolean;
  visible: boolean;
}

interface RegistryEntry {
  id: string;
  name: string;
  path: string;
  adminOnly: boolean;
  visible: boolean;
}

interface RegistryFile {
  miniapps: RegistryEntry[];
  updatedAt: string;
  version?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MINIAPPS_DIR = path.join(ROOT, 'miniapps');
const REGISTRY_PATH = path.join(MINIAPPS_DIR, 'registry.json');
const TEMPLATE_DIR = path.join(ROOT, 'templates', 'miniapp');

const parseArgs = (argv: string[]): { name: string; options: MiniAppOptions } => {
  if (argv.length === 0) {
    console.error('Uso: npm run create:miniapp MiniAppNome [-- --admin=false --visible=true]');
    process.exit(1);
  }
  const [name, ...rest] = argv;
  const options: MiniAppOptions = { admin: false, visible: true };
  for (const arg of rest) {
    if (!arg.startsWith('--')) continue;
    const [key, raw] = arg.slice(2).split('=');
    if (key === 'admin') options.admin = raw !== 'false';
    if (key === 'visible') options.visible = raw !== 'false';
  }
  return { name, options };
};

const toSlug = (name: string): string => {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
};

const toTitle = (name: string): string => {
  const slug = toSlug(name);
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const ensureDir = async (target: string) => {
  await mkdir(target, { recursive: true });
};

const readTemplate = async (file: string): Promise<string> => {
  const absolute = path.join(TEMPLATE_DIR, file);
  return readFile(absolute, 'utf-8');
};

const renderTemplate = (template: string, context: Record<string, string>): string => {
  return template.replace(/{{(\w+)}}/g, (_, key: string) => context[key] ?? '');
};

const loadRegistry = async (): Promise<RegistryFile> => {
  try {
    const raw = await readFile(REGISTRY_PATH, 'utf-8');
    return JSON.parse(raw) as RegistryFile;
  } catch (error) {
    return { miniapps: [], updatedAt: new Date().toISOString(), version: '1.0.0' };
  }
};

const saveRegistry = async (registry: RegistryFile): Promise<void> => {
  const payload = JSON.stringify(
    {
      ...registry,
      miniapps: registry.miniapps
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
      updatedAt: new Date().toISOString(),
      version: registry.version ?? '1.0.0',
    },
    null,
    2,
  );
  await writeFile(REGISTRY_PATH, `${payload}\n`, 'utf-8');
};

const createMiniAppFiles = async (
  targetDir: string,
  context: Record<string, string>,
  options: MiniAppOptions,
): Promise<void> => {
  await ensureDir(targetDir);
  const files: Array<[string, string]> = [
    ['index.html', await readTemplate('index.html')],
    ['main.js', await readTemplate('main.js')],
    ['manifest.json', await readTemplate('manifest.json')],
  ];

  for (const [file, template] of files) {
    const content = renderTemplate(template, {
      ...context,
      ADMIN_ONLY: String(options.admin),
      VISIBLE: String(options.visible),
    });
    await writeFile(path.join(targetDir, file), `${content}\n`, 'utf-8');
  }

  const locales = ['pt-br', 'en-us', 'es-419'];
  for (const locale of locales) {
    const template = await readTemplate(path.join('i18n', `${locale}.json`));
    const dir = path.join(targetDir, 'i18n');
    await ensureDir(dir);
    await writeFile(path.join(dir, `${locale}.json`), `${template}\n`, 'utf-8');
  }
};

export const createMiniApp = async (
  name: string,
  options: MiniAppOptions,
): Promise<void> => {
  const slug = toSlug(name);
  const displayName = toTitle(name);
  const id = `miniapp-${slug}`;
  const targetDir = path.join(MINIAPPS_DIR, name);

  try {
    await access(path.join(targetDir, 'manifest.json'));
    console.log(`MiniApp ${name} já existe, nenhum arquivo alterado.`);
    return;
  } catch (error) {
    // continue
  }

  const registry = await loadRegistry();
  if (registry.miniapps.some((entry) => entry.id === id)) {
    console.error(`MiniApp com id "${id}" já existe no registry.`);
    process.exit(1);
  }

  const context = {
    ID: id,
    TITLE: displayName,
    SLUG: slug,
  };

  await createMiniAppFiles(targetDir, context, options);

  registry.miniapps.push({
    id,
    name: displayName,
    path: path.relative(ROOT, path.join(targetDir, 'manifest.json')),
    adminOnly: options.admin,
    visible: options.visible,
  });

  await saveRegistry(registry);
  console.log(`MiniApp ${displayName} criada em ${targetDir}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , ...args] = process.argv;
  const { name, options } = parseArgs(args);
  createMiniApp(name, options).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
