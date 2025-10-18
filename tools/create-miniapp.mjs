#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function toTitleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function applyTemplatePlaceholders(content, replacements) {
  let output = content;
  for (const [search, replacement] of replacements) {
    output = output.replaceAll(search, replacement);
  }
  return output;
}

async function pathExists(candidate) {
  try {
    await fs.stat(candidate);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

const id = (process.argv[2] || "").trim();
if (!id) {
  console.error("Uso: npm run miniapp:create <id-kebab>");
  process.exit(1);
}

const base = path.resolve("miniapps", id);
if (await pathExists(base)) {
  console.error(`MiniApp já existe: ${id}`);
  process.exit(1);
}

const tplDir = path.resolve("appbase/templates/miniapp-structure");
const manifestTplPath = path.resolve("appbase/templates/miniapp-manifest.template.json");
const displayName = toTitleCase(id) || id;
const replacements = new Map([
  ["<id-kebab>", id],
  ["<Nome PT>", displayName],
  ["<Name EN>", displayName],
  ["<Nombre ES>", displayName]
]);

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const source = path.join(src, entry.name);
    const target = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(source, target);
      continue;
    }
    if (entry.name === "manifest.json") {
      // Manifest is generated from the dedicated template.
      continue;
    }
    const content = await fs.readFile(source, "utf8").catch(() => null);
    if (content === null) {
      const buffer = await fs.readFile(source);
      await fs.writeFile(target, buffer);
      continue;
    }
    const updated = applyTemplatePlaceholders(content, replacements);
    await fs.writeFile(target, updated, "utf8");
  }
}

await copyDir(tplDir, base);

const manifestTemplate = await fs.readFile(manifestTplPath, "utf8");
const manifestContent = applyTemplatePlaceholders(manifestTemplate, replacements);
const manifestPath = path.join(base, "manifest.json");
await fs.writeFile(manifestPath, manifestContent, "utf8");

const regPath = path.resolve("appbase/market/registry.json");
const regRaw = await fs.readFile(regPath, "utf8").catch(() => "{\n  \"apps\": []\n}");
const reg = JSON.parse(regRaw);
const registryEntry = {
  id,
  name: {
    "pt-BR": displayName,
    "en-US": displayName,
    "es-419": displayName
  },
  icon: `/miniapps/${id}/icon-128.png`,
  summary: "MiniApp gerado via scaffold",
  entry: `/miniapps/${id}/index.js`
};

if (!Array.isArray(reg.apps)) {
  reg.apps = [];
}

const existingIndex = reg.apps.findIndex(app => app.id === id);
if (existingIndex >= 0) {
  reg.apps.splice(existingIndex, 1, registryEntry);
} else {
  reg.apps.push(registryEntry);
}

await fs.writeFile(regPath, `${JSON.stringify(reg, null, 2)}\n`, "utf8");

console.log(`✅ MiniApp criado e registrado: ${id}`);
