#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const id = (process.argv[2] || "").trim();
if (!id) {
  console.error("Uso: npm run miniapp:create <id-kebab>");
  process.exit(1);
}

const base = path.resolve("miniapps", id);
const tplDir = path.resolve("appbase/templates/miniapp-structure");
await fs.mkdir(base, { recursive: true });

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const source = path.join(src, entry.name);
    const target = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(source, target);
    } else {
      const content = await fs.readFile(source).catch(() => null);
      if (content && entry.name === "manifest.json") {
        const text = content
          .toString("utf8")
          .replaceAll("<id-kebab>", id)
          .replace("<Nome PT>", id)
          .replace("<Name EN>", id)
          .replace("<Nombre ES>", id);
        await fs.writeFile(target, text);
      } else if (content) {
        await fs.writeFile(target, content);
      }
    }
  }
}

await copyDir(tplDir, base);

const regPath = path.resolve("appbase/market/registry.json");
const regRaw = await fs.readFile(regPath, "utf8").catch(() => "{\"apps\":[]}");
const reg = JSON.parse(regRaw);
if (!reg.apps.find(app => app.id === id)) {
  reg.apps.push({
    id,
    name: { "pt-BR": id, "en-US": id, "es-419": id },
    icon: `/miniapps/${id}/icon-128.png`,
    summary: "MiniApp gerado via scaffold",
    entry: `/miniapps/${id}/index.js`
  });
  await fs.writeFile(regPath, JSON.stringify(reg, null, 2));
}

console.log(`✅ MiniApp criado e registrado: ${id}`);
