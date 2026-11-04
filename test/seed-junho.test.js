import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const dir = path.dirname(fileURLToPath(import.meta.url));
const ler = (...p) => readFileSync(path.join(dir, '..', ...p), 'utf8');
const dados = existsSync(path.join(dir, '..', 'apps-script', 'DadosDaLoja.gs'))
  ? ler('apps-script', 'DadosDaLoja.gs')
  : ler('exemplos', 'DadosDaLoja.gs');
const ctx = {};
vm.createContext(ctx);
vm.runInContext([ler('apps-script', 'Config.gs'), ler('apps-script', 'Financeiro.gs'), dados, ler('apps-script', 'SeedFinanceiro.gs')].join('\n'), ctx);

test('seed: saídas só de junho/2026, com valor e tipo loja ou pessoal', () => {
  const s = ctx._linhasSaidasHistorico();
  assert.ok(s.length > 0);
  assert.ok(s.every((l) => l.data.getMonth() === 5 && l.data.getFullYear() === 2026));
  assert.ok(s.every((l) => l.valor > 0));
  assert.ok(s.every((l) => l.tipo === 'loja' || l.tipo === 'pessoal'));
});

test('seed: entradas só de junho/2026 e com valor', () => {
  const e = ctx._linhasEntradasHistorico();
  assert.ok(e.length > 0);
  assert.ok(e.every((l) => l.data.getMonth() === 5 && l.data.getFullYear() === 2026));
  assert.ok(e.every((l) => l.valor > 0));
});
