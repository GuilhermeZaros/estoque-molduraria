import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { planilhaFalsa } from './planilha-falsa.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const ler = (...p) => readFileSync(path.join(dir, '..', ...p), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext([ler('apps-script', 'Config.gs'), ler('apps-script', 'MoldurasRelatorioDados.gs'),
  ler('apps-script', 'SeedMoldurasRelatorio.gs')].join('\n'), ctx);
const cat = ctx.MOLDURAS_RELATORIO;

test('relatório: 749 molduras, todas com código, nome, fornecedor e preço; sem custo', () => {
  assert.equal(cat.length, 749);
  const chaves = new Set(cat.map((m) => ctx._chaveCodigoMoldura(m.Codigo)));
  assert.equal(chaves.size, 749);
  for (const m of cat) {
    assert.ok(m.Codigo && m.Nome && m.Marca, m.Codigo);
    assert.ok(m.Valor_por_metro > 0, m.Codigo);
    assert.equal(m.Custo_por_metro, undefined);
  }
});

test('chave do código: espaço e traço não separam; o primeiro traço separa; RM ≠ R', () => {
  assert.equal(ctx._chaveCodigoMoldura('066-R-390'), ctx._chaveCodigoMoldura('066-R390'));
  assert.equal(ctx._chaveCodigoMoldura('060 RM 315'), ctx._chaveCodigoMoldura('060-RM-315'));
  assert.notEqual(ctx._chaveCodigoMoldura('375-RM-300'), ctx._chaveCodigoMoldura('375-R300'));
  assert.notEqual(ctx._chaveCodigoMoldura('12-1049'), ctx._chaveCodigoMoldura('1210-49'));
});

test('cadastrar: pula o que já existe, entra com estoque 0 e custo só quando é menor que a venda', () => {
  const dados = planilhaFalsa(ctx, {
    Molduras: [{ Codigo: '060-116', Nome: 'Preta reta lisa 2cm', Valor_por_metro: 20 }, { Codigo: '066-R390' }]
  });
  vm.runInContext('var CUSTOS_MOLDURAS = {"060-166": 3.7, "0699-7704": 31.23};', ctx);
  const msg = ctx.cadastrarMoldurasDoRelatorio();
  assert.match(msg, /747 cadastradas/);
  assert.match(msg, /2 já existiam/);
  const linhas = dados.Molduras;
  assert.equal(linhas.length, 749);
  assert.equal(linhas[0].Nome, 'Preta reta lisa 2cm'); // a que já existia não muda
  const branca = linhas.find((l) => l.Codigo === '060-166');
  assert.equal(branca.Custo_por_metro, 3.7);
  assert.equal(branca.Estoque_atual_m, 0);
  assert.equal(branca.Disponivel, true);
  assert.equal(branca.Cor, 'Branco');
  assert.equal(branca.Largura_perfil_cm, 2);
  assert.equal(linhas.find((l) => l.Codigo === '0699-7704').Custo_por_metro, ''); // custo = venda: não entra
  // rodar de novo não duplica
  assert.match(ctx.cadastrarMoldurasDoRelatorio(), /0 cadastradas/);
  assert.equal(dados.Molduras.length, 749);
});
