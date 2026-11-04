import { aplicarOperacao, aplicarPendentes } from '../efeitos';

const moldura = (codigo, estoque_m, local) => ({
  codigo, nome: 'Moldura ' + codigo, marca: '', estilo: '', cor: '', perfil_cm: 2, preco_m: 30,
  estoque_m, foto_url: '', local, disponivel: true
});

const base = {
  molduras: [moldura('101', 2, 'CR1-E1'), moldura('202', 10, '')],
  casinhas_contadas: ['CR1-E1'],
  orcamentos_abertos: [],
  compras_pendentes: [
    { id: 'CMP-0001', moldura: '101', metros_faltando: 1.5, cliente: 'Maria' },
    { id: 'CMP-0002', moldura: '101', metros_faltando: 4, cliente: 'João' }
  ]
};
const op = (acao, dados, extra = null) => ({ id_op: 'op-00000001', acao, dados, extra });
const achar = (p, codigo) => p.molduras.find((m) => m.codigo === codigo);

test('entrada sem resposta abate as encomendas que cabem, em ordem, e soma o resto', () => {
  const p = aplicarOperacao(base, op('entradaMoldura', { codigo: '101', metros: 5 }));
  expect(achar(p, '101').estoque_m).toBe(5.5);
  expect(p.compras_pendentes.map((c) => c.id)).toEqual(['CMP-0002']);
});

test('entrada com resposta do servidor usa o número do servidor', () => {
  const p = aplicarOperacao(base, op('entradaMoldura', { codigo: '101', metros: 5 }), {
    codigo: '101', novo_estoque_m: 7, separado_m: 0, compras_atendidas: []
  });
  expect(achar(p, '101').estoque_m).toBe(7);
  expect(p.compras_pendentes).toHaveLength(2);
});

test('correção grava o número contado', () => {
  expect(achar(aplicarOperacao(base, op('ajustarMoldura', { codigo: '202', metros: 4.2 })), '202').estoque_m).toBe(4.2);
});

test('contagem põe local e estoque e marca a casinha contada', () => {
  const p = aplicarOperacao(base, op('contarCasinha', { casinha: 'cr2-d3', itens: [{ codigo: '202', metros: 6 }] }));
  expect(achar(p, '202')).toMatchObject({ local: 'CR2-D3', estoque_m: 6 });
  expect(achar(p, '101')).toMatchObject({ local: 'CR1-E1', estoque_m: 2 });
  expect(p.casinhas_contadas).toEqual(['CR1-E1', 'CR2-D3']);
});

test('mover troca o local', () => {
  expect(achar(aplicarOperacao(base, op('moverMoldura', { codigo: '101', casinha: 'pr1-2' })), '101').local).toBe('PR1-2');
});

test('cadastro mostra a foto do tablet até o servidor devolver a do Drive', () => {
  const dados = { codigo: '303', nome: 'Nova', marca: 'Ruberti', perfil_cm: '3', preco_m: '', metros: 2.7, casinha: 'CR1-E1' };
  const antes = aplicarOperacao(base, op('cadastrarMoldura', dados, { foto_uri: 'file:///foto.jpg' }));
  expect(achar(antes, '303')).toMatchObject({ foto_url: 'file:///foto.jpg', estoque_m: 2.7, local: 'CR1-E1', disponivel: false });
  const depois = aplicarOperacao(base, op('cadastrarMoldura', dados), { codigo: '303', foto_url: 'https://drive.google.com/thumbnail?id=x', disponivel: false });
  expect(achar(depois, '303').foto_url).toBe('https://drive.google.com/thumbnail?id=x');
});

test('pendentes entram em ordem e não mexem no pacote guardado', () => {
  const p = aplicarPendentes(base, [
    op('ajustarMoldura', { codigo: '101', metros: 1 }),
    op('entradaMoldura', { codigo: '101', metros: 3 })
  ]);
  expect(achar(p, '101').estoque_m).toBe(2.5);
  expect(achar(base, '101').estoque_m).toBe(2);
});

test('ação que o app não conhece devolve o mesmo pacote', () => {
  expect(aplicarOperacao(base, op('acaoDesconhecida', {}))).toBe(base);
});

const dadosOrc = {
  ref_app: 'ref-0000-0001', atendente: 'Gui', cliente: 'Maria', telefone: '11988887777', largura_cm: 40,
  altura_cm: 50, quantidade: 1, paspatur_cm: 0, moldura: '101', vidro: '', chapa: '', espelho: '',
  vidro_duplo: false, objeto_alto: false, valor_final: 0, valor_calculado: 54, consumo_m: 2.489, obs: ''
};

test('salvar orçamento entra nos abertos sem número e depois pega o número da planilha', () => {
  const o = { ...op('salvarOrcamento', dadosOrc), criada_em: '2026-11-03T12:00:00.000Z' };
  const p = aplicarOperacao(base, o);
  expect(p.orcamentos_abertos).toHaveLength(1);
  expect(p.orcamentos_abertos[0]).toMatchObject({ id: '', ref_app: 'ref-0000-0001', cliente: 'Maria', valor_final: 54, status: 'aberto' });
  const p2 = aplicarOperacao(p, o, { id: 'ORC-0007', valor_calculado: 54, valor_final: 54, consumo_m: 2.489 });
  expect(p2.orcamentos_abertos).toHaveLength(1);
  expect(p2.orcamentos_abertos[0].id).toBe('ORC-0007');
  expect(p2.orcamentos_abertos[0].data_criacao).toBe('2026-11-03T12:00:00.000Z');
});

test('fechar venda tira dos abertos, desconta até zerar e manda a falta pra compras', () => {
  const aberto = aplicarOperacao(base, op('salvarOrcamento', dadosOrc));
  const p = aplicarOperacao(aberto, op('fecharVenda', { ...dadosOrc, consumo_m: 3.5, encomendar: true }));
  expect(p.orcamentos_abertos).toHaveLength(0);
  expect(achar(p, '101').estoque_m).toBe(0);
  const nova = p.compras_pendentes[p.compras_pendentes.length - 1];
  expect(nova).toMatchObject({ moldura: '101', metros_faltando: 1.5, cliente: 'Maria' });
});

test('fechar venda com resposta usa estoque, falta e compra da planilha', () => {
  const p = aplicarOperacao(base, op('fecharVenda', { ...dadosOrc, consumo_m: 1 }), {
    id: 'ORC-0007', novo_estoque_m: 0.8, falta_m: 0, compra_id: ''
  });
  expect(achar(p, '101').estoque_m).toBe(0.8);
  expect(p.compras_pendentes).toHaveLength(2);
});

const quadroApi = (mudar) => ({
  tipo: 'quadro', tamanho: '', largura_cm: 20, altura_cm: 30, margem_cm: 0, quantidade: 1, paspatur_cm: 0,
  moldura: '101', vidro: '', chapa: '', espelho: '', vidro_duplo: false, objeto_alto: false,
  valor_calculado: 30, consumo_m: 1.5, ...mudar
});
const dadosVarios = {
  ref_app: 'ref-0000-0002', atendente: 'Gui', cliente: 'Ana', telefone: '', valor_final: 0, valor_calculado: 330,
  consumo_m: 6, obs: '',
  quadros: [
    quadroApi(),
    quadroApi({ quantidade: 2, valor_calculado: 60 }),
    quadroApi({ tipo: 'camiseta', tamanho: 'M', largura_cm: 52, altura_cm: 72, margem_cm: 4, moldura: '202', consumo_m: 3, valor_calculado: 240 })
  ]
};

test('salvar com vários quadros guarda os quadros, o resumo e o total de peças', () => {
  const p = aplicarOperacao(base, op('salvarOrcamento', dadosVarios));
  const o = p.orcamentos_abertos[0];
  expect(o.quadros).toHaveLength(3);
  expect(o.quadros[2]).toMatchObject({ tipo: 'camiseta', tamanho: 'M', margem_cm: 4, moldura: '202' });
  expect(o.resumo).toBe('20 x 30; 2x 20 x 30; camiseta M');
  expect(o.quantidade).toBe(4);
  expect(o.valor_final).toBe(330);
});

test('salvar no formato antigo vira um quadro', () => {
  const o = aplicarOperacao(base, op('salvarOrcamento', dadosOrc)).orcamentos_abertos[0];
  expect(o.quadros).toHaveLength(1);
  expect(o.quadros[0]).toMatchObject({ tipo: 'quadro', largura_cm: 40, altura_cm: 50, moldura: '101', consumo_m: 2.489 });
  expect(o.resumo).toBe('40 x 50');
});

test('fechar com vários quadros desconta cada moldura e cria uma compra por falta', () => {
  const p = aplicarOperacao(base, op('fecharVenda', { ...dadosVarios, encomendar: true }));
  expect(achar(p, '101').estoque_m).toBe(0);
  expect(achar(p, '202').estoque_m).toBe(7);
  const novas = p.compras_pendentes.slice(2);
  expect(novas).toHaveLength(1);
  expect(novas[0]).toMatchObject({ moldura: '101', metros_faltando: 1, cliente: 'Ana' });
});

test('fechar com vários quadros e resposta usa o que a planilha mandou de cada moldura', () => {
  const p = aplicarOperacao(base, op('fecharVenda', dadosVarios), {
    id: 'ORC-0008',
    molduras: [
      { codigo: '101', baixa_m: 2, falta_m: 1, novo_estoque_m: 0, compra_id: 'CMP-0009' },
      { codigo: '202', baixa_m: 3, falta_m: 0, novo_estoque_m: 6.5, compra_id: '' }
    ]
  });
  expect(achar(p, '202').estoque_m).toBe(6.5);
  expect(p.compras_pendentes.slice(2).map((c) => [c.id, c.orcamento_id])).toEqual([['CMP-0009', 'ORC-0008']]);
});

test('descartar orçamento tira dos abertos e não mexe em estoque nem em compras', () => {
  const aberto = aplicarOperacao(base, op('salvarOrcamento', dadosOrc));
  const p = aplicarOperacao(aberto, op('descartarOrcamento', { ref_app: 'ref-0000-0001', atendente: 'Gui', cliente: 'Maria' }));
  expect(p.orcamentos_abertos).toHaveLength(0);
  expect(achar(p, '101').estoque_m).toBe(2);
  expect(p.compras_pendentes).toBe(aberto.compras_pendentes);
});

test('zerar não encontradas só zera quem está sem casinha', () => {
  const p = aplicarOperacao(base, op('zerarNaoEncontradas', { codigos: ['101', '202'] }));
  expect(achar(p, '101').estoque_m).toBe(2);
  expect(achar(p, '202').estoque_m).toBe(0);
});

const comOficina = {
  ...base,
  oficina: [
    { id: 'OS-001', ref_app: 'os-1', cliente: 'Rita', status: 'em_producao', aviso: '', prazo: '10/11/2026', valor: 100 },
    { id: 'OS-002', ref_app: '', cliente: 'Rui', status: 'pronto', aviso: 'enviado', prazo: '', valor: 50 }
  ]
};
const opEm = (acao, dados, criada_em = '2026-11-03T12:00:00.000Z') => ({ ...op(acao, dados), criada_em });

test('criar ordem entra no topo em produção e ganha o número quando a planilha responde', () => {
  const d = { ref_app: 'os-9', cliente: 'Ana', telefone: '', descricao: 'Espelho', prazo: '12/11/2026', valor: 80 };
  const p = aplicarOperacao(comOficina, opEm('criarOrdem', d));
  expect(p.oficina[0]).toMatchObject({ id: '', ref_app: 'os-9', status: 'em_producao', data_criacao: '2026-11-03T12:00:00.000Z' });
  expect(p.oficina).toHaveLength(3);
  const q = aplicarOperacao(p, opEm('criarOrdem', d), { id: 'OS-003' });
  expect(q.oficina[0].id).toBe('OS-003');
  expect(q.oficina).toHaveLength(3);
});

test('editar e marcar pronto acham a ordem pelo número ou pela referência', () => {
  const p = aplicarOperacao(comOficina, opEm('editarOrdem', { ref_app: 'os-1', cliente: 'Rita Lima', prazo: '11/11/2026', valor: 120 }));
  expect(p.oficina[0]).toMatchObject({ cliente: 'Rita Lima', prazo: '11/11/2026', valor: 120, status: 'em_producao' });
  const q = aplicarOperacao(p, opEm('marcarPronto', { id: 'OS-001', ref_app: 'os-1' }));
  expect(q.oficina[0]).toMatchObject({ status: 'pronto', aviso: '', data_pronto: '2026-11-03T12:00:00.000Z' });
});

test('acabamento vale só pra ordem em produção', () => {
  const p = aplicarOperacao(comOficina, opEm('marcarAcabamento', { ref_app: 'os-1' }));
  expect(p.oficina[0].status).toBe('acabamento');
  const q = aplicarOperacao(p, opEm('marcarAcabamento', { id: 'OS-002', ref_app: '' }));
  expect(q.oficina[1].status).toBe('pronto');
  expect(aplicarOperacao(q, opEm('marcarPronto', { ref_app: 'os-1' })).oficina[0].status).toBe('pronto');
});

test('cliente buscou tira a ordem da lista ativa', () => {
  const p = aplicarOperacao(comOficina, opEm('marcarEntregue', { id: 'OS-002', ref_app: '' }));
  expect(p.oficina.map((o) => o.id)).toEqual(['OS-001']);
});

test('fechar venda com oficina cria a ordem com o valor final e sem oficina não cria', () => {
  const d = {
    ref_app: 'ref-0000-0009', cliente: 'Maria', telefone: '11988887777', valor_final: 0, valor_calculado: 330, quadros: [],
    oficina: { prazo: '10/11/2026', descricao: '30 x 40' }
  };
  const p = aplicarOperacao(comOficina, opEm('fecharVenda', d));
  expect(p.oficina[0]).toMatchObject({ ref_app: 'orc-ref-0000-0009', cliente: 'Maria', valor: 330, prazo: '10/11/2026', status: 'em_producao' });
  const q = aplicarOperacao(comOficina, opEm('fecharVenda', d), { id: 'ORC-0009', valor_final: 300, molduras: [], ordem_id: 'OS-010' });
  expect(q.oficina[0]).toMatchObject({ id: 'OS-010', valor: 300 });
  const { oficina, ...semOficina } = d;
  expect(aplicarOperacao(comOficina, opEm('fecharVenda', semOficina)).oficina).toHaveLength(2);
});

test('lançamentos do financeiro não mexem no pacote', () => {
  expect(aplicarOperacao(comOficina, opEm('lancarGasto', { valor: 10 }))).toBe(comOficina);
  expect(aplicarOperacao(comOficina, opEm('ajustarSaldos', { conta_empresa: 10 }))).toBe(comOficina);
});
