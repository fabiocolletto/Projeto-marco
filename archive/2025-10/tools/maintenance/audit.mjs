#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { analyzeRepository, formatSummaryMarkdown, resolveRepositoryRoot, serializeFindings, summarizeManualStatus } from './lib/analyzer.mjs';

async function run() {
  const rootDir = resolveRepositoryRoot();
  const now = new Date();
  const result = await analyzeRepository(rootDir, { now });
  const reportDir = path.join(rootDir, 'reports', result.reportDate);
  await fs.mkdir(reportDir, { recursive: true });

  const treePath = path.join(reportDir, 'tree.json');
  await fs.writeFile(treePath, JSON.stringify(result.inventory, null, 2));

  const findingsPath = path.join(reportDir, 'findings.json');
  await fs.writeFile(findingsPath, JSON.stringify(serializeFindings(result.findings), null, 2));

  const summaryPath = path.join(reportDir, 'summary.md');
  await fs.writeFile(summaryPath, formatSummaryMarkdown(result));

  const manualStatusPath = path.join(reportDir, 'manuals-status.txt');
  await fs.writeFile(manualStatusPath, summarizeManualStatus(result.manualStatus));

  const linkCheckPath = path.join(reportDir, 'linkcheck.txt');
  const linkLines = result.linkIssues.length === 0
    ? ['Nenhum link relativo quebrado detectado.']
    : result.linkIssues.map((issue) => `${issue.file} -> ${issue.target} (${issue.status})`);
  await fs.writeFile(linkCheckPath, linkLines.join('\n'));

  const eslintPath = path.join(reportDir, 'eslint-unused.txt');
  const eslintLines = result.unusedExports.length === 0
    ? ['Nenhum export não utilizado detectado.']
    : result.unusedExports.map((item) => `${item.file} :: export "${item.export}" não possui importadores`);
  await fs.writeFile(eslintPath, eslintLines.join('\n'));

  const markupPath = path.join(reportDir, 'markup-lint.txt');
  const markupLines = result.markupWarnings.length === 0
    ? ['Nenhum problema estrutural básico detectado.']
    : result.markupWarnings.map((item) => `${item.file} :: ${item.warning}`);
  await fs.writeFile(markupPath, markupLines.join('\n'));

  const registryDiffPath = path.join(reportDir, 'registry-diff.json');
  await fs.writeFile(registryDiffPath, JSON.stringify(result.registryDiff, null, 2));

  console.log(`Relatório gerado em ${reportDir}`);
  console.log(`Total de candidatos: ${result.findings.length}`);
  console.log(`Total de órfãos: ${result.orphans.length}`);
}

run().catch((error) => {
  console.error('Falha na auditoria:', error);
  process.exitCode = 1;
});
