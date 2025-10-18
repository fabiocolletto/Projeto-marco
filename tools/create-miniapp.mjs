#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const id = (process.argv[2] || "").trim();
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error("Uso: npm run miniapp:create <id-kebab> (ex.: compras-supermercado)");
  process.exit(1);
}
const base = path.resolve("miniapps", id);
const tplDir = path.resolve("appbase/templates/miniapp-structure");

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else {
      let c = await fs.readFile(s, "utf8").catch(() => null);
      if (c && e.name === "manifest.json") {
        c = c
          .replaceAll("<id-kebab>", id)
          .replace("<Nome PT>", id)
          .replace("<Name EN>", id)
          .replace("<Nombre ES>", id);
      }
      await fs.writeFile(d, c ?? await fs.readFile(s));
    }
  }
}

await copyDir(tplDir, base);

// Atualiza registry
const regPath = path.resolve("appbase/market/registry.json");
const reg = JSON.parse(await fs.readFile(regPath, "utf8").catch(() => `{"apps":[]}`));
if (!reg.apps.find(a => a.id === id)) {
  reg.apps.push({
    id,
    name: { "pt-BR": id, "en-US": id, "es-419": id },
    icon: `/miniapps/${id}/icon-128.png`,
    summary: "MiniApp gerado via scaffold",
    entry: `/miniapps/${id}/index.js`
  });
  await fs.writeFile(regPath, JSON.stringify(reg, null, 2));
  console.log(`📦 Registrado no Market: ${id}`);
} else {
  console.log(`ℹ Já existe no Market: ${id}`);
}

console.log(`✅ MiniApp criado em miniapps/${id}`);
