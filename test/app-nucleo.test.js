import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps-script');
function carregar(...nomes) {
  const ctx = {};
  vm.createContext(ctx);
  for (const n of nomes) vm.runInContext(readFileSync(path.join(dir, n), 'utf8'), ctx, { filename: n });
  return ctx;
}
const ctx = carregar('Config.gs', 'Calculo.gs', 'Usuarios.gs', 'Oficina.gs', 'Catalogo.gs', 'AppNucleo.gs');
const js = (x) => JSON.parse(JSON.stringify(x));

test('_casinhasDoDeposito: 87 casinhas na ordem corredor, lado, número; depois paredes', () => {
  const c = js(ctx._casinhasDoDeposito());
  assert.equal(c.length, 87);
  assert.equal(new Set(c).size, 87);
  assert.equal(c[0], 'CR1-E1');
  assert.equal(c[5], 'CR1-D1');
  assert.equal(c[10], 'CR1-F1');
  assert.equal(c[15], 'CR2-E1');
  assert.equal(c[74], 'CR5-F5');
  assert.equal(c[75], 'PR1-1');
  assert.equal(c[86], 'PR2-6');
});

test('_casinhaValida: aceita os 87 códigos, com ou sem espaço e minúscula', () => {
  assert.equal(ctx._casinhaValida('CR3-E2'), true);
  assert.equal(ctx._casinhaValida(' cr3-f5 '), true);
  assert.equal(ctx._casinhaValida('PR2-6'), true);
  assert.equal(ctx._casinhaValida('CR6-E1'), false);
  assert.equal(ctx._casinhaValida('CR1-X1'), false);
  assert.equal(ctx._casinhaValida('CR1-E6'), false);
  assert.equal(ctx._casinhaValida('PR1-7'), false);
  assert.equal(ctx._casinhaValida(''), false);
});

test('_nomeCasinha: nome falado da casinha', () => {
  assert.equal(ctx._nomeCasinha('CR3-E2'), 'Corredor 3, esquerda, casinha 2');
  assert.equal(ctx._nomeCasinha('cr1-d5'), 'Corredor 1, direita, casinha 5');
  assert.equal(ctx._nomeCasinha('CR1-F4'), 'Corredor 1, fundo, casinha 4');
  assert.equal(ctx._nomeCasinha('PR1-4'), 'Parede 1, casinha 4');
  assert.equal(ctx._nomeCasinha('xx'), '');
});

test('_corEstoque: verde com 3 varas ou mais, amarelo de 1 a 3, vermelho abaixo de 1', () => {
  assert.equal(ctx._corEstoque(27), 'verde');
  assert.equal(ctx._corEstoque(8.1), 'verde');
  assert.equal(ctx._corEstoque(8.09), 'amarelo');
  assert.equal(ctx._corEstoque(2.7), 'amarelo');
  assert.equal(ctx._corEstoque(2.69), 'vermelho');
  assert.equal(ctx._corEstoque(0), 'vermelho');
  assert.equal(ctx._corEstoque(''), 'vermelho');
});

test('_proximoIdSeq: maior número + 1 com zeros à esquerda', () => {
  assert.equal(ctx._proximoIdSeq('ORC', [], 4), 'ORC-0001');
  assert.equal(ctx._proximoIdSeq('ORC', ['ORC-0009', 'ORC-0003'], 4), 'ORC-0010');
  assert.equal(ctx._proximoIdSeq('CMP', [null, '', 'CMP-0041'], 4), 'CMP-0042');
});

test('_metros: aceita vírgula, arredonda em 3 casas e recusa inválido', () => {
  assert.equal(ctx._metros('2,5'), 2.5);
  assert.equal(ctx._metros(3), 3);
  assert.equal(ctx._metros('1.23456'), 1.235);
  assert.equal(ctx._metros(0, true), 0);
  assert.throws(() => ctx._metros(0), /Metros inválidos/);
  assert.throws(() => ctx._metros('', true), /Metros inválidos/);
  assert.throws(() => ctx._metros('abc', true), /Metros inválidos/);
  assert.throws(() => ctx._metros(-1, true), /Metros inválidos/);
});

test('_medidaExterna: paspatur faz o quadro crescer 2 bordas em cada medida', () => {
  assert.deepEqual(js(ctx._medidaExterna(20, 30, 5)), { largura: 30, altura: 40 });
  assert.deepEqual(js(ctx._medidaExterna(20, 30, '')), { largura: 20, altura: 30 });
  assert.deepEqual(js(ctx._medidaExterna(20, 30, -3)), { largura: 20, altura: 30 });
});

test('_totaisOrcamentoApp: multiplica valor e consumo pela quantidade', () => {
  const orc = ctx.calcularOrcamento(90, 60, [
    { categoria: 'moldura', nome: 'M', preco: 58, perfilCm: 3 },
    { categoria: 'vidro', nome: 'V', preco: 180 },
    { categoria: 'chapa', nome: 'C', preco: 100 }
  ]);
  const t = js(ctx._totaisOrcamentoApp(orc, 2));
  assert.equal(t.quantidade, 2);
  assert.equal(t.valor_unitario, 325.2);
  assert.equal(t.valor_total, 650.4);
  assert.equal(t.consumo_moldura_m, 6.852);
  assert.equal(t.pintura_chapa, 0);
  assert.equal(t.itens.length, 3);
});

test('_totaisOrcamentoApp: quantidade inválida vira 1; sem moldura o consumo é 0', () => {
  const orc = ctx.calcularOrcamento(50, 50, [{ categoria: 'espelho', nome: 'E', preco: 330 }], { objetoAlto: true });
  const t = js(ctx._totaisOrcamentoApp(orc, '0'));
  assert.equal(t.quantidade, 1);
  assert.equal(t.consumo_moldura_m, 0);
  assert.equal(t.pintura_chapa, 25);
});

test('_planejarBaixaMoldura: baixa até zerar e o resto vira falta', () => {
  assert.deepEqual(js(ctx._planejarBaixaMoldura(2.7, 3.426)), { baixa: 2.7, falta: 0.726, novo_estoque: 0 });
  assert.deepEqual(js(ctx._planejarBaixaMoldura(12.3, 3.426)), { baixa: 3.426, falta: 0, novo_estoque: 8.874 });
  assert.deepEqual(js(ctx._planejarBaixaMoldura('', 1)), { baixa: 0, falta: 1, novo_estoque: 0 });
});

test('_quadrosDoPedido: lista de quadros; pedido antigo vira 1 quadro', () => {
  const q1 = { tipo: 'quadro', largura_cm: 20 };
  const q2 = { tipo: 'reforma', largura_cm: 40 };
  assert.deepEqual(js(ctx._quadrosDoPedido({ cliente: 'Ana', quadros: [q1, q2] })), [q1, q2]);
  const antigo = { cliente: 'Ana', largura_cm: 30, altura_cm: 40, moldura: 'M1' };
  assert.deepEqual(js(ctx._quadrosDoPedido(antigo)), [antigo]);
  assert.deepEqual(js(ctx._quadrosDoPedido({ quadros: [], largura_cm: 10 })), [{ quadros: [], largura_cm: 10 }]);
});

test('_bordaDoQuadro: paspatur cobra; margem da camiseta só aumenta a medida', () => {
  assert.deepEqual(js(ctx._bordaDoQuadro({ tipo: 'quadro', paspatur_cm: 5 })), { cm: 5, paspatur: true });
  assert.deepEqual(js(ctx._bordaDoQuadro({ paspatur_cm: '' })), { cm: 0, paspatur: false });
  assert.deepEqual(js(ctx._bordaDoQuadro({ tipo: 'reforma', paspatur_cm: 3 })), { cm: 3, paspatur: true });
  assert.deepEqual(js(ctx._bordaDoQuadro({ tipo: 'camiseta', margem_cm: 4, paspatur_cm: 5 })), { cm: 4, paspatur: false });
  assert.deepEqual(js(ctx._bordaDoQuadro({ tipo: 'camiseta', margem_cm: -1 })), { cm: 0, paspatur: false });
});

test('_consumoPorMoldura: soma por código na ordem em que aparece', () => {
  assert.deepEqual(js(ctx._consumoPorMoldura([
    { moldura: 'M1', consumo: 1.1 },
    { moldura: '', consumo: 2 },
    { moldura: 'M2', consumo: 3 },
    { moldura: 'M1', consumo: 2.2 }
  ])), [{ codigo: 'M1', metros: 3.3 }, { codigo: 'M2', metros: 3 }]);
  assert.deepEqual(js(ctx._consumoPorMoldura([])), []);
});

test('_resumoQuadros: texto curto de cada quadro', () => {
  assert.equal(ctx._resumoQuadros([
    { tipo: 'quadro', largura_cm: 20, altura_cm: 30, quantidade: 1 },
    { tipo: 'quadro', largura_cm: 50.5, altura_cm: 40, quantidade: 2 },
    { tipo: 'reforma', largura_cm: 40, altura_cm: 60, quantidade: 1 },
    { tipo: 'camiseta', tamanho: 'M', largura_cm: 52, altura_cm: 72, quantidade: 1 },
    { tipo: 'camiseta', tamanho: '', largura_cm: 60, altura_cm: 90 },
    { largura_cm: 10, altura_cm: 15 }
  ]), '20 x 30; 2x 50,5 x 40; reforma 40 x 60; camiseta M; camiseta 60 x 90; 10 x 15');
});

test('_abaterFaltas: separa as encomendas mais antigas primeiro, sem pular fila', () => {
  assert.deepEqual(js(ctx._abaterFaltas(20, [{ id: 'CMP-0001', metros: 0.73 }])),
    { atendidas: ['CMP-0001'], abatido: 0.73, vai_pro_estoque: 19.27 });
  assert.deepEqual(js(ctx._abaterFaltas(0.5, [{ id: 'CMP-0001', metros: 0.73 }])),
    { atendidas: [], abatido: 0, vai_pro_estoque: 0.5 });
  assert.deepEqual(js(ctx._abaterFaltas(5, [{ id: 'a', metros: 3 }, { id: 'b', metros: 4 }, { id: 'c', metros: 1 }])),
    { atendidas: ['a'], abatido: 3, vai_pro_estoque: 2 });
  assert.deepEqual(js(ctx._abaterFaltas(20, [])), { atendidas: [], abatido: 0, vai_pro_estoque: 20 });
});

test('_molduraParaApp: linha da planilha vira objeto do app', () => {
  const m = js(ctx._molduraParaApp({
    Codigo: '160-RM9', Nome: 'Madeira reta lisa 2cm', Marca: 'Moldurarte', Estilo: 'reta', Cor: 'madeira',
    Largura_perfil_cm: 2, Valor_por_metro: 28.9, Estoque_atual_m: 27, Foto_URL: 'u',
    Local: ' cr3-e2 ', Disponivel: 'TRUE'
  }));
  assert.equal(m.codigo, '160-RM9');
  assert.equal(m.local, 'CR3-E2');
  assert.equal(m.perfil_cm, 2);
  assert.equal(m.preco_m, 28.9);
  assert.equal(m.estoque_m, 27);
  assert.equal(m.disponivel, true);
  assert.equal(js(ctx._molduraParaApp({ Codigo: 1, Disponivel: false })).disponivel, false);
  assert.equal(js(ctx._molduraParaApp({ Codigo: 1 })).local, '');
});

test('_orcamentoParaApp: datas viram texto e booleanos são lidos', () => {
  const o = js(ctx._orcamentoParaApp({
    ID: 'ORC-0001', Ref_app: 'r1', Data_criacao: new Date(2026, 9, 30, 14, 5), Cliente: 'Maria',
    Quantidade: 2, Vidro_duplo: 'FALSE', Objeto_alto: true, Valor_final: 650.4, Status: 'aberto'
  }));
  assert.equal(o.id, 'ORC-0001');
  assert.equal(o.ref_app, 'r1');
  assert.equal(o.data_criacao, '30/10/2026 14:05');
  assert.equal(o.quantidade, 2);
  assert.equal(o.vidro_duplo, false);
  assert.equal(o.objeto_alto, true);
  assert.equal(o.valor_final, 650.4);
});

test('_compraParaApp: metros como número', () => {
  const c = js(ctx._compraParaApp({ ID: 'CMP-0001', Data: '', Moldura: 'X', Metros_faltando: 0.73 }));
  assert.equal(c.metros_faltando, 0.73);
  assert.equal(c.data, '');
});

test('_faltasPendentesDe: só as pendentes daquela moldura, na ordem da planilha', () => {
  const f = js(ctx._faltasPendentesDe([
    { ID: 'CMP-0001', Moldura: 'X', Status: 'pendente', Metros_faltando: 0.5, _linha: 2 },
    { ID: 'CMP-0002', Moldura: 'Y', Status: 'pendente', Metros_faltando: 1, _linha: 3 },
    { ID: 'CMP-0003', Moldura: 'X', Status: 'atendida', Metros_faltando: 2, _linha: 4 },
    { ID: 'CMP-0004', Moldura: 'X', Status: 'pendente', Metros_faltando: 1.2, _linha: 5 }
  ], 'X'));
  assert.deepEqual(f, [{ id: 'CMP-0001', metros: 0.5, linha: 2 }, { id: 'CMP-0004', metros: 1.2, linha: 5 }]);
});

test('_atendentesAtivos: nomes preenchidos de usuários ativos', () => {
  const a = js(ctx._atendentesAtivos([
    { nome: 'Ana', ativo: '' }, { nome: 'Bia', ativo: 'FALSE' }, { nome: ' ', ativo: '' }, { nome: 'Caio', ativo: 'sim' }
  ]));
  assert.deepEqual(a, ['Ana', 'Caio']);
});

test('_validarCorpoApp: exige id_op e ação conhecida', () => {
  assert.throws(() => ctx._validarCorpoApp(null), /Pedido vazio/);
  assert.throws(() => ctx._validarCorpoApp({ id_op: 'abc', acao: 'salvarOrcamento' }), /id_op/);
  assert.throws(() => ctx._validarCorpoApp({ id_op: '12345678-x', acao: 'apagarTudo' }), /Ação desconhecida/);
  const p = js(ctx._validarCorpoApp({ id_op: ' 12345678-x ', acao: 'fecharVenda' }));
  assert.deepEqual(p, { id_op: '12345678-x', acao: 'fecharVenda', dados: {} });
});

test('_validarNovaMoldura: normaliza e decide se já fica disponível', () => {
  const m = js(ctx._validarNovaMoldura({
    codigo: ' 0004-7705 ', nome: 'Dourada', perfil_cm: '3,5', preco_m: '45', metros: '12,3', casinha: 'cr1-f4', cor: 'dourado'
  }));
  assert.equal(m.codigo, '0004-7705');
  assert.equal(m.perfil_cm, 3.5);
  assert.equal(m.preco_m, 45);
  assert.equal(m.metros, 12.3);
  assert.equal(m.casinha, 'CR1-F4');
  assert.equal(m.cor, 'dourado');
  assert.equal(m.disponivel, true);
  const semPreco = js(ctx._validarNovaMoldura({ codigo: 'A', nome: 'B', perfil_cm: 2 }));
  assert.equal(semPreco.preco_m, 0);
  assert.equal(semPreco.metros, 0);
  assert.equal(semPreco.disponivel, false);
  assert.throws(() => ctx._validarNovaMoldura({ nome: 'B', perfil_cm: 2 }), /código/);
  assert.throws(() => ctx._validarNovaMoldura({ codigo: 'A', perfil_cm: 2 }), /nome/);
  assert.throws(() => ctx._validarNovaMoldura({ codigo: 'A', nome: 'B', perfil_cm: 0 }), /perfil/);
  assert.throws(() => ctx._validarNovaMoldura({ codigo: 'A', nome: 'B', perfil_cm: 2, casinha: 'CR9-E1' }), /Casinha/);
});
