import type { RegistryEntry } from '../app/types.js';

export function renderCatalog(
  selector: HTMLSelectElement,
  entries: RegistryEntry[],
  activeId: string | null,
): void {
  selector.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.dataset.role = 'placeholder';
  placeholder.textContent = entries.length ? 'Selecione um MiniApp' : 'Nenhum MiniApp disponível';
  selector.append(placeholder);

  const hasActiveEntry = entries.some((entry) => entry.id === activeId);
  selector.disabled = entries.length === 0;

  for (const entry of entries) {
    const option = document.createElement('option');
    option.value = entry.id;
    option.dataset.appId = entry.id;
    if (entry.adminOnly) {
      option.dataset.adminOnly = 'true';
    }
    option.textContent = entry.adminOnly ? `${entry.name} · Privado` : entry.name;
    option.selected = activeId === entry.id;
    selector.append(option);
  }

  if (!hasActiveEntry) {
    placeholder.selected = true;
  }
}
