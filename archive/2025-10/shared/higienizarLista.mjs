// shared/higienizarLista.mjs
// Compat layer para módulos que dependiam de higienização de listas no formato antigo.
// Reexporta utilitários de nomes e expõe deriveTelefone usado pelo mini-app de fornecedores.

import { normalizeName, stripNumbersFromName } from "./listUtils.js";

const COUNTRY_CODE = "55";

function onlyDigits(value = "") {
  return String(value ?? "").replace(/\D/g, "");
}

function trimBrazilDigits(digits = "") {
  if (!digits) return "";
  if (digits.startsWith(COUNTRY_CODE) && digits.length > 11) {
    return digits.slice(-11);
  }
  if (digits.length > 11) {
    return digits.slice(-11);
  }
  return digits;
}

function formatNational(digits = "") {
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return "";
}

/**
 * Deriva representações nacionais e E.164 a partir de possíveis números brasileiros.
 * Prioriza candidatos com maior quantidade de dígitos válidos.
 * @param {{ possiveisNumeros?: string[] }} [input]
 * @returns {{ e164: string, nacional: string, tipo: 'fixo'|'celular'|null }|null}
 */
export function deriveTelefone(input = {}) {
  const candidatos = Array.isArray(input?.possiveisNumeros) ? input.possiveisNumeros : [];
  let melhor = null;
  for (const candidato of candidatos) {
    const somenteDigitos = trimBrazilDigits(onlyDigits(candidato));
    if (somenteDigitos.length < 10) continue;
    if (!melhor || somenteDigitos.length > melhor.digitos.length) {
      melhor = { original: candidato, digitos: somenteDigitos };
    }
  }
  if (!melhor) return null;

  const digitos = melhor.digitos;
  const nacional = formatNational(digitos);
  const tipo = digitos.length === 11 ? "celular" : digitos.length === 10 ? "fixo" : null;
  const e164 = digitos ? `+${COUNTRY_CODE}${digitos}` : null;
  return { e164, nacional, tipo };
}

export { normalizeName, stripNumbersFromName };

export default {
  deriveTelefone,
  normalizeName,
  stripNumbersFromName,
};
