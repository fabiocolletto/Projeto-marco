// tools/shared/utils/dom.mjs
// Utilidades leves para construção e manipulação de nós DOM.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (key === 'className') {
      node.className = value || '';
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value || {});
    } else if (key in node) {
      node[key] = value;
    } else if (value !== undefined) {
      node.setAttribute(key, value);
    }
  });

  (Array.isArray(children) ? children : [children]).forEach(child => {
    if (child === null || child === undefined) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });

  return node;
}

export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export function ensureHost(host) {
  if (!host) throw new Error('[dom.ensureHost] host inválido para miniapp');
  return host;
}
