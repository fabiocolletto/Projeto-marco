// shared/io/clipboard.js
// Funções para copiar texto de forma segura e baixar .txt

/**
 * Copia texto para clipboard com fallbacks.
 */
export async function safeCopyText(text, btn) {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      flash(btn, 'Copiado!');
      return;
    }
  } catch (_) {}

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    flash(btn, 'Copiado!');
    return;
  } catch (_) {}

  // último recurso → abre modal (se existir)
  openCopyModal?.(text);
  flash(btn, 'Copie manualmente');
}

/** Baixa o texto em um arquivo .txt */
export function downloadAsTxt(text, name = 'arquivo.txt') {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}

// Helpers internos
function flash(btn, msg) {
  if (!btn) return;
  const old = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = old), 1200);
}
