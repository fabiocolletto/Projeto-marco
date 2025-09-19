// shared/validate/event.js
// Validação dos dados do evento

/**
 * @param {Object} evt {nome, data, hora, local, endereco, anfitriao}
 * @returns {Object} {campo:erro}
 */
export function validateEvento(evt = {}) {
  const err = {};

  if (!evt.nome || evt.nome.trim().length < 3) {
    err.nome = 'Informe um nome válido para o evento';
  }

  if (evt.data && !/^\d{4}-\d{2}-\d{2}$/.test(evt.data)) {
    err.data = 'Data inválida (use yyyy-mm-dd)';
  }

  if (evt.hora && !/^\d{2}:\d{2}$/.test(evt.hora)) {
    err.hora = 'Hora inválida (use hh:mm)';
  }

  // local/endereço/anfitrião são opcionais, mas podemos checar tamanho mínimo
  if (evt.local && evt.local.trim().length < 2) {
    err.local = 'Local muito curto';
  }

  return err;
}
