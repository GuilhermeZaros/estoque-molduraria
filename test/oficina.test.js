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
