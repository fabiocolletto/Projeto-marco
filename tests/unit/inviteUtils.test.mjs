import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeName,
  stripNumbersFromName,
  parseInviteLine,
  parseInvites,
  invitesToCSV,
} from '../../tools/shared/inviteUtils.mjs';
import { normalizeName as normalizeOnly, stripNumbersFromName as stripOnly } from '../../tools/shared/listUtils.mjs';

test('stripNumbersFromName remove sequências numéricas longas', () => {
  const input = 'Ana 11987654321 Lima 55';
  const output = stripOnly(input);
  assert.equal(output, 'Ana Lima');
  assert.equal(stripNumbersFromName('Sr. 5 João 44'), 'Sr. 5 João');
});

test('normalizeName aplica caixa apropriada preservando conectores', () => {
  const input = '  maria   das   dores  ';
  assert.equal(normalizeOnly(input), 'Maria das Dores');
  assert.equal(normalizeName('joão da silva'), 'João da Silva');
  assert.equal(normalizeName('ANA VON TRAPP'), 'Ana von Trapp');
});

test('parseInviteLine identifica titular, acompanhantes e telefone', () => {
  const line = 'Maria da Silva, João, Ana  +55 (11) 99876-5432';
  const invite = parseInviteLine(line);
  assert.ok(invite, 'deve retornar um convite válido');
  assert.equal(invite?.titular, 'Maria da Silva');
  assert.deepEqual(invite?.acompanhantes, ['João', 'Ana']);
  assert.equal(invite?.telefone, '(11) 99876-5432');
  assert.equal(invite?.total, 3);
});

test('parseInvites converte múltiplas linhas em convites estruturados', () => {
  const text = `Carlos 11988887777; Bia\n\nFernanda dos Santos, +55 21 99887-7766, Paulo`;
  const invites = parseInvites(text);
  assert.equal(invites.length, 2);
  assert.equal(invites[0].titular, 'Carlos');
  assert.deepEqual(invites[0].acompanhantes, ['Bia']);
  assert.equal(invites[0].telefone, '(11) 98888-7777');
  assert.equal(invites[1].titular, 'Fernanda dos Santos');
  assert.deepEqual(invites[1].acompanhantes, ['Paulo']);
  assert.equal(invites[1].telefone, '(21) 99887-7766');
});

test('invitesToCSV gera saída com cabeçalho e dados normalizados', () => {
  const sample = parseInvites('Clara, José 11 91234-5678');
  const csv = invitesToCSV(sample);
  const lines = csv.split('\n');
  assert.equal(lines[0], 'seq,titular,acompanhantes,telefone,total');
  assert.match(lines[1], /^"1","Clara","José","\(11\) 91234-5678","2"$/);
});
