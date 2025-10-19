// miniapps/base_shell/sys/memory-status.js
// Sinalizador de status de memória: estima uso/limite, testa IndexedDB e reporta saúde.
const el = document.getElementById('mem-status');

async function testIndexedDB() {
  if (!('indexedDB' in window)) return { ok: false, reason: 'indisponível' };
  return new Promise((resolve) => {
    const t0 = performance.now();
    const req = indexedDB.open('__miniapp_smoke__', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('t')) db.createObjectStore('t', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('t', 'readwrite');
      tx.objectStore('t').put({ id: 'k', v: 1 });
      tx.oncomplete = () => {
        db.close();
        indexedDB.deleteDatabase('__miniapp_smoke__');
        const dt = Math.max(1, Math.round(performance.now() - t0));
        resolve({ ok: true, ms: dt });
      };
    };
    req.onerror = () => resolve({ ok: false, reason: req.error?.message || 'erro' });
    req.onblocked = () => resolve({ ok: false, reason: 'blocked' });
  });
}

async function estimateStorage() {
  if (!navigator.storage || !navigator.storage.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota, pct: quota ? usage / quota : 0 };
  } catch {
    return null;
  }
}

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function setStatus(text, cls) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove('ok', 'warn', 'crit', 'off');
  if (cls) el.classList.add(cls);
  el.title = 'Status de memória do MiniApp';
}

async function updateStatus() {
  const idb = await testIndexedDB();
  const est = await estimateStorage();

  if (!idb.ok && !est) {
    setStatus('Memória: desativada', 'off');
    return;
  }

  let cls = 'ok';
  const msgParts = [];

  if (est) {
    const { usage, quota, pct } = est;
    if (quota > 0) {
      if (pct >= 0.9) cls = 'crit';
      else if (pct >= 0.75) cls = 'warn';
      msgParts.push(`uso ${fmtMB(usage)} de ${fmtMB(quota)} (${Math.round(pct * 100)}%)`);
    } else {
      msgParts.push('estimativa indisponível');
    }
  } else {
    msgParts.push('estimativa indisponível');
  }

  if (!idb.ok) {
    cls = cls === 'crit' ? 'crit' : 'warn';
    msgParts.push(`IndexedDB: ${idb.reason || 'falha'}`);
  } else {
    msgParts.push(`IndexedDB ok (${idb.ms}ms)`);
  }

  setStatus(`Memória: ${msgParts.join(' • ')}`, cls);
}

// Atualização inicial e periódica
updateStatus();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateStatus();
});
window.addEventListener('storage', () => updateStatus());
setInterval(updateStatus, 30000);
