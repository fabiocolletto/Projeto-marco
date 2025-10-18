import type { RegistryEntry } from '../app/types.js';

export function renderCatalog(container: HTMLElement, entries: RegistryEntry[], activeId: string | null): void {
  container.innerHTML = '';

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum MiniApp disponível.';
    empty.setAttribute('role', 'note');
    container.append(empty);
    return;
  }

  for (const entry of entries) {
    const card = document.createElement('button');
    card.type = 'button';
    card.classList.add('card');
    card.setAttribute('data-app-id', entry.id);
    card.setAttribute('role', 'listitem');
    card.classList.toggle('active', activeId === entry.id);

    const title = document.createElement('span');
    title.textContent = entry.name;
    if (entry.adminOnly) {
      const badge = document.createElement('span');
      badge.classList.add('badge');
      badge.textContent = 'Admin';
      title.append(badge);
    }

    card.append(title);
    container.append(card);
  }
}
