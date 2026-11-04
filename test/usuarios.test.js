import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const dir = path.dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(path.join(dir, '..', 'apps-script', 'Usuarios.gs'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

test('_usuarioAtivo: vazio/TRUE/sim contam como ativo', () => {
  assert.equal(ctx._usuarioAtivo(''), true);
  assert.equal(ctx._usuarioAtivo('TRUE'), true);
  assert.equal(ctx._usuarioAtivo('sim'), true);
});
test('_usuarioAtivo: FALSE/nao/0 desativam', () => {
  assert.equal(ctx._usuarioAtivo('FALSE'), false);
  assert.equal(ctx._usuarioAtivo(false), false);
  assert.equal(ctx._usuarioAtivo('nao'), false);
  assert.equal(ctx._usuarioAtivo(0), false);
});
