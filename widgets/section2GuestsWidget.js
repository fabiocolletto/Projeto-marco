function renderPreview(result) {
  const { items, duplicates, rawCount, filtered = [] } = result; // ← inclui filtered
  $("#preview").textContent = items.join('\n');
  const dup = duplicates.length ? ` • duplicados removidos: ${duplicates.length}` : '';
  const fil = filtered.length   ? ` • filtrados (numéricos): ${filtered.length}` : '';
  $("#stats").textContent = `itens brutos: ${rawCount} • únicos: ${items.length}${dup}${fil}`;
}
