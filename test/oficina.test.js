import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const dir = path.dirname(fileURLToPath(import.meta.url));
function carregarGs(nome) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(dir, '..', 'apps-script', nome), 'utf8'), ctx);
  return ctx;
}

test('Oficina.gs _proximoIdOS: maior número + 1, 3 dígitos', () => {
  const ctx = carregarGs('Oficina.gs');
  assert.equal(ctx._proximoIdOS([]), 'OS-001');
  assert.equal(ctx._proximoIdOS(['OS-001', 'OS-009']), 'OS-010');
  assert.equal(ctx._proximoIdOS(['OS-001', 'OS-013', 'OS-007']), 'OS-014');
});
test('Oficina.gs _prazoStr: ISO do input date vira DD/MM/AAAA', () => {
  const ctx = carregarGs('Oficina.gs');
  assert.equal(ctx._prazoStr('2026-06-25'), '25/06/2026');
  assert.equal(ctx._prazoStr('25/06/2026'), '25/06/2026');
  assert.equal(ctx._prazoStr(''), '');
});

test('Auth.gs papeisDe: separa por vírgula; vazio = atendimento (retrocompat)', () => {
  const ctx = carregarGs('Auth.gs');
  // .join: array vindo do vm quebra o deepEqual (cross-realm) — asserir só primitivos.
  assert.equal(ctx.papeisDe('atendimento,oficina').join(','), 'atendimento,oficina');
  assert.equal(ctx.papeisDe(' Oficina ').join(','), 'oficina');
  assert.equal(ctx.papeisDe('').join(','), 'atendimento');
  assert.equal(ctx.papeisDe(null).join(','), 'atendimento');
});
test('Auth.gs temGestao / ehSomenteOficina', () => {
  const ctx = carregarGs('Auth.gs');
  assert.equal(ctx.temGestao(['atendimento']), true);
  assert.equal(ctx.temGestao(['dono']), true);
  assert.equal(ctx.temGestao(['oficina']), false);
  assert.equal(ctx.ehSomenteOficina(['oficina']), true);
  assert.equal(ctx.ehSomenteOficina(['oficina', 'atendimento']), false);
  assert.equal(ctx.ehSomenteOficina(['atendimento']), false);
});
