import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { planilhaFalsa } from './planilha-falsa.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps-script');
const ARQUIVOS = ['Config.gs', 'Calculo.gs', 'Usuarios.gs', 'Financeiro.gs', 'Relatorios.gs', 'Oficina.gs', 'Catalogo.gs', 'Movimentacao.gs',
                  'AppNucleo.gs', 'AppTablet.gs'];
const ABAS_DO_APP = { Historico: [], Orcamentos: [], Orcamento_quadros: [], Compras: [], AppOperacoes: [], Casinhas: [] };
const js = (x) => JSON.parse(JSON.stringify(x));

function montar(abas, base = ABAS_DO_APP) {
  const ctx = {};
  vm.createContext(ctx);
  for (const n of ARQUIVOS) vm.runInContext(readFileSync(path.join(dir, n), 'utf8'), ctx, { filename: n });
  const dados = planilhaFalsa(ctx, { ...base, ...abas });
  return { ctx, dados };
}

const moldura = (estoque, extra = {}) => ({
  Codigo: 'M1', Nome: 'Madeira lisa 3cm', Marca: 'Moldurarte', Largura_perfil_cm: 3,
  Valor_por_metro: 58, Estoque_atual_m: estoque, Disponivel: true, Local: 'CR3-E2', ...extra
});
const vidro = { Codigo: 'V1', Nome: 'Vidro incolor', Valor_por_m2: 180, Estoque_atual_m2: 10, Disponivel: true };

test('appSync: pacote com molduras, materiais, casinhas contadas, abertos, compras e atendentes', () => {
  const { ctx } = montar({
    Molduras: [moldura(27)],
    Vidros: [vidro],
    Casinhas: [
      { Codigo: 'CR1-E1', Contada_em: new Date(2026, 9, 30), Contada_por: 'Ana' },
      { Codigo: 'CR1-E2', Contada_em: '', Contada_por: '' }
    ],
    Orcamentos: [{ ID: 'ORC-0001', Ref_app: 'r1', Status: 'aberto' }, { ID: 'ORC-0002', Ref_app: 'r2', Status: 'fechado' }],
    Compras: [
      { ID: 'CMP-0001', Moldura: 'M1', Metros_faltando: 0.7, Status: 'pendente' },
      { ID: 'CMP-0002', Moldura: 'M1', Metros_faltando: 1, Status: 'atendida' }
    ],
    Usuarios: [{ nome: 'Ana', ativo: '' }, { nome: 'Bia', ativo: 'FALSE' }]
  });
  const s = js(ctx.appSync());
  assert.equal(s.molduras.length, 1);
  assert.equal(s.molduras[0].local, 'CR3-E2');
  assert.equal(s.molduras[0].estoque_m, 27);
  assert.deepEqual(s.materiais.map((m) => m.codigo), ['V1']);
  assert.equal(s.paspatur_m2, 330);
  assert.equal(s.taxa_pintura_chapa, 30);
  assert.deepEqual(s.casinhas_contadas, ['CR1-E1']);
  assert.deepEqual(s.orcamentos_abertos.map((o) => o.id), ['ORC-0001']);
  assert.deepEqual(s.compras_pendentes.map((c) => c.id), ['CMP-0001']);
  assert.deepEqual(s.atendentes, ['Ana']);
});

test('appSync: responde antes das abas do app existirem', () => {
  const { ctx } = montar({ Molduras: [moldura(5)] }, {});
  const s = js(ctx.appSync());
  assert.equal(s.molduras.length, 1);
  assert.deepEqual(s.casinhas_contadas, []);
  assert.deepEqual(s.orcamentos_abertos, []);
  assert.deepEqual(s.compras_pendentes, []);
  assert.deepEqual(s.atendentes, []);
});

function comAcaoFalsa(ctx) {
  const feitas = [];
  ctx._executarAcaoApp = (acao, dados) => {
    feitas.push(acao);
    if (dados.falhar) throw new Error('deu ruim');
    return { feito: acao };
  };
  return feitas;
}

test('appExecutar: roda a ação e guarda o id_op', () => {
  const { ctx, dados } = montar({});
  const feitas = comAcaoFalsa(ctx);
  const r = js(ctx.appExecutar({ id_op: 'op-00000001', acao: 'salvarOrcamento', dados: {} }));
  assert.deepEqual(r, { repetida: false, resultado: { feito: 'salvarOrcamento' } });
  assert.deepEqual(feitas, ['salvarOrcamento']);
  assert.equal(dados.AppOperacoes.length, 1);
  assert.equal(dados.AppOperacoes[0].Id_op, 'op-00000001');
  assert.equal(dados.AppOperacoes[0].Acao, 'salvarOrcamento');
});

test('appExecutar: o mesmo id_op devolve o resultado guardado sem rodar de novo', () => {
  const { ctx, dados } = montar({});
  const feitas = comAcaoFalsa(ctx);
  const corpo = { id_op: 'op-00000002', acao: 'fecharVenda', dados: {} };
  ctx.appExecutar(corpo);
  const r = js(ctx.appExecutar(corpo));
  assert.deepEqual(r, { repetida: true, resultado: { feito: 'fecharVenda' } });
  assert.deepEqual(feitas, ['fecharVenda']);
  assert.equal(dados.AppOperacoes.length, 1);
});

test('appExecutar: ação que falha não guarda o id_op e pode ser repetida', () => {
  const { ctx, dados } = montar({});
  const feitas = comAcaoFalsa(ctx);
  assert.throws(() => ctx.appExecutar({ id_op: 'op-00000003', acao: 'entradaMoldura', dados: { falhar: true } }), /deu ruim/);
  assert.equal(dados.AppOperacoes.length, 0);
  ctx.appExecutar({ id_op: 'op-00000003', acao: 'entradaMoldura', dados: {} });
  assert.deepEqual(feitas, ['entradaMoldura', 'entradaMoldura']);
  assert.equal(dados.AppOperacoes.length, 1);
});

test('appExecutar: pedido inválido é recusado antes de tocar a planilha', () => {
  const { ctx, dados } = montar({});
  const feitas = comAcaoFalsa(ctx);
  assert.throws(() => ctx.appExecutar({ id_op: 'curto', acao: 'salvarOrcamento' }), /id_op/);
  assert.throws(() => ctx.appExecutar({ id_op: 'op-00000004', acao: 'apagarTudo' }), /Ação desconhecida/);
  assert.deepEqual(feitas, []);
  assert.equal(dados.AppOperacoes.length, 0);
});

const pedidoOrc = (extra = {}) => ({
  ref_app: 'ref-00000001', atendente: 'Ana', cliente: 'Maria', telefone: '44999990000',
  largura_cm: 90, altura_cm: 60, quantidade: 1, moldura: 'M1', vidro: 'V1', ...extra
});

test('salvarOrcamento: cria ORC-0001 aberto e não mexe no estoque', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(2.7)], Vidros: [vidro] });
  const r = js(ctx.appExecutar({ id_op: 'op-00000010', acao: 'salvarOrcamento', dados: pedidoOrc() }));
  assert.deepEqual(r.resultado, { id: 'ORC-0001', valor_calculado: 271.2, valor_final: 271.2, consumo_m: 3.426 });
  assert.equal(dados.Orcamentos.length, 1);
  assert.equal(dados.Orcamentos[0].Status, 'aberto');
  assert.equal(dados.Orcamentos[0].Ref_app, 'ref-00000001');
  assert.equal(dados.Orcamentos[0].Cliente, 'Maria');
  assert.equal(dados.Molduras[0].Estoque_atual_m, 2.7);
  assert.equal(dados.Historico.length, 0);
});

test('salvarOrcamento: o mesmo ref_app atualiza o mesmo orçamento e guarda o valor ajustado', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(2.7)], Vidros: [vidro] });
  ctx.appExecutar({ id_op: 'op-00000011', acao: 'salvarOrcamento', dados: pedidoOrc() });
  const r = js(ctx.appExecutar({
    id_op: 'op-00000012', acao: 'salvarOrcamento', dados: pedidoOrc({ quantidade: 2, valor_final: '500' })
  }));
  assert.equal(r.resultado.id, 'ORC-0001');
  assert.equal(r.resultado.valor_calculado, 542.4);
  assert.equal(r.resultado.valor_final, 500);
  assert.equal(dados.Orcamentos.length, 1);
  assert.equal(dados.Orcamentos[0].Quantidade, 2);
  assert.equal(dados.Orcamentos[0].Consumo_m, 6.852);
});

test('salvarOrcamento: paspatur faz o quadro crescer e entra no valor', () => {
  const { ctx } = montar({ Molduras: [moldura(27)] });
  const r = js(ctx.appExecutar({
    id_op: 'op-00000013', acao: 'salvarOrcamento',
    dados: pedidoOrc({ largura_cm: 20, altura_cm: 30, paspatur_cm: 5, vidro: '' })
  }));
  assert.equal(r.resultado.valor_calculado, 120.8);
  assert.equal(r.resultado.consumo_m, 1.826);
});

test('fecharVenda: moldura que não dá exige confirmar a encomenda e não grava nada', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(2.7)], Vidros: [vidro] });
  assert.throws(
    () => ctx.appExecutar({ id_op: 'op-00000020', acao: 'fecharVenda', dados: pedidoOrc() }),
    /faltam 0\.726 m/
  );
  assert.equal(dados.Molduras[0].Estoque_atual_m, 2.7);
  assert.equal(dados.Orcamentos.length, 0);
  assert.equal(dados.Compras.length, 0);
  assert.equal(dados.Historico.length, 0);
  assert.equal(dados.AppOperacoes.length, 0);
});

test('fecharVenda: baixa até zerar, a falta vai pra Compras e o orçamento fecha', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(2.7)], Vidros: [vidro] });
  const r = js(ctx.appExecutar({ id_op: 'op-00000021', acao: 'fecharVenda', dados: pedidoOrc({ encomendar: true }) }));
  assert.deepEqual(r.resultado, {
    id: 'ORC-0001', valor_final: 271.2, baixa_m: 2.7, falta_m: 0.726, novo_estoque_m: 0, compra_id: 'CMP-0001',
    molduras: [{ codigo: 'M1', baixa_m: 2.7, falta_m: 0.726, novo_estoque_m: 0, compra_id: 'CMP-0001' }],
    ordem_id: ''
  });
  assert.equal(dados.Molduras[0].Estoque_atual_m, 0);
  assert.equal(dados.Compras.length, 1);
  assert.equal(dados.Compras[0].Metros_faltando, 0.726);
  assert.equal(dados.Compras[0].Status, 'pendente');
  assert.equal(dados.Compras[0].Orcamento_id, 'ORC-0001');
  assert.equal(dados.Compras[0].Marca, 'Moldurarte');
  assert.equal(dados.Orcamentos[0].Status, 'fechado');
  assert.equal(dados.Orcamentos[0].Falta_m, 0.726);
  assert.equal(dados.Orcamentos[0].Fechado_por, 'Ana');
  const vendas = dados.Historico.filter((h) => h.Tipo_movimentacao === 'venda');
  assert.deepEqual(vendas.map((h) => h.Codigo), ['M1', 'V1']);
  assert.equal(vendas[0].Quantidade, 2.7);
  assert.equal(Number((vendas[0].Valor + vendas[1].Valor).toFixed(2)), 271.2);
});

test('fecharVenda: com moldura sobrando baixa o consumo, não cria compra e vale o valor ajustado', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(12.3)], Vidros: [vidro] });
  const r = js(ctx.appExecutar({ id_op: 'op-00000022', acao: 'fecharVenda', dados: pedidoOrc({ valor_final: 250 }) }));
  assert.equal(r.resultado.novo_estoque_m, 8.874);
  assert.equal(r.resultado.compra_id, '');
  assert.equal(r.resultado.valor_final, 250);
  assert.equal(dados.Compras.length, 0);
  const vendas = dados.Historico.filter((h) => h.Tipo_movimentacao === 'venda');
  assert.equal(Number((vendas[0].Valor + vendas[1].Valor).toFixed(2)), 250);
});

test('fecharVenda: fecha o orçamento salvo antes pelo ref_app; fechado não reabre', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(12.3)], Vidros: [vidro] });
  ctx.appExecutar({ id_op: 'op-00000023', acao: 'salvarOrcamento', dados: pedidoOrc() });
  ctx.appExecutar({ id_op: 'op-00000024', acao: 'fecharVenda', dados: pedidoOrc() });
  assert.equal(dados.Orcamentos.length, 1);
  assert.equal(dados.Orcamentos[0].Status, 'fechado');
  assert.throws(() => ctx.appExecutar({ id_op: 'op-00000025', acao: 'salvarOrcamento', dados: pedidoOrc() }), /já foi fechado/);
  assert.throws(() => ctx.appExecutar({ id_op: 'op-00000026', acao: 'fecharVenda', dados: pedidoOrc() }), /já foi fechado/);
  assert.equal(dados.Molduras[0].Estoque_atual_m, 8.874);
});

const caixa = (estoque) => moldura(estoque, {
  Codigo: 'M2', Nome: 'Caixa preta 5cm', Marca: 'Artmold', Largura_perfil_cm: 5, Valor_por_metro: 70, Local: ''
});
const chapa = { Codigo: 'C1', Nome: 'Eucatex', Valor_por_m2: 100, Estoque_atual_m2: 10, Disponivel: true };
const quatroQuadros = () => [
  { tipo: 'quadro', largura_cm: 90, altura_cm: 60, quantidade: 1, moldura: 'M1', vidro: 'V1' },
  { tipo: 'quadro', largura_cm: 20, altura_cm: 30, quantidade: 2, paspatur_cm: 5, moldura: 'M1' },
  { tipo: 'reforma', largura_cm: 40, altura_cm: 60, quantidade: 1, vidro: 'V1' },
  {
    tipo: 'camiseta', tamanho: 'M', largura_cm: 52, altura_cm: 72, margem_cm: 4, quantidade: 1,
    moldura: 'M2', vidro: 'V1', chapa: 'C1', objeto_alto: true
  }
];
const pedidoVarios = (quadros = quatroQuadros(), extra = {}) => ({
  ref_app: 'ref-00000001', atendente: 'Ana', cliente: 'Maria', telefone: '44999990000', quadros, ...extra
});
const abasVarios = (m1 = 27, m2 = 27) => ({ Molduras: [moldura(m1), caixa(m2)], Vidros: [vidro], Chapas: [chapa] });

test('salvarOrcamento: vários quadros viram uma linha por quadro e o orçamento guarda as somas', () => {
  const { ctx, dados } = montar(abasVarios());
  const camiseta = js(ctx._calcularOrcamentoApp({ largura_cm: 60, altura_cm: 80, moldura: 'M2', vidro: 'V1', chapa: 'C1', objeto_alto: true }));
  const total = Number((271.2 + 241.6 + 43.2 + camiseta.valor_total).toFixed(2));
  const consumo = Number((3.426 + 3.652 + camiseta.consumo_moldura_m).toFixed(3));
  const r = js(ctx.appExecutar({ id_op: 'op-00000030', acao: 'salvarOrcamento', dados: pedidoVarios() }));
  assert.deepEqual(r.resultado, { id: 'ORC-0001', valor_calculado: total, valor_final: total, consumo_m: consumo });
  const o = dados.Orcamentos[0];
  assert.equal(o.Quadros, '90 x 60; 2x 20 x 30; reforma 40 x 60; camiseta M');
  assert.equal(o.Quantidade, 5);
  assert.equal(o.Largura_cm, '');
  assert.equal(o.Moldura, '');
  assert.equal(o.Valor_calculado, total);
  const q = dados.Orcamento_quadros;
  assert.deepEqual(q.map((x) => x.N), [1, 2, 3, 4]);
  assert.deepEqual(q.map((x) => x.Tipo), ['quadro', 'quadro', 'reforma', 'camiseta']);
  assert.ok(q.every((x) => x.Orcamento === 'ORC-0001' && x.Ref_app === 'ref-00000001'));
  assert.deepEqual(q.map((x) => x.Valor_calculado), [271.2, 241.6, 43.2, camiseta.valor_total]);
  assert.equal(q[1].Paspatur_cm, 5);
  assert.equal(q[1].Consumo_m, 3.652);
  assert.equal(q[3].Tamanho, 'M');
  assert.equal(q[3].Margem_cm, 4);
  assert.equal(q[3].Largura_cm, 52);
  assert.equal(q[3].Objeto_alto, true);
  assert.equal(camiseta.pintura_chapa, 30);
});

test('salvarOrcamento: salvar de novo com menos quadros apaga só as linhas que sobraram', () => {
  const { ctx, dados } = montar(abasVarios());
  ctx.appExecutar({ id_op: 'op-00000031', acao: 'salvarOrcamento', dados: pedidoVarios() });
  ctx.appExecutar({
    id_op: 'op-00000032', acao: 'salvarOrcamento',
    dados: pedidoVarios([quatroQuadros()[2]], { ref_app: 'ref-00000002', cliente: 'João' })
  });
  const [a, , c] = quatroQuadros();
  ctx.appExecutar({ id_op: 'op-00000033', acao: 'salvarOrcamento', dados: pedidoVarios([c, a]) });
  const doPrimeiro = dados.Orcamento_quadros.filter((x) => x.Ref_app === 'ref-00000001');
  assert.deepEqual(doPrimeiro.map((x) => [x.N, x.Tipo]), [[1, 'reforma'], [2, 'quadro']]);
  assert.equal(dados.Orcamento_quadros.filter((x) => x.Ref_app === 'ref-00000002').length, 1);
  assert.equal(dados.Orcamentos[0].Quadros, 'reforma 40 x 60; 90 x 60');
  assert.equal(dados.Orcamentos[0].Valor_calculado, 314.4);
});

test('salvarOrcamento: pedido antigo de um quadro também grava a linha do quadro', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(27)], Vidros: [vidro] });
  ctx.appExecutar({ id_op: 'op-00000034', acao: 'salvarOrcamento', dados: pedidoOrc() });
  assert.equal(dados.Orcamento_quadros.length, 1);
  assert.equal(dados.Orcamento_quadros[0].Tipo, 'quadro');
  assert.equal(dados.Orcamento_quadros[0].Largura_cm, 90);
  assert.equal(dados.Orcamentos[0].Quadros, '90 x 60');
});

test('appSync: abertos levam os quadros; orçamento antigo vira 1 quadro', () => {
  const { ctx } = montar({
    ...abasVarios(),
    Orcamentos: [{
      ID: 'ORC-0001', Ref_app: 'antigo-0001', Status: 'aberto', Cliente: 'Lia', Largura_cm: 30, Altura_cm: 40,
      Quantidade: 2, Paspatur_cm: 5, Moldura: 'M1', Vidro: 'V1', Chapa: '', Espelho: '', Vidro_duplo: false,
      Objeto_alto: false, Valor_calculado: 300, Consumo_m: 4
    }]
  });
  ctx.appExecutar({ id_op: 'op-00000035', acao: 'salvarOrcamento', dados: pedidoVarios() });
  const abertos = js(ctx.appSync()).orcamentos_abertos;
  const antigo = abertos.find((o) => o.ref_app === 'antigo-0001');
  assert.deepEqual(antigo.quadros, [{
    tipo: 'quadro', tamanho: '', largura_cm: 30, altura_cm: 40, margem_cm: 0, quantidade: 2, paspatur_cm: 5,
    moldura: 'M1', vidro: 'V1', chapa: '', espelho: '', vidro_duplo: false, objeto_alto: false,
    valor_calculado: 300, consumo_m: 4, servicos: []
  }]);
  const novo = abertos.find((o) => o.ref_app === 'ref-00000001');
  assert.equal(novo.id, 'ORC-0002');
  assert.deepEqual(novo.quadros.map((q) => q.tipo), ['quadro', 'quadro', 'reforma', 'camiseta']);
  assert.equal(novo.quadros[3].tamanho, 'M');
  assert.equal(novo.quadros[3].margem_cm, 4);
  assert.equal(novo.quadros[1].valor_calculado, 241.6);
  assert.equal(novo.resumo, '90 x 60; 2x 20 x 30; reforma 40 x 60; camiseta M');
});

test('fecharVenda: vários quadros somam a moldura repetida e cada falta vira uma compra', () => {
  const { ctx, dados } = montar(abasVarios(5, 0));
  const camiseta = js(ctx._calcularOrcamentoApp({ largura_cm: 60, altura_cm: 80, moldura: 'M2', vidro: 'V1', chapa: 'C1', objeto_alto: true }));
  assert.throws(
    () => ctx.appExecutar({ id_op: 'op-00000036', acao: 'fecharVenda', dados: pedidoVarios() }),
    /Madeira lisa 3cm faltam 2\.078 m; Caixa preta 5cm faltam/
  );
  assert.equal(dados.Orcamentos.length, 0);
  const r = js(ctx.appExecutar({ id_op: 'op-00000037', acao: 'fecharVenda', dados: pedidoVarios(undefined, { encomendar: true }) }));
  assert.deepEqual(r.resultado.molduras, [
    { codigo: 'M1', baixa_m: 5, falta_m: 2.078, novo_estoque_m: 0, compra_id: 'CMP-0001' },
    { codigo: 'M2', baixa_m: 0, falta_m: camiseta.consumo_moldura_m, novo_estoque_m: 0, compra_id: 'CMP-0002' }
  ]);
  assert.equal(r.resultado.falta_m, Number((2.078 + camiseta.consumo_moldura_m).toFixed(3)));
  assert.equal(r.resultado.novo_estoque_m, null);
  assert.deepEqual(dados.Molduras.map((m) => m.Estoque_atual_m), [0, 0]);
  assert.deepEqual(dados.Compras.map((c) => [c.Moldura, c.Orcamento_id, c.Cliente]), [['M1', 'ORC-0001', 'Maria'], ['M2', 'ORC-0001', 'Maria']]);
  assert.equal(dados.Orcamentos[0].Status, 'fechado');
  const vendas = dados.Historico.filter((h) => h.Tipo_movimentacao === 'venda');
  assert.deepEqual(vendas.map((h) => h.Codigo), ['M1', 'V1', 'M1', '', 'V1', 'M2', 'V1', 'C1', 'C1']);
  assert.deepEqual(vendas.filter((h) => h.Codigo === 'M1').map((h) => h.Quantidade), [3.426, 1.574]);
  assert.match(vendas[2].Observacoes, /quadro 2; faltou 2\.078 m/);
  assert.equal(vendas[3].Categoria, 'paspatur');
  assert.match(vendas[4].Observacoes, /quadro 3 \(reforma\)/);
  assert.match(vendas[5].Observacoes, /quadro 4 \(camiseta M\)/);
  assert.equal(vendas[8].Produto, 'Pintura de chapa');
  assert.equal(vendas[8].Valor, 30);
  const soma = vendas.reduce((s, h) => s + h.Valor, 0);
  assert.equal(Number(soma.toFixed(2)), r.resultado.valor_final);
});

test('fecharVenda: valor ajustado é repartido entre todos os quadros', () => {
  const { ctx, dados } = montar(abasVarios());
  ctx.appExecutar({ id_op: 'op-00000038', acao: 'fecharVenda', dados: pedidoVarios(undefined, { valor_final: 800 }) });
  const vendas = dados.Historico.filter((h) => h.Tipo_movimentacao === 'venda');
  assert.equal(Number(vendas.reduce((s, h) => s + h.Valor, 0).toFixed(2)), 800);
  assert.equal(dados.Orcamentos[0].Valor_final, 800);
});

const objetoComServico = () => ({
  tipo: 'objeto', largura_cm: 52, altura_cm: 72, margem_cm: 4, quantidade: 1, vidro: 'V1', chapa: 'C1', objeto_alto: true,
  servicos: [{ descricao: 'Instalação', valor: 20 }]
});
const reformaSoServico = () => ({ tipo: 'reforma', quantidade: 1, servicos: [{ descricao: 'Limpar vidros', valor: 30 }] });

test('salvarOrcamento: objeto usa a borda, reforma sem medida vale só o serviço ou a pintura', () => {
  const { ctx, dados } = montar(abasVarios());
  const r = js(ctx.appExecutar({
    id_op: 'op-00000040', acao: 'salvarOrcamento',
    dados: pedidoVarios([objetoComServico(), reformaSoServico(), { tipo: 'reforma', quantidade: 2, objeto_alto: true }])
  }));
  assert.equal(r.resultado.valor_calculado, 274.4);
  assert.equal(dados.Orcamentos[0].Quadros, 'objeto 52 x 72 (Instalação); reforma (Limpar vidros); 2x reforma');
  const q = dados.Orcamento_quadros;
  assert.deepEqual(q.map((x) => x.Tipo), ['objeto', 'reforma', 'reforma']);
  assert.deepEqual(q.map((x) => x.Valor_calculado), [184.4, 30, 60]);
  assert.equal(q[0].Margem_cm, 4);
  assert.equal(q[0].Paspatur_cm, 0);
  assert.equal(q[0].Tamanho, '');
  assert.equal(q[1].Largura_cm, 0);
  assert.equal(q[1].Servicos, '[{"descricao":"Limpar vidros","valor":30}]');
  assert.equal(q[2].Servicos, '');
  const aberto = js(ctx.appSync()).orcamentos_abertos[0];
  assert.equal(aberto.quadros[0].tipo, 'objeto');
  assert.equal(aberto.quadros[0].margem_cm, 4);
  assert.deepEqual(aberto.quadros[1].servicos, [{ descricao: 'Limpar vidros', valor: 30 }]);
  assert.deepEqual(aberto.quadros[2].servicos, []);
});

test('salvarOrcamento: reforma que troca material ainda precisa da medida', () => {
  const { ctx } = montar(abasVarios());
  assert.throws(
    () => ctx.appExecutar({ id_op: 'op-00000041', acao: 'salvarOrcamento', dados: pedidoVarios([{ tipo: 'reforma', vidro: 'V1' }]) }),
    /Informe largura e altura/
  );
});

test('fecharVenda: cada serviço vira uma venda no histórico e entra no valor ajustado', () => {
  const quadros = () => [
    { tipo: 'quadro', largura_cm: 90, altura_cm: 60, quantidade: 1, moldura: 'M1', vidro: 'V1', servicos: [{ descricao: 'Instalação', valor: 20 }] },
    reformaSoServico()
  ];
  const { ctx, dados } = montar(abasVarios());
  const r = js(ctx.appExecutar({ id_op: 'op-00000042', acao: 'fecharVenda', dados: pedidoVarios(quadros()) }));
  assert.equal(r.resultado.valor_final, 321.2);
  const vendas = dados.Historico.filter((h) => h.Tipo_movimentacao === 'venda');
  assert.deepEqual(vendas.map((h) => h.Categoria), ['moldura', 'vidro', 'servico', 'servico']);
  assert.deepEqual(vendas.slice(2).map((h) => [h.Produto, h.Valor, h.Codigo]), [['Instalação', 20, ''], ['Limpar vidros', 30, '']]);
  assert.match(vendas[3].Observacoes, /quadro 2 \(reforma\); serviço/);
  const ajustado = montar(abasVarios());
  ajustado.ctx.appExecutar({ id_op: 'op-00000043', acao: 'fecharVenda', dados: pedidoVarios(quadros(), { valor_final: 300 }) });
  const v2 = ajustado.dados.Historico.filter((h) => h.Tipo_movimentacao === 'venda');
  assert.equal(Number(v2.reduce((s, h) => s + h.Valor, 0).toFixed(2)), 300);
  assert.ok(v2[2].Valor < 20);
});

test('fecharVenda: reforma sem nada marcado e com valor digitado grava uma venda de Reforma', () => {
  const { ctx, dados } = montar(abasVarios());
  ctx.appExecutar({ id_op: 'op-00000044', acao: 'fecharVenda', dados: pedidoVarios([{ tipo: 'reforma' }], { valor_final: 50 }) });
  const vendas = dados.Historico.filter((h) => h.Tipo_movimentacao === 'venda');
  assert.deepEqual(vendas.map((h) => [h.Categoria, h.Produto, h.Valor]), [['servico', 'Reforma', 50]]);
  assert.equal(dados.Orcamentos[0].Status, 'fechado');
  const pintura = montar(abasVarios());
  pintura.ctx.appExecutar({ id_op: 'op-00000045', acao: 'fecharVenda', dados: pedidoVarios([{ tipo: 'reforma', objeto_alto: true }]) });
  const v2 = pintura.dados.Historico.filter((h) => h.Tipo_movimentacao === 'venda');
  assert.deepEqual(v2.map((h) => [h.Produto, h.Valor]), [['Pintura de chapa', 30]]);
});

test('descartarOrcamento: tira da lista de abertos sem mexer no estoque nem no histórico', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(12.3)], Vidros: [vidro] });
  ctx.appExecutar({ id_op: 'op-00000027', acao: 'salvarOrcamento', dados: pedidoOrc() });
  const r = js(ctx.appExecutar({
    id_op: 'op-00000028', acao: 'descartarOrcamento', dados: { ref_app: 'ref-00000001', atendente: 'Bruno' }
  }));
  assert.deepEqual(r.resultado, { id: 'ORC-0001' });
  assert.equal(dados.Orcamentos[0].Status, 'descartado');
  assert.equal(dados.Orcamentos[0].Fechado_por, 'Bruno');
  assert.ok(dados.Orcamentos[0].Data_fechamento);
  assert.equal(dados.Molduras[0].Estoque_atual_m, 12.3);
  assert.equal(dados.Historico.length, 0);
  assert.equal(js(ctx.appSync()).orcamentos_abertos.length, 0);
  assert.throws(() => ctx.appExecutar({ id_op: 'op-00000029', acao: 'fecharVenda', dados: pedidoOrc() }), /já foi fechado/);
});

test('descartarOrcamento: orçamento que nunca chegou na planilha não dá erro', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(12.3)] });
  const r = js(ctx.appExecutar({ id_op: 'op-0000002a', acao: 'descartarOrcamento', dados: { ref_app: 'ref-nunca-salvo' } }));
  assert.deepEqual(r.resultado, { id: '' });
  assert.equal(dados.Orcamentos.length, 0);
});

test('entradaMoldura: soma no estoque e registra a entrada', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(5)] });
  const r = js(ctx.appExecutar({
    id_op: 'op-00000030', acao: 'entradaMoldura', dados: { codigo: 'M1', metros: '20', atendente: 'Ana' }
  }));
  assert.deepEqual(r.resultado, { codigo: 'M1', novo_estoque_m: 25, separado_m: 0, compras_atendidas: [] });
  assert.equal(dados.Molduras[0].Estoque_atual_m, 25);
  assert.equal(dados.Historico[0].Tipo_movimentacao, 'entrada');
  assert.equal(dados.Historico[0].Quantidade, 20);
});

test('entradaMoldura: separa primeiro a falta de quem já fechou e marca a compra atendida', () => {
  const { ctx, dados } = montar({
    Molduras: [moldura(0)],
    Compras: [
      { ID: 'CMP-0001', Moldura: 'M1', Metros_faltando: 0.726, Status: 'pendente', Data_atendida: '' },
      { ID: 'CMP-0002', Moldura: 'OUTRA', Metros_faltando: 3, Status: 'pendente', Data_atendida: '' }
    ]
  });
  const r = js(ctx.appExecutar({ id_op: 'op-00000031', acao: 'entradaMoldura', dados: { codigo: 'M1', metros: 20 } }));
  assert.equal(r.resultado.novo_estoque_m, 19.274);
  assert.equal(r.resultado.separado_m, 0.726);
  assert.deepEqual(r.resultado.compras_atendidas, ['CMP-0001']);
  assert.equal(dados.Compras[0].Status, 'atendida');
  assert.ok(dados.Compras[0].Data_atendida);
  assert.equal(dados.Compras[1].Status, 'pendente');
});

test('entradaMoldura: o mesmo id_op não soma duas vezes', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(5)] });
  const corpo = { id_op: 'op-00000032', acao: 'entradaMoldura', dados: { codigo: 'M1', metros: 20 } };
  ctx.appExecutar(corpo);
  ctx.appExecutar(corpo);
  assert.equal(dados.Molduras[0].Estoque_atual_m, 25);
  assert.equal(dados.Historico.length, 1);
});

test('entradaMoldura: recusa metros zerados e código que não existe', () => {
  const { ctx } = montar({ Molduras: [moldura(5)] });
  assert.throws(() => ctx.appExecutar({
    id_op: 'op-00000033', acao: 'entradaMoldura', dados: { codigo: 'M1', metros: 0 }
  }), /Metros inválidos/);
  assert.throws(() => ctx.appExecutar({
    id_op: 'op-00000034', acao: 'entradaMoldura', dados: { codigo: 'X9', metros: 2 }
  }), /Moldura não encontrada/);
});

test('ajustarMoldura: grava o número contado e a diferença no histórico', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(27)] });
  const r = js(ctx.appExecutar({ id_op: 'op-00000035', acao: 'ajustarMoldura', dados: { codigo: 'M1', metros: '5,4' } }));
  assert.deepEqual(r.resultado, { codigo: 'M1', novo_estoque_m: 5.4, antes_m: 27 });
  assert.equal(dados.Molduras[0].Estoque_atual_m, 5.4);
  assert.ok(dados.Molduras[0].Contado_em);
  assert.equal(dados.Historico[0].Tipo_movimentacao, 'ajuste');
  assert.equal(dados.Historico[0].Quantidade, -21.6);
});

test('contarCasinha: define local e estoque de cada moldura e marca a casinha', () => {
  const { ctx, dados } = montar({
    Molduras: [moldura(27, { Local: '' }), moldura(27, { Codigo: 'M2', Local: '' })],
    Casinhas: [{ Codigo: 'CR1-E1', Contada_em: '', Contada_por: '' }]
  });
  const r = js(ctx.appExecutar({
    id_op: 'op-00000036', acao: 'contarCasinha',
    dados: { casinha: 'cr1-e1', atendente: 'Ana', itens: [{ codigo: 'M1', metros: 8 }, { codigo: 'M2', metros: '1,5' }] }
  }));
  assert.deepEqual(r.resultado, { casinha: 'CR1-E1', molduras: 2 });
  assert.deepEqual(dados.Molduras.map((m) => [m.Local, m.Estoque_atual_m]), [['CR1-E1', 8], ['CR1-E1', 1.5]]);
  assert.ok(dados.Casinhas[0].Contada_em);
  assert.equal(dados.Casinhas[0].Contada_por, 'Ana');
  assert.deepEqual(dados.Historico.map((h) => h.Tipo_movimentacao), ['contagem', 'contagem']);
});

test('contarCasinha: um código errado não grava nada', () => {
  const { ctx, dados } = montar({
    Molduras: [moldura(27, { Local: '' })],
    Casinhas: [{ Codigo: 'CR1-E1', Contada_em: '', Contada_por: '' }]
  });
  assert.throws(() => ctx.appExecutar({
    id_op: 'op-00000037', acao: 'contarCasinha',
    dados: { casinha: 'CR1-E1', itens: [{ codigo: 'M1', metros: 8 }, { codigo: 'NAO-EXISTE', metros: 1 }] }
  }), /Moldura não encontrada/);
  assert.equal(dados.Molduras[0].Estoque_atual_m, 27);
  assert.equal(dados.Molduras[0].Local, '');
  assert.equal(dados.Casinhas[0].Contada_em, '');
  assert.equal(dados.Historico.length, 0);
});

test('moverMoldura: troca a casinha e recusa casinha que não existe', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(27)] });
  ctx.appExecutar({ id_op: 'op-00000038', acao: 'moverMoldura', dados: { codigo: 'M1', casinha: 'pr1-4' } });
  assert.equal(dados.Molduras[0].Local, 'PR1-4');
  assert.throws(() => ctx.appExecutar({
    id_op: 'op-00000039', acao: 'moverMoldura', dados: { codigo: 'M1', casinha: 'CR7-E1' }
  }), /Casinha inválida/);
});

test('cadastrarMoldura: cria a moldura na casinha; sem preço fica indisponível', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(27)] });
  const r = js(ctx.appExecutar({
    id_op: 'op-00000040', acao: 'cadastrarMoldura',
    dados: { codigo: '0004-7705', nome: 'Dourada filete', marca: 'Artmold', perfil_cm: '1,5', metros: '6', casinha: 'CR2-F3' }
  }));
  assert.deepEqual(r.resultado, { codigo: '0004-7705', foto_url: '', disponivel: false });
  const nova = dados.Molduras[1];
  assert.equal(nova.Codigo, '0004-7705');
  assert.equal(nova.Marca, 'Artmold');
  assert.equal(nova.Largura_perfil_cm, 1.5);
  assert.equal(nova.Estoque_atual_m, 6);
  assert.equal(nova.Local, 'CR2-F3');
  assert.equal(nova.Disponivel, false);
  assert.ok(nova.Contado_em);
  assert.equal(dados.Historico[0].Tipo_movimentacao, 'contagem');
});

test('cadastrarMoldura: recusa código que já existe', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(27)] });
  assert.throws(() => ctx.appExecutar({
    id_op: 'op-00000041', acao: 'cadastrarMoldura', dados: { codigo: 'M1', nome: 'Repetida', perfil_cm: 2 }
  }), /Já existe/);
  assert.equal(dados.Molduras.length, 1);
});

test('zerarNaoEncontradas: zera só as que continuam sem casinha', () => {
  const { ctx, dados } = montar({
    Molduras: [
      moldura(5, { Local: '' }),
      moldura(3, { Codigo: 'M2', Local: 'CR1-E1' }),
      moldura(9, { Codigo: 'M3', Local: '' })
    ]
  });
  const r = js(ctx.appExecutar({ id_op: 'op-00000042', acao: 'zerarNaoEncontradas', dados: { codigos: ['M1', 'M2'] } }));
  assert.deepEqual(r.resultado, { zeradas: ['M1'] });
  assert.deepEqual(dados.Molduras.map((m) => m.Estoque_atual_m), [0, 3, 9]);
  assert.equal(dados.Historico[0].Tipo_movimentacao, 'ajuste');
  assert.equal(dados.Historico[0].Quantidade, -5);
});

const ordem = (extra = {}) => ({
  ID: 'OS-001', Data_criacao: new Date(2026, 10, 2, 9, 0), Cliente: 'Rita', Telefone: '44988887777',
  Descricao: 'Quadro 30 x 40', Prazo: '05/11/2026', Valor: 120, Status: 'em_producao', Aviso: '', Ref_app: 'os-ref-1',
  ...extra
});

test('criarOrdem: cria OS-001 em produção com ref do app e criado por app', () => {
  const { ctx, dados } = montar({ Oficina: [] });
  const r = js(ctx.appExecutar({
    id_op: 'op-00000100', acao: 'criarOrdem',
    dados: { ref_app: 'os-ref-9', cliente: ' Rita ', telefone: '44988887777', descricao: 'Reforma', prazo: '2026-11-10', valor: '150,50' }
  }));
  assert.deepEqual(r.resultado, { id: 'OS-001' });
  const o = dados.Oficina[0];
  assert.equal(o.Cliente, 'Rita');
  assert.equal(o.Prazo, '10/11/2026');
  assert.equal(o.Valor, 150.5);
  assert.equal(o.Status, 'em_producao');
  assert.equal(o.Ref_app, 'os-ref-9');
  assert.equal(o.Criado_por, 'app');
  assert.throws(() => ctx.appExecutar({ id_op: 'op-00000101', acao: 'criarOrdem', dados: { cliente: ' ' } }), /nome do cliente/);
});

test('editarOrdem e marcarPronto acham a ordem pelo ref do app ou pelo número', () => {
  const { ctx, dados } = montar({ Oficina: [ordem()] });
  ctx.appExecutar({ id_op: 'op-00000102', acao: 'editarOrdem', dados: { ref_app: 'os-ref-1', cliente: 'Rita Lima', valor: 130, prazo: '06/11/2026' } });
  assert.equal(dados.Oficina[0].Cliente, 'Rita Lima');
  assert.equal(dados.Oficina[0].Valor, 130);
  assert.equal(dados.Oficina[0].Status, 'em_producao');
  ctx.appExecutar({ id_op: 'op-00000103', acao: 'marcarPronto', dados: { id: 'OS-001' } });
  assert.equal(dados.Oficina[0].Status, 'pronto');
  assert.equal(dados.Oficina[0].Finalizado_por, 'app');
  assert.ok(dados.Oficina[0].Data_pronto);
  assert.throws(() => ctx.appExecutar({ id_op: 'op-00000104', acao: 'marcarPronto', dados: { id: 'OS-999' } }), /Ordem não encontrada/);
});

test('marcarAcabamento passa a ordem em produção pro acabamento e depois ela fica pronta', () => {
  const { ctx, dados } = montar({ Oficina: [ordem()] });
  const r = js(ctx.appExecutar({ id_op: 'op-00000110', acao: 'marcarAcabamento', dados: { ref_app: 'os-ref-1' } }));
  assert.deepEqual(r.resultado, { id: 'OS-001', status: 'acabamento' });
  assert.equal(dados.Oficina[0].Status, 'acabamento');
  ctx.appExecutar({ id_op: 'op-00000111', acao: 'marcarPronto', dados: { id: 'OS-001' } });
  assert.equal(dados.Oficina[0].Status, 'pronto');
});

test('marcarAcabamento não volta ordem que já ficou pronta ou foi entregue', () => {
  const { ctx, dados } = montar({
    Oficina: [ordem({ Status: 'pronto' }), ordem({ ID: 'OS-002', Status: 'entregue', Ref_app: '' })]
  });
  const r = js(ctx.appExecutar({ id_op: 'op-00000112', acao: 'marcarAcabamento', dados: { id: 'OS-001' } }));
  assert.deepEqual(r.resultado, { id: 'OS-001', status: 'pronto' });
  ctx.appExecutar({ id_op: 'op-00000113', acao: 'marcarAcabamento', dados: { id: 'OS-002' } });
  assert.deepEqual(dados.Oficina.map((o) => o.Status), ['pronto', 'entregue']);
});

test('marcarEntregue: lança o valor nas Entradas uma vez só', () => {
  const { ctx, dados } = montar({ Oficina: [ordem({ Status: 'pronto' })], Entradas: [{ id: 'E-0007', valor: 10 }] });
  const r = js(ctx.appExecutar({ id_op: 'op-00000105', acao: 'marcarEntregue', dados: { ref_app: 'os-ref-1' } }));
  assert.deepEqual(r.resultado, { id: 'OS-001', lancado: true });
  assert.equal(dados.Oficina[0].Status, 'entregue');
  assert.equal(dados.Entradas.length, 2);
  assert.equal(dados.Entradas[1].id, 'E-0008');
  assert.equal(dados.Entradas[1].valor, 120);
  assert.equal(dados.Entradas[1].origem, 'oficina');
  const de_novo = js(ctx.appExecutar({ id_op: 'op-00000106', acao: 'marcarEntregue', dados: { id: 'OS-001' } }));
  assert.equal(de_novo.resultado.lancado, false);
  assert.equal(dados.Entradas.length, 2);
});

test('appSync: oficina traz só em produção e prontos, mais recentes primeiro', () => {
  const { ctx } = montar({
    Molduras: [],
    Oficina: [
      ordem(),
      ordem({ ID: 'OS-002', Status: 'entregue', Ref_app: '' }),
      ordem({ ID: 'OS-003', Status: 'pronto', Aviso: 'enviado', Prazo: new Date(2026, 10, 7), Ref_app: '' })
    ]
  });
  const s = js(ctx.appSync());
  assert.deepEqual(s.oficina.map((o) => o.id), ['OS-003', 'OS-001']);
  assert.equal(s.oficina[0].prazo, '07/11/2026');
  assert.equal(s.oficina[0].aviso, 'enviado');
  assert.equal(s.oficina[1].ref_app, 'os-ref-1');
  assert.equal(s.oficina[1].valor, 120);
  assert.match(s.oficina[1].data_criacao, /^2026-11-02T/);
});

test('appSync: ordem no acabamento continua na lista ativa', () => {
  const { ctx } = montar({ Molduras: [], Oficina: [ordem({ Status: 'acabamento' })] });
  assert.deepEqual(js(ctx.appSync()).oficina.map((o) => o.status), ['acabamento']);
});

test('appOficinaHistorico: ordens criadas no mês com o resumo', () => {
  const { ctx } = montar({
    Oficina: [
      ordem({ Status: 'entregue' }),
      ordem({ ID: 'OS-002', Valor: 80 }),
      ordem({ ID: 'OS-003', Data_criacao: new Date(2026, 9, 20), Valor: 999 })
    ]
  });
  const h = js(ctx.appOficinaHistorico('2026-11'));
  assert.deepEqual(h.ordens.map((o) => o.id), ['OS-002', 'OS-001']);
  assert.deepEqual(h.resumo, { quantidade: 2, total: 200, entregues: 1 });
});

test('appOficinaHistorico: data guardada como texto também entra no mês certo', () => {
  const { ctx } = montar({
    Oficina: [
      ordem({ ID: 'OS-004', Data_criacao: '2026-11-05T10:00:00.000Z' }),
      ordem({ ID: 'OS-005', Data_criacao: '2026-10-30T10:00:00.000Z' })
    ]
  });
  assert.deepEqual(js(ctx.appOficinaHistorico('2026-11')).ordens.map((o) => o.id), ['OS-004']);
});

test('fecharVenda: com oficina cria a ordem com o valor final; sem oficina não cria', () => {
  const { ctx, dados } = montar({ Molduras: [moldura(12.3)], Vidros: [vidro], Oficina: [] });
  const r = js(ctx.appExecutar({
    id_op: 'op-00000107', acao: 'fecharVenda',
    dados: pedidoOrc({ valor_final: 250, oficina: { prazo: '2026-11-12', descricao: '90 x 60, moldura Madeira lisa 3cm' } })
  }));
  assert.equal(r.resultado.ordem_id, 'OS-001');
  const o = dados.Oficina[0];
  assert.equal(o.Cliente, 'Maria');
  assert.equal(o.Telefone, '44999990000');
  assert.equal(o.Valor, 250);
  assert.equal(o.Prazo, '12/11/2026');
  assert.equal(o.Ref_app, 'orc-ref-00000001');
  assert.equal(o.Obs, 'Orçamento ORC-0001');
  const { ctx: ctx2, dados: dados2 } = montar({ Molduras: [moldura(12.3)], Vidros: [vidro], Oficina: [] });
  const r2 = js(ctx2.appExecutar({ id_op: 'op-00000108', acao: 'fecharVenda', dados: pedidoOrc() }));
  assert.equal(r2.resultado.ordem_id, '');
  assert.equal(dados2.Oficina.length, 0);
});

function servicosFalsos(ctx, senha) {
  const props = {};
  const cache = {};
  ctx.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest: (_alg, texto) => Array.from(createHash('sha256').update(String(texto), 'utf8').digest(), (b) => (b > 127 ? b - 256 : b))
  };
  ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) };
  ctx.CacheService = {
    getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } })
  };
  if (senha) props.FINANCEIRO_PIN = ctx._hashPin(senha);
  return { props, cache };
}

const abasFin = (extra = {}) => ({
  Molduras: [], Vidros: [], Chapas: [], Espelhos: [],
  Entradas: [{ id: 'E-0001', data: new Date(2026, 10, 2), valor: 100, cliente: 'Ana' }],
  Saidas: [{ id: 'S-0001', data: new Date(2026, 10, 3), valor: 30, categoria: 'Contas', descricao: 'Luz', tipo: 'loja' }],
  Saldos: [{ conta_empresa: 500, tesouro_direto: 2000, atualizado_em: '' }],
  ...extra
});

test('appFinanceiro: sem senha criada avisa pra criar no menu', () => {
  const { ctx } = montar(abasFin());
  servicosFalsos(ctx);
  assert.throws(() => ctx.appFinanceiro({ pin: '123456' }), /ainda não foi criada no menu/);
});

test('appFinanceiro: senha certa devolve saldos, resumo, listas e vendas do sistema', () => {
  const { ctx } = montar(abasFin());
  servicosFalsos(ctx, '123456');
  const r = js(ctx.appFinanceiro({ pin: '123456', mes: '2026-11', periodo: 'tudo' }));
  assert.deepEqual(r.saldos, { conta_empresa: 570, tesouro_direto: 2000, total: 2570, atualizado_em: '' });
  assert.deepEqual(r.resumo.periodo, { entrada: 100, saida: 30, saldo: 70, margem: 70 });
  assert.equal(r.resumo.mes_sel, '2026-11');
  assert.equal(r.resumo.lancamentos.length, 2);
  assert.ok(r.config.categorias.includes('Contas'));
  assert.ok(r.config.formas.includes('Pix'));
  assert.equal(r.relatorio.periodo, 'tudo');
  assert.equal(r.relatorio.faturamento, 0);
});

test('appFinanceiro: senha errada conta os erros e 5 seguidos bloqueiam até a certa', () => {
  const { ctx } = montar(abasFin());
  const { cache } = servicosFalsos(ctx, '123456');
  assert.throws(() => ctx.appFinanceiro({ pin: '000000' }), /Senha errada/);
  assert.throws(() => ctx.appFinanceiro({ pin: '' }), /Senha errada/);
  ctx.appFinanceiro({ pin: '123456' });
  assert.equal(cache.fin_pin_erros, undefined);
  for (let i = 0; i < 5; i++) assert.throws(() => ctx.appFinanceiro({ pin: '111111' }), /Senha errada/);
  assert.throws(() => ctx.appFinanceiro({ pin: '123456' }), /Muitas tentativas erradas/);
});

test('lancarGasto e lancarVenda pelo tablet gravam com origem tablet e número seguinte', () => {
  const { ctx, dados } = montar(abasFin());
  const g = js(ctx.appExecutar({
    id_op: 'op-00000200', acao: 'lancarGasto',
    dados: { data: '2026-11-03', descricao: 'Boleto', valor: '1.234,50', categoria: 'materia-prima', pagamento: 'Pix', tipo: 'loja' }
  }));
  assert.deepEqual(g.resultado, { id: 'S-0002', valor: 1234.5, categoria: 'Matéria-Prima', tipo: 'loja' });
  assert.equal(dados.Saidas[1].origem, 'tablet');
  assert.equal(dados.Saidas[1].pagamento, 'Pix');
  const v = js(ctx.appExecutar({
    id_op: 'op-00000201', acao: 'lancarVenda', dados: { data: '2026-11-03', valor: 250, forma_pagamento: 'Dinheiro', cliente: 'Rui' }
  }));
  assert.deepEqual(v.resultado, { id: 'E-0002', valor: 250 });
  assert.equal(dados.Entradas[1].origem, 'tablet');
  assert.equal(dados.Entradas[1].cliente, 'Rui');
  assert.throws(() => ctx.appExecutar({ id_op: 'op-00000202', acao: 'lancarVenda', dados: { valor: '0' } }), /maior que zero/);
});

test('ajustarSaldos: guarda a base pra conta andar sozinha com as vendas e gastos', () => {
  const { ctx, dados } = montar(abasFin());
  servicosFalsos(ctx, '123456');
  const r = js(ctx.appExecutar({ id_op: 'op-00000203', acao: 'ajustarSaldos', dados: { conta_empresa: '1.000,00', tesouro_direto: '2500' } }));
  assert.deepEqual(r.resultado, { conta_empresa: 1000, tesouro_direto: 2500, total: 3500 });
  assert.equal(dados.Saldos[0].conta_empresa, 930);
  assert.equal(dados.Saldos.length, 1);
  assert.equal(js(ctx.appFinanceiro({ pin: '123456' })).saldos.conta_empresa, 1000);
});

function uiFalsa(respostas) {
  const alertas = [];
  const fila = [...respostas];
  return {
    alertas,
    ui: {
      ButtonSet: { OK_CANCEL: 'OK_CANCEL' },
      Button: { OK: 'OK', CANCEL: 'CANCEL' },
      prompt: () => { const t = fila.shift(); return { getSelectedButton: () => 'OK', getResponseText: () => t }; },
      alert: (m) => { alertas.push(m); }
    }
  };
}

test('definirSenhaFinanceiro: 6 números confirmados viram a senha que o app pede', () => {
  const { ctx } = montar(abasFin());
  const { props } = servicosFalsos(ctx);
  const { ui, alertas } = uiFalsa(['654321', '654321']);
  ctx.SpreadsheetApp = { getUi: () => ui };
  ctx.definirSenhaFinanceiro();
  assert.match(alertas[0], /salva/);
  assert.ok(props.FINANCEIRO_PIN);
  assert.equal(js(ctx.appFinanceiro({ pin: '654321' })).saldos.tesouro_direto, 2000);
});

test('definirSenhaFinanceiro: recusa senha que não tem 6 números ou não confere', () => {
  const { ctx } = montar(abasFin());
  const { props } = servicosFalsos(ctx);
  const curta = uiFalsa(['12345']);
  ctx.SpreadsheetApp = { getUi: () => curta.ui };
  ctx.definirSenhaFinanceiro();
  assert.match(curta.alertas[0], /exatamente 6 números/);
  const diferente = uiFalsa(['123456', '123457']);
  ctx.SpreadsheetApp = { getUi: () => diferente.ui };
  ctx.definirSenhaFinanceiro();
  assert.match(diferente.alertas[0], /não são iguais/);
  assert.equal(props.FINANCEIRO_PIN, undefined);
});
