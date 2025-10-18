export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly adminOnly?: boolean;
}

export function renderCatalog(
  container: HTMLElement,
  entries: CatalogEntry[],
  activeId: string | null,
): void {
  container.innerHTML = '';

  if (entries.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'catalog-empty';
    emptyState.textContent = 'Nenhum MiniApp disponível no momento.';
    container.append(emptyState);
    return;
  }

  for (const entry of entries) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `card${activeId === entry.id ? ' active' : ''}`;
    card.setAttribute('data-app-id', entry.id);
    card.setAttribute('data-app-name', entry.name);
    card.setAttribute('role', 'listitem');
    (card.dataset as { appId?: string }).appId = entry.id;
    card.innerHTML = `
      <span class="card-title">${entry.name}</span>
      ${entry.adminOnly ? '<span class="card-badge">Admin</span>' : ''}
    `;
    container.append(card);
  }
}
