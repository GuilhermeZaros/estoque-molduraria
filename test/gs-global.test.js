import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps-script');
const arquivos = readdirSync(dir).filter((f) => f.endsWith('.gs'));

test('todos os .gs têm sintaxe válida', () => {
  for (const f of arquivos) new vm.Script(readFileSync(path.join(dir, f), 'utf8'), { filename: f });
});

function funcoesGlobais(src) {
  const linhas = src.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(/^function ([A-Za-z_$][\w$]*)\s*\(/);
    if (!m) continue;
    let fim = i;
    if (!/\}\s*$/.test(linhas[i])) while (fim < linhas.length && linhas[fim] !== '}') fim++;
    out.push({ nome: m[1], texto: linhas.slice(i, fim + 1).join('\n') });
  }
  return out;
}

test('nenhuma função global se repete com corpo diferente', () => {
  const vistas = new Map();
  const conflitos = [];
  for (const f of arquivos) {
    for (const fn of funcoesGlobais(readFileSync(path.join(dir, f), 'utf8'))) {
      const antes = vistas.get(fn.nome);
      if (antes && antes.texto !== fn.texto) conflitos.push(`${fn.nome} (${antes.arquivo} x ${f})`);
      if (!antes) vistas.set(fn.nome, { arquivo: f, texto: fn.texto });
    }
  }
  assert.deepEqual(conflitos, []);
});
