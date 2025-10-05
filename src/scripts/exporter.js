export const COMMON_EXPORT_EXCLUDE_KEYS = [
  'shared.backToHome',
  'operations.actions.export',
  'tasks.actions.export',
  'tasks.actions.create',
  'account.actions.export',
  'account.actions.magicLink',
  'account.actions.unlink',
  'market.actions.refresh',
  'market.actions.viewLicenses',
  'config.actions.export',
  'config.actions.audit',
];

export const exportRegistry = {
  'mini-app-painel': {
    title: 'Marco · Painel de Operações',
    titleKey: 'export.operations.title',
    subtitle: 'Mini-app • Painel de Operações',
    subtitleKey: 'export.operations.subtitle',
    description: 'Resumo do painel operacional com masters e áreas de expansão.',
    descriptionKey: 'export.operations.description',
    fileName: 'painel-operacoes',
    shortLabel: 'Painel de Operações',
    shortLabelKey: 'miniapps.operations.label',
    headings: ['KPIs do sistema', 'Dados / Resumos', 'Outros painéis', 'Área p/ expandir'],
    headingKeys: [
      'export.operations.heading1',
      'export.operations.heading2',
      'export.operations.heading3',
      'export.operations.heading4',
    ],
    excludedKeys: ['operations.header.title', 'operations.note'],
  },
  'mini-app-tarefas': {
    title: 'Marco · Gestor de Tarefas',
    titleKey: 'export.tasks.title',
    subtitle: 'Mini-app • Gestor de Tarefas',
    subtitleKey: 'export.tasks.subtitle',
    description: 'Exportação da visão de tarefas, filtros ativos e dicas do sistema.',
    descriptionKey: 'export.tasks.description',
    fileName: 'gestor-tarefas',
    shortLabel: 'Gestor de Tarefas',
    shortLabelKey: 'miniapps.tasks.label',
    headings: ['Mini-app • Gestor de Tarefas', 'Dicas do sistema'],
    headingKeys: ['export.tasks.heading1', 'export.tasks.heading2'],
    excludedKeys: ['tasks.header.title'],
  },
  'mini-app-conta': {
    title: 'Marco · Conta & Backup',
    titleKey: 'export.account.title',
    subtitle: 'Mini-app • Conta & Backup',
    subtitleKey: 'export.account.subtitle',
    description: 'Detalhes de identidade, dispositivos ativos e storage sincronizado.',
    descriptionKey: 'export.account.description',
    fileName: 'conta-backup',
    shortLabel: 'Conta & Backup',
    shortLabelKey: 'miniapps.account.label',
    headings: [
      'Identidade & Sessão',
      'Backup & Storage',
      'Dispositivos ativos',
      'Livro-razão de conformidade',
      'Direitos do titular prontos para 1 clique',
    ],
    headingKeys: [
      'export.account.heading1',
      'export.account.heading2',
      'export.account.heading3',
      'export.account.heading4',
      'export.account.heading5',
    ],
    excludedKeys: ['account.header.title'],
  },
  'mini-app-config': {
    title: 'Marco · Configuração & Operação',
    titleKey: 'export.config.title',
    subtitle: 'Mini-app • Configuração & Operação',
    subtitleKey: 'export.config.subtitle',
    description: 'Snapshot da configuração resolvida e eventos de observabilidade.',
    descriptionKey: 'export.config.description',
    fileName: 'config-operacao',
    shortLabel: 'Configuração & Operação',
    shortLabelKey: 'miniapps.settings.label',
    headings: ['Configuração resolvida', 'Checklist LGPD-first', 'Observabilidade'],
    headingKeys: [
      'export.config.heading1',
      'export.config.heading2',
      'export.config.heading3',
    ],
    excludedKeys: ['config.header.title'],
  },
};

const PRINT_CLEANUP_DELAY = 600;

export async function exportSection(section, config) {
  if (!section) {
    throw new Error('Seção inexistente para exportação');
  }
  const exportDate = new Date();
  const structure = buildExportStructure(section, config, exportDate);
  const entries = mapItemsToEntries(structure);
  const pdfBytes = generateSimplePdf(entries);
  const fileTimestamp = createFileTimestamp(exportDate);
  const fileName = `${config.fileName ?? 'marco-export'}-${fileTimestamp}.pdf`;
  const supportsFile = typeof File === 'function';
  const pdfBlob = supportsFile
    ? new File([pdfBytes], fileName, { type: 'application/pdf' })
    : new Blob([pdfBytes], { type: 'application/pdf' });
  triggerDownload(pdfBlob, fileName);

  let shared = false;
  if (supportsFile && typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      if (navigator.canShare({ files: [pdfBlob] })) {
        await navigator.share({
          files: [pdfBlob],
          title: config.title,
          text: 'Exportação gerada no Sistema Operacional Marco.',
        });
        shared = true;
      }
    } catch (error) {
      if (!error || error.name !== 'AbortError') {
        console.warn('Compartilhamento não concluído', error);
      }
    }
  }

  return { blob: pdfBlob, fileName, exportDate, shared };
}

export function buildExportStructure(section, config, exportDate) {
  const structure = [{ type: 'title', text: config.title }];
  const subtitle = config.subtitle ?? section.querySelector('header h2')?.textContent?.trim() ?? null;
  if (subtitle) {
    structure.push({ type: 'subtitle', text: subtitle });
  }
  structure.push({ type: 'meta', text: `Gerado em: ${formatFullTimestamp(exportDate)}` });
  if (config.description) {
    structure.push({ type: 'meta', text: config.description });
  }
  structure.push({ type: 'spacer' });
  extractSectionLines(section, config).forEach((item) => structure.push(item));
  return structure;
}

export function extractSectionLines(section, config) {
  const excludes = new Set(config.excluded ?? []);
  const ignoreContains = config.ignorePhrases ?? [];
  const rawLines = section.innerText.split('\n').map((line) => line.trim());
  const items = [];
  let previousContent = '';
  rawLines.forEach((line) => {
    if (!line) {
      if (items.length && items[items.length - 1].type !== 'spacer') {
        items.push({ type: 'spacer' });
      }
      previousContent = '';
      return;
    }
    if (excludes.has(line)) {
      return;
    }
    if (ignoreContains.some((phrase) => line.includes(phrase))) {
      return;
    }
    const normalized = line.replace(/\s+/g, ' ').trim();
    if (!normalized || normalized === previousContent) {
      return;
    }
    if (config.headings?.includes(normalized)) {
      if (!items.length || items[items.length - 1].type !== 'spacer') {
        items.push({ type: 'spacer' });
      }
      items.push({ type: 'heading', text: normalized });
      items.push({ type: 'spacer' });
      previousContent = '';
      return;
    }
    if (/^[-•]/.test(normalized)) {
      items.push({ type: 'list', text: normalized.replace(/^[-•]\s*/, '') });
    } else {
      items.push({ type: 'text', text: normalized });
    }
    previousContent = normalized;
  });
  while (items.length && items[items.length - 1].type === 'spacer') {
    items.pop();
  }
  return items;
}

function mapItemsToEntries(items) {
  const entries = [];
  items.forEach((item) => {
    switch (item.type) {
      case 'title':
        entries.push({ text: item.text, fontSize: 18, leading: 28, indent: 0 });
        break;
      case 'subtitle':
        entries.push({ text: item.text, fontSize: 12, leading: 20, indent: 0 });
        break;
      case 'meta':
        entries.push({ text: item.text, fontSize: 10, leading: 16, indent: 0 });
        break;
      case 'heading':
        entries.push({ text: item.text, fontSize: 13, leading: 22, indent: 0 });
        break;
      case 'list':
        entries.push({ text: item.text, fontSize: 11, leading: 18, indent: 20, prefix: '-' });
        break;
      case 'spacer':
        entries.push({ text: '', fontSize: 11, leading: 14, indent: 0 });
        break;
      default:
        entries.push({ text: item.text, fontSize: 11, leading: 18, indent: 0 });
        break;
    }
  });
  return entries;
}

function generateSimplePdf(entries) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 56;
  const startY = pageHeight - margin;
  const pages = [];
  let currentPage = [];
  let cursorY = startY;

  entries.forEach((entry) => {
    const fontSize = entry.fontSize ?? 12;
    const leading = entry.leading ?? Math.round(fontSize * 1.35);
    const indent = entry.indent ?? 0;
    const prefix = entry.prefix ?? '';
    if (!entry.text) {
      if (cursorY - leading < margin && currentPage.length) {
        pages.push(currentPage);
        currentPage = [];
        cursorY = startY;
      }
      cursorY -= leading;
      currentPage.push({ text: '', fontSize, indent, prefix: '', leading, y: cursorY });
      return;
    }
    const availableWidth = pageWidth - margin * 2 - indent;
    const maxChars = Math.max(16, Math.floor(availableWidth / (fontSize * 0.55)));
    const wrapped = wrapTextForPdf(entry.text, maxChars);
    wrapped.forEach((line, index) => {
      if (cursorY - leading < margin && currentPage.length) {
        pages.push(currentPage);
        currentPage = [];
        cursorY = startY;
      }
      cursorY -= leading;
      currentPage.push({
        text: line,
        fontSize,
        indent,
        prefix: index === 0 ? prefix : '',
        leading,
        y: cursorY,
      });
    });
  });

  if (currentPage.length || !pages.length) {
    pages.push(currentPage);
  }

  const objects = [];
  const pageIds = [];
  const contentIds = [];
  pages.forEach((_, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    contentIds.push(contentId);
  });
  const kidsList = pageIds.map((id) => `${id} 0 R`).join(' ');
  objects.push({ id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' });
  objects.push({ id: 2, body: `<< /Type /Pages /Kids [${kidsList}] /Count ${pages.length} >>` });
  objects.push({ id: 3, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });

  const textEncoder = new TextEncoder();
  pages.forEach((lines, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];
    const contentParts = ['BT'];
    let currentFontSize = null;
    lines.forEach((line) => {
      if (!line.text && !line.prefix) {
        return;
      }
      const fontSize = line.fontSize ?? 12;
      if (currentFontSize !== fontSize) {
        contentParts.push(`/F1 ${fontSize.toFixed(2)} Tf`);
        currentFontSize = fontSize;
      }
      const y = line.y.toFixed(2);
      if (line.prefix) {
        const prefixText = escapePdfText(line.prefix === '•' ? '-' : line.prefix);
        contentParts.push(`1 0 0 1 ${margin.toFixed(2)} ${y} Tm (${prefixText}) Tj`);
      }
      if (line.text) {
        const x = (margin + line.indent).toFixed(2);
        const content = escapePdfText(line.text);
        contentParts.push(`1 0 0 1 ${x} ${y} Tm (${content}) Tj`);
      }
    });
    contentParts.push('ET');
    const contentString = contentParts.join('\n');
    const contentBytes = textEncoder.encode(contentString);
    const contentBody = `<< /Length ${contentBytes.length} >>\nstream\n${contentString}\nendstream`;
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    });
    objects.push({ id: contentId, body: contentBody });
  });

  const pdfParts = ['%PDF-1.4\n'];
  const offsets = [0];
  let offset = pdfParts[0].length;
  objects.forEach((object) => {
    const objectString = `${object.id} 0 obj\n${object.body}\nendobj\n`;
    offsets.push(offset);
    pdfParts.push(objectString);
    offset += objectString.length;
  });
  const xrefPosition = offset;
  pdfParts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objects.length; index += 1) {
    pdfParts.push(`${offsets[index].toString().padStart(10, '0')} 00000 n \n`);
  }
  pdfParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`);
  return textEncoder.encode(pdfParts.join(''));
}

function wrapTextForPdf(text, maxChars) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return [''];
  }
  const words = clean.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    if (!word) {
      return;
    }
    const tentative = current ? `${current} ${word}` : word;
    if (tentative.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      if (word.length > maxChars) {
        let remaining = word;
        while (remaining.length > maxChars) {
          lines.push(remaining.slice(0, maxChars));
          remaining = remaining.slice(maxChars);
        }
        current = remaining;
      } else {
        current = word;
      }
    } else {
      current = tentative;
    }
  });
  if (current) {
    lines.push(current);
  }
  return lines.length ? lines : [''];
}

function escapePdfText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

export function triggerDownload(file, fallbackName) {
  if (!file) {
    return;
  }
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'name' in file && file.name ? file.name : fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function createFileTimestamp(date) {
  const pad = (value) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function formatFullTimestamp(date) {
  const pad = (value) => value.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function tryPrintFallback(section, sectionId) {
  if (!section) {
    return;
  }
  preparePrintLayout(section, sectionId);
  try {
    window.print();
  } catch (error) {
    console.warn('Impressão de fallback não disponível', error);
  } finally {
    window.setTimeout(() => {
      clearPrintLayout(section);
    }, PRINT_CLEANUP_DELAY);
  }
}

function preparePrintLayout(section, sectionId) {
  if (!section) {
    return;
  }
  document.body.dataset.printSection = sectionId;
  section.classList.add('is-print-target');
}

function clearPrintLayout(section) {
  if (!section) {
    return;
  }
  delete document.body.dataset.printSection;
  section.classList.remove('is-print-target');
}
