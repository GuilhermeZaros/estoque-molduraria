import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gerarNucleo, DESTINO } from '../scripts/gerar-nucleo-app.js';

test('o núcleo do app está igual ao Apps Script (rode node scripts/gerar-nucleo-app.js)', () => {
  assert.equal(readFileSync(DESTINO, 'utf8').replace(/\r\n/g, '\n'), gerarNucleo());
});

test('o núcleo gerado roda sozinho como módulo', async () => {
  const n = await import('data:text/javascript,' + encodeURIComponent(gerarNucleo()));
  assert.equal(n.consumoMolduraM(90, 60, 2), 3.289);
  assert.equal(n.nomeCasinha('cr3-e2'), 'Corredor 3, esquerda, casinha 2');
  assert.equal(n.casinhasDoDeposito().length, 87);
  assert.equal(n.corEstoque(2.7), 'amarelo');
});

test('o núcleo gerado calcula o orçamento igual à planilha', async () => {
  const n = await import('data:text/javascript,' + encodeURIComponent(gerarNucleo()));
  const ext = n.medidaExterna(40, 50, 5);
  assert.deepEqual(ext, { largura: 50, altura: 60 });
  const orc = n.calcularOrcamento(50, 60, [
    { categoria: 'moldura', nome: 'M', preco: 30, perfilCm: 2 },
    { categoria: 'vidro', nome: 'V', preco: 180 }
  ], { paspatur: true, paspaturPrecoM2: 330 });
  assert.equal(orc.valor_total, 219);
  const tot = n.totaisOrcamentoApp(orc, 2);
  assert.equal(tot.valor_total, 438);
  assert.equal(tot.consumo_moldura_m, 4.978);
  assert.deepEqual(n.planejarBaixaMoldura(3, 4.978), { baixa: 3, falta: 1.978, novo_estoque: 0 });
  assert.equal(n.TAXA_PINTURA_CHAPA, 30);
  const servicos = n.servicosDoQuadro([{ descricao: ' Limpar vidros ', valor: 30 }, { descricao: '', valor: '' }]);
  assert.deepEqual(servicos, [{ descricao: 'Limpar vidros', valor: 30 }]);
  const comServico = n.totaisOrcamentoApp(orc, 2, servicos);
  assert.equal(comServico.valor_total, 468);
  assert.deepEqual(n.bordaDoQuadro({ tipo: 'objeto', margem_cm: 4 }), { cm: 4, paspatur: false });
});
