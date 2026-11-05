import {
  orcamentoVazio, quadroVazio, duplicarQuadro, trocarTipo, mudarQuadro, servicoVazio, deAberto,
  moldurasDoOrcamento, materiaisDe, calcularQuadro, calcularPedido, avisoMoldura, avisosDoPedido, dadosParaApi,
  dadosDoTexto, filtrarAbertos, rotuloQuadro
} from '../orcamento';

const mold = (codigo, estoque_m, extra = {}) => ({
  codigo, nome: 'Moldura ' + codigo, marca: 'Artmold', estilo: '', cor: '', perfil_cm: 2, preco_m: 30,
  estoque_m, foto_url: '', local: 'CR3-E2', disponivel: true, ...extra
});
const pacote = {
  molduras: [mold('M1', 12.4), mold('M2', 3), mold('M3', 5, { preco_m: 0, disponivel: false })],
  materiais: [
    { codigo: 'VID-002', nome: 'Vidro antirreflexo', categoria: 'vidro', preco: 460, disponivel: true },
    { codigo: 'VID-001', nome: 'Vidro simples', categoria: 'vidro', preco: 180, disponivel: true },
    { codigo: 'VID-009', nome: 'Vidro velho', categoria: 'vidro', preco: 100, disponivel: false },
    { codigo: 'CHA-001', nome: 'Chapa Eucatex', categoria: 'chapa', preco: 90, disponivel: true },
    { codigo: 'ESP-001', nome: 'Espelho 3 mm', categoria: 'espelho', preco: 330, disponivel: true }
  ],
  paspatur_m2: 330,
  silicone_m2: 10,
  taxa_pintura_chapa: 30
};
const quadro = (mudar) => ({ ...quadroVazio('quadro'), largura: '40', altura: '50', ...mudar });
const objeto = (mudar) => ({ ...quadroVazio('objeto', pacote), largura: '52', altura: '72', moldura: 'M1', ...mudar });
const servico = (descricao, valor) => ({ ...servicoVazio(), descricao, valor });
const pedido = (quadros, mudar) => ({ ...orcamentoVazio('ref-0000-0001'), quadros, ...mudar });

test('orçamento novo começa com um quadro vazio', () => {
  const f = orcamentoVazio('ref-0000-0001');
  expect(f.ref_app).toBe('ref-0000-0001');
  expect([f.cliente, f.telefone, f.valor_final, f.obs]).toEqual(['', '', '', '']);
  expect(f.quadros).toHaveLength(1);
  const q = f.quadros[0];
  expect(q.tipo).toBe('quadro');
  expect(q.quantidade).toBe(1);
  expect([q.moldura, q.vidro, q.chapa, q.espelho, q.largura, q.paspatur]).toEqual(['', '', '', '', '', '']);
  expect(q.objeto_alto).toBe(false);
  expect(q.servicos).toEqual([]);
});

test('cada quadro tem uma chave própria; duplicar copia tudo com chave nova', () => {
  const a = quadro({ moldura: 'M1', vidro: 'VID-001' });
  const b = duplicarQuadro(a);
  expect(b.chave).not.toBe(a.chave);
  expect({ ...b, chave: '' }).toEqual({ ...a, chave: '' });
  expect(quadroVazio('quadro').chave).not.toBe(quadroVazio('quadro').chave);
  const c = quadro({ servicos: [servico('Instalação', '20')] });
  const d = duplicarQuadro(c);
  expect(d.servicos[0]).toMatchObject({ descricao: 'Instalação', valor: '20' });
  expect(d.servicos[0].chave).not.toBe(c.servicos[0].chave);
});

test('reforma nova começa sem nada marcado', () => {
  const q = quadroVazio('reforma', pacote);
  expect(q.tipo).toBe('reforma');
  expect([q.moldura, q.vidro, q.chapa, q.espelho]).toEqual(['', '', '', '']);
});

test('objeto novo vem com borda de 4 cm, pintura e o vidro e o fundo mais baratos', () => {
  const q = quadroVazio('objeto', pacote);
  expect(q).toMatchObject({ tipo: 'objeto', margem: '4', objeto_alto: true, vidro: 'VID-001', chapa: 'CHA-001', paspatur: '', largura: '' });
});

test('trocar pra objeto liga a pintura e tira o paspatur; voltar pra quadro desliga a pintura', () => {
  const c = trocarTipo(quadro({ paspatur: '5', vidro: 'VID-002' }), 'objeto', pacote);
  expect(c).toMatchObject({ tipo: 'objeto', paspatur: '', margem: '4', objeto_alto: true, vidro: 'VID-002', chapa: 'CHA-001' });
  const q = trocarTipo(c, 'quadro', pacote);
  expect(q).toMatchObject({ tipo: 'quadro', margem: '', objeto_alto: false, vidro: 'VID-002' });
  const r = trocarTipo(q, 'reforma', pacote);
  expect(r).toMatchObject({ tipo: 'reforma', vidro: 'VID-002' });
});

test('ligar os 2 vidros tira o paspatur e a pintura', () => {
  expect(mudarQuadro(quadro({ vidro: 'VID-001', paspatur: '5', objeto_alto: true }), { vidro_duplo: true }))
    .toMatchObject({ vidro_duplo: true, paspatur: '', borda_outra: false, objeto_alto: false });
  expect(mudarQuadro(quadro({ vidro: 'VID-001', paspatur: '6', borda_outra: true }), { vidro_duplo: true }))
    .toMatchObject({ vidro_duplo: true, paspatur: '', borda_outra: false });
});

test('escolher um paspatur desliga os 2 vidros', () => {
  const duplo = quadro({ vidro: 'VID-001', vidro_duplo: true });
  expect(mudarQuadro(duplo, { borda_outra: false, paspatur: '5' })).toMatchObject({ paspatur: '5', vidro_duplo: false });
  expect(mudarQuadro(duplo, { borda_outra: true, paspatur: '6' })).toMatchObject({ paspatur: '6', vidro_duplo: false });
  expect(mudarQuadro(duplo, { borda_outra: false, paspatur: '' })).toMatchObject({ paspatur: '', vidro_duplo: true });
});

test('ligar os 2 vidros começa sem borda; desligar ou escolher paspatur tira a borda', () => {
  const ligado = mudarQuadro(quadro({ vidro: 'VID-001' }), { vidro_duplo: true });
  expect(ligado).toMatchObject({ vidro_duplo: true, margem: '', margem_outra: false });
  const comBorda = mudarQuadro(ligado, { margem_outra: false, margem: '3' });
  expect(comBorda).toMatchObject({ vidro_duplo: true, margem: '3' });
  expect(mudarQuadro(comBorda, { vidro_duplo: false })).toMatchObject({ vidro_duplo: false, margem: '', margem_outra: false });
  expect(mudarQuadro(comBorda, { vidro: '', vidro_duplo: false })).toMatchObject({ margem: '' });
  expect(mudarQuadro(comBorda, { borda_outra: false, paspatur: '5' })).toMatchObject({ vidro_duplo: false, margem: '', paspatur: '5' });
});

test('tirar o vidro do objeto não mexe na borda do objeto', () => {
  expect(mudarQuadro(objeto(), { vidro: '', vidro_duplo: false })).toMatchObject({ margem: '4' });
});

test('2 vidros com borda: o quadro cresce e cobra o silicone', () => {
  const r = calcularQuadro(pacote, quadro({ largura: '21', altura: '30', vidro: 'VID-001', chapa: 'CHA-001', vidro_duplo: true, margem: '3' }));
  expect(r.ok).toBe(true);
  expect(r.externa).toMatchObject({ largura: 27, altura: 36 });
  expect(r.margem).toBe(3);
  expect(r.borda).toBe(0);
  expect(r.calc.itens.map((i) => [i.categoria, i.valor])).toEqual([['vidro', 35], ['silicone', 1]]);
  expect(r.calc.valor_total).toBe(36);
});

test('2 vidros sem borda ficam no tamanho da foto; sem preço não tem silicone', () => {
  const r = calcularQuadro({ ...pacote, silicone_m2: 0 }, quadro({ largura: '21', altura: '30', vidro: 'VID-001', vidro_duplo: true }));
  expect(r.externa).toMatchObject({ largura: 21, altura: 30 });
  expect(r.calc.itens.map((i) => i.categoria)).toEqual(['vidro']);
});

test('borda dos 2 vidros que não é número dá erro', () => {
  expect(calcularQuadro(pacote, quadro({ vidro: 'VID-001', vidro_duplo: true, margem: 'abc' })))
    .toEqual({ ok: false, erro: 'A borda não é um número.' });
});

test('2 vidros salvos voltam com a borda', () => {
  const salvo = (margem_cm) => deAberto({
    ref_app: 'r', quadros: [{ largura_cm: 21, altura_cm: 30, vidro: 'VID-001', vidro_duplo: true, margem_cm }]
  }).quadros[0];
  expect(salvo(3)).toMatchObject({ vidro_duplo: true, margem: '3', margem_outra: false });
  expect(salvo(6)).toMatchObject({ margem: '6', margem_outra: true });
  expect(salvo(0)).toMatchObject({ margem: '', margem_outra: false });
});

test('mudar outro campo só troca aquele campo', () => {
  const q = quadro({ vidro: 'VID-001', vidro_duplo: true });
  expect(mudarQuadro(q, { largura: '60' })).toEqual({ ...q, largura: '60' });
});

test('nome curto de cada quadro pra lista', () => {
  expect(rotuloQuadro(quadro({ largura: '20', altura: '30,5' }))).toBe('Quadro 20 x 30,5');
  expect(rotuloQuadro(quadroVazio('quadro'))).toBe('Quadro');
  expect(rotuloQuadro({ ...quadroVazio('reforma'), largura: '40', altura: '60' })).toBe('Reforma 40 x 60');
  expect(rotuloQuadro(objeto())).toBe('Objeto 52 x 72');
  expect(rotuloQuadro(quadroVazio('objeto', pacote))).toBe('Objeto');
  expect(rotuloQuadro(quadroVazio('reforma'))).toBe('Reforma');
});

test('paspatur fora das pílulas abre o campo de outra borda', () => {
  const salvo = (paspatur_cm) => deAberto({ ref_app: 'r', quadros: [{ largura_cm: 20, altura_cm: 30, paspatur_cm }] }).quadros[0];
  expect(salvo(6).borda_outra).toBe(true);
  expect(salvo(5).borda_outra).toBe(false);
  expect(salvo(0).borda_outra).toBe(false);
});

test('catálogo do orçamento só tem o que tem preço e está disponível', () => {
  expect(moldurasDoOrcamento(pacote).map((m) => m.codigo)).toEqual(['M1', 'M2']);
  expect(materiaisDe(pacote, 'vidro').map((m) => m.codigo)).toEqual(['VID-002', 'VID-001']);
});

test('quadro com paspatur e quantidade igual à planilha', () => {
  const r = calcularQuadro(pacote, quadro({ paspatur: '5', quantidade: 2, moldura: 'M1', vidro: 'VID-001', chapa: 'CHA-001' }));
  expect(r.ok).toBe(true);
  expect(r.externa).toEqual({ largura: 50, altura: 60 });
  expect(r.borda).toBe(5);
  expect(r.calc.valor_unitario).toBe(246);
  expect(r.calc.valor_total).toBe(492);
  expect(r.calc.consumo_moldura_m).toBe(4.978);
});

test('2 vidros conta o vidro duas vezes, ignora o fundo e soma o silicone; a pintura da chapa soma R$ 30', () => {
  const r = calcularQuadro(pacote, quadro({ vidro: 'VID-001', chapa: 'CHA-001', vidro_duplo: true, objeto_alto: true }));
  expect(r.calc.itens.map((i) => i.categoria)).toEqual(['vidro', 'silicone']);
  expect(r.calc.valor_total).toBe(104);
});

test('objeto de 52 x 72 fica 60 x 80 com a borda, sem cobrar paspatur, e soma a pintura', () => {
  const r = calcularQuadro(pacote, objeto());
  expect(r.ok).toBe(true);
  expect(r.externa).toEqual({ largura: 60, altura: 80 });
  expect(r.borda).toBe(0);
  expect(r.margem).toBe(4);
  expect(r.calc.itens.map((i) => i.categoria)).toEqual(['moldura', 'vidro', 'chapa']);
  expect(r.calc.pintura_chapa).toBe(30);
  expect(r.calc.valor_total).toBe(243.6);
});

test('reforma cobra só o que vai trocar', () => {
  const r = calcularQuadro(pacote, { ...quadroVazio('reforma'), largura: '40', altura: '60', vidro: 'VID-001' });
  expect(r.calc.valor_total).toBe(43.2);
});

test('reforma sem medida: nada marcado vale zero; serviço e pintura não pedem medida', () => {
  const vazia = calcularQuadro(pacote, quadroVazio('reforma'));
  expect(vazia.ok).toBe(true);
  expect(vazia.calc.valor_total).toBe(0);
  expect([vazia.largura, vazia.altura]).toEqual([0, 0]);
  const limpar = calcularQuadro(pacote, { ...quadroVazio('reforma'), servicos: [servico('Limpar vidros', '30')] });
  expect(limpar.calc.valor_total).toBe(30);
  expect(limpar.calc.servicos).toEqual([{ descricao: 'Limpar vidros', valor: 30 }]);
  const pintura = calcularQuadro(pacote, { ...quadroVazio('reforma'), objeto_alto: true, quantidade: 2 });
  expect(pintura.calc.valor_total).toBe(60);
});

test('reforma que troca material pede a medida, paspatur também', () => {
  const erro = 'Pra trocar material, informe a largura e a altura.';
  expect(calcularQuadro(pacote, { ...quadroVazio('reforma'), vidro: 'VID-001' }).erro).toBe(erro);
  expect(calcularQuadro(pacote, { ...quadroVazio('reforma'), paspatur: '5' }).erro).toBe(erro);
});

test('serviço entra uma vez no card; linha vazia some; valor que não é número avisa', () => {
  const r = calcularQuadro(pacote, quadro({
    moldura: 'M1', quantidade: 2, servicos: [servico('Instalação', '20'), servico('', ''), servico('Cortesia', '')]
  }));
  expect(r.ok).toBe(true);
  expect(r.calc.valor_total).toBe(128);
  expect(r.calc.servicos).toEqual([{ descricao: 'Instalação', valor: 20 }, { descricao: 'Cortesia', valor: 0 }]);
  expect(calcularQuadro(pacote, quadro({ moldura: 'M1', servicos: [servico('Limpar', 'abc')] })).erro)
    .toBe('O valor do serviço Limpar não é um número.');
  expect(calcularQuadro(pacote, quadro({ moldura: 'M1', servicos: [servico('', '1,2,3')] })).erro)
    .toBe('O valor do serviço não é um número.');
});

test('erros de cada tipo: sem medida, sem item, código que sumiu', () => {
  expect(calcularQuadro(pacote, quadro({ largura: '', moldura: 'M1' })).erro).toBe('Informe a largura e a altura da foto.');
  expect(calcularQuadro(pacote, quadro({})).erro).toBe('Escolha pelo menos a moldura, o vidro, o fundo ou o espelho.');
  expect(calcularQuadro(pacote, quadro({ moldura: 'X9' })).erro).toBe('A moldura X9 não está mais no catálogo.');
  expect(calcularQuadro(pacote, { ...quadroVazio('objeto', pacote), moldura: 'M1' }).erro)
    .toBe('Informe a medida do objeto.');
});

test('pedido soma os quadros, junta a moldura repetida e usa o valor passado pro cliente', () => {
  const rr = calcularPedido(pacote, pedido([
    quadro({ moldura: 'M1' }),
    quadro({ moldura: 'M1', quantidade: 2 }),
    objeto({ moldura: 'M2' })
  ], { valor_final: '500' }));
  expect(rr.ok).toBe(true);
  expect(rr.quadros).toHaveLength(3);
  expect(rr.valor_total).toBe(Number((54 + 108 + rr.quadros[2].calc.valor_total).toFixed(2)));
  expect(rr.valor_final).toBe(500);
  expect(rr.quantidade).toBe(4);
  expect(rr.molduras).toEqual([
    { codigo: 'M1', metros: Number((rr.quadros[0].calc.consumo_moldura_m + rr.quadros[1].calc.consumo_moldura_m).toFixed(3)) },
    { codigo: 'M2', metros: rr.quadros[2].calc.consumo_moldura_m }
  ]);
});

test('pedido com um quadro errado não fecha e diz qual é', () => {
  const rr = calcularPedido(pacote, pedido([quadro({ moldura: 'M1' }), quadro({ largura: '' })]));
  expect(rr.ok).toBe(false);
  expect(rr.erro).toBe('Quadro 2: Informe a largura e a altura da foto.');
  expect(rr.valor_total).toBe(54);
  const so = calcularPedido(pacote, pedido([quadro({ largura: '' })]));
  expect(so.erro).toBe('Informe a largura e a altura da foto.');
});

test('aviso da moldura nas três cores, com lugar', () => {
  const vermelho = avisoMoldura(mold('M2', 3), 4.978);
  expect(vermelho.cor).toBe('vermelho');
  expect(vermelho.titulo).toBe('Não dá');
  expect(vermelho.texto).toBe('Precisa de 4,98 m (2 varas), tem 3,00 m, faltam 1,98 m.');
  expect(vermelho.lugar).toBe('Fica em: Corredor 3, esquerda, casinha 2');
  const amarelo = avisoMoldura(mold('M2', 3), 2.489);
  expect(amarelo.cor).toBe('amarelo');
  expect(amarelo.texto).toBe('Precisa de 2,49 m (1 vara), tem 3,00 m. Sobram 0,51 m.');
  const verde = avisoMoldura(mold('M1', 12.4, { local: '' }), 2.489);
  expect(verde.cor).toBe('verde');
  expect(verde.lugar).toBe('Ainda sem casinha');
  expect(verde.naoConferida).toBe(true);
  expect(avisoMoldura(null, 2)).toBeNull();
});

test('aviso de cada moldura soma os quadros que usam ela', () => {
  const f = pedido([quadro({ moldura: 'M2', paspatur: '5' }), quadro({ vidro: 'VID-001' }), quadro({ moldura: 'M2', paspatur: '5' })]);
  const avisos = avisosDoPedido(pacote, f, calcularPedido(pacote, f));
  expect([...avisos.keys()]).toEqual(['M2']);
  const a = avisos.get('M2');
  expect(a.quadros).toEqual([1, 3]);
  expect(a.cor).toBe('vermelho');
  expect(a.texto).toBe('Precisa de 4,98 m (2 varas), tem 3,00 m, faltam 1,98 m.');
});

test('dados pra planilha: um item por quadro, chapa some com 2 vidros, objeto leva a borda, serviços vão junto', () => {
  const f = pedido([
    quadro({ moldura: 'M1', vidro: 'VID-001', chapa: 'CHA-001', vidro_duplo: true }),
    objeto(),
    { ...quadroVazio('reforma'), servicos: [servico('Limpar vidros', '30')] }
  ], { cliente: ' Maria ', telefone: '11 98888-7777', obs: ' urgente ' });
  const rr = calcularPedido(pacote, f);
  const d = dadosParaApi(f, rr);
  expect(d).toMatchObject({
    ref_app: 'ref-0000-0001', cliente: 'Maria', telefone: '11 98888-7777', obs: 'urgente',
    valor_final: 0, valor_calculado: rr.valor_total
  });
  expect(d.consumo_m).toBe(Number((rr.quadros[0].calc.consumo_moldura_m + rr.quadros[1].calc.consumo_moldura_m).toFixed(3)));
  expect(d.quadros).toEqual([
    {
      tipo: 'quadro', largura_cm: 40, altura_cm: 50, margem_cm: 0, quantidade: 1, paspatur_cm: 0,
      moldura: 'M1', vidro: 'VID-001', chapa: '', espelho: '', vidro_duplo: true, objeto_alto: false,
      valor_calculado: rr.quadros[0].calc.valor_total, consumo_m: rr.quadros[0].calc.consumo_moldura_m, servicos: []
    },
    {
      tipo: 'objeto', largura_cm: 52, altura_cm: 72, margem_cm: 4, quantidade: 1, paspatur_cm: 0,
      moldura: 'M1', vidro: 'VID-001', chapa: 'CHA-001', espelho: '', vidro_duplo: false, objeto_alto: true,
      valor_calculado: 243.6, consumo_m: rr.quadros[1].calc.consumo_moldura_m, servicos: []
    },
    {
      tipo: 'reforma', largura_cm: 0, altura_cm: 0, margem_cm: 0, quantidade: 1, paspatur_cm: 0,
      moldura: '', vidro: '', chapa: '', espelho: '', vidro_duplo: false, objeto_alto: false,
      valor_calculado: 30, consumo_m: 0, servicos: [{ descricao: 'Limpar vidros', valor: 30 }]
    }
  ]);
});

test('abrir um orçamento salvo devolve os quadros preenchidos', () => {
  const f = deAberto({
    ref_app: 'ref-0000-0009', id: 'ORC-0003', cliente: 'Ana', telefone: '119', valor_calculado: 100,
    valor_final: 90, obs: 'urgente',
    quadros: [
      { tipo: 'quadro', tamanho: '', largura_cm: 30.5, altura_cm: 40, margem_cm: 0, quantidade: 3, paspatur_cm: 0,
        moldura: 'M1', vidro: '', chapa: 'CHA-001', espelho: '', vidro_duplo: false, objeto_alto: true },
      { tipo: 'camiseta', tamanho: 'M', largura_cm: 52, altura_cm: 72, margem_cm: 4, quantidade: 1, paspatur_cm: 0,
        moldura: 'M2', vidro: 'VID-001', chapa: 'CHA-001', espelho: '', vidro_duplo: false, objeto_alto: true },
      { tipo: 'reforma', largura_cm: 0, altura_cm: 0, quantidade: 1,
        servicos: [{ descricao: 'Limpar vidros', valor: 30 }, { descricao: 'Cortesia', valor: 0 }] }
    ]
  });
  expect(f).toMatchObject({ ref_app: 'ref-0000-0009', cliente: 'Ana', valor_final: '90', obs: 'urgente' });
  expect(f.quadros).toHaveLength(3);
  expect(f.quadros[0]).toMatchObject({ tipo: 'quadro', largura: '30,5', altura: '40', quantidade: 3, paspatur: '', margem: '', chapa: 'CHA-001', objeto_alto: true, servicos: [] });
  expect(f.quadros[1]).toMatchObject({ tipo: 'objeto', largura: '52', altura: '72', margem: '4', moldura: 'M2' });
  expect(f.quadros[2]).toMatchObject({ tipo: 'reforma', largura: '', altura: '' });
  expect(f.quadros[2].servicos).toMatchObject([{ descricao: 'Limpar vidros', valor: '30' }, { descricao: 'Cortesia', valor: '' }]);
  expect(f.quadros[2].servicos[0].chave).not.toBe(f.quadros[2].servicos[1].chave);
  expect(f.quadros[0].chave).not.toBe(f.quadros[1].chave);
});

test('abrir um orçamento antigo, de antes dos vários quadros, vira um quadro', () => {
  const f = deAberto({
    ref_app: 'r', id: 'ORC-0001', cliente: 'Lia', largura_cm: 20, altura_cm: 30, quantidade: 2, paspatur_cm: 5,
    moldura: 'M1', vidro: 'VID-001', chapa: '', espelho: '', vidro_duplo: false, objeto_alto: false,
    valor_calculado: 100, valor_final: 100
  });
  expect(f.valor_final).toBe('');
  expect(f.quadros).toHaveLength(1);
  expect(f.quadros[0]).toMatchObject({ tipo: 'quadro', largura: '20', altura: '30', quantidade: 2, paspatur: '5', moldura: 'M1' });
});

test('dados do texto do WhatsApp por quadro, com nomes e valores', () => {
  const f = pedido([quadro({ moldura: 'M1', paspatur: '5', quantidade: 2, servicos: [servico('Instalação', '20')] }), objeto()], { cliente: 'Maria' });
  const rr = calcularPedido(pacote, f);
  const d = dadosDoTexto(pacote, f, rr);
  expect(d.cliente).toBe('Maria');
  expect(d.ajustado).toBe(false);
  expect(d.total).toBe(rr.valor_final);
  expect(d.quadros[0]).toMatchObject({
    tipo: 'quadro', largura: 40, altura: 50, borda: 5, externa: { largura: 50, altura: 60 }, quantidade: 2,
    moldura: 'Moldura M1', vidro: '', fundo: '', espelho: '', valor_total: rr.quadros[0].calc.valor_total,
    valor_unitario: rr.quadros[0].calc.valor_unitario, servicos: [{ descricao: 'Instalação', valor: 20 }]
  });
  expect(d.quadros[1]).toMatchObject({ tipo: 'objeto', margem: 4, externa: { largura: 60, altura: 80 }, vidro: 'Vidro simples', fundo: 'Chapa Eucatex', servicos: [] });
  expect(dadosDoTexto(pacote, { ...f, valor_final: '300' }, calcularPedido(pacote, { ...f, valor_final: '300' })).ajustado).toBe(true);
});

test('lista de abertos: mais novo primeiro e busca por nome, telefone ou número', () => {
  const abertos = [
    { ref_app: 'a', id: 'ORC-0001', cliente: 'José Antônio', telefone: '(11) 98888-7777', data_criacao: '01/11/2026 10:00' },
    { ref_app: 'b', id: '', cliente: 'Maria', telefone: '', data_criacao: '2026-11-03T12:00:00.000Z' },
    { ref_app: 'c', id: 'ORC-0002', cliente: 'Ana', telefone: '1133334444', data_criacao: '02/11/2026 09:00' }
  ];
  expect(filtrarAbertos(abertos, '').map((o) => o.ref_app)).toEqual(['b', 'c', 'a']);
  expect(filtrarAbertos(abertos, 'jose antonio').map((o) => o.ref_app)).toEqual(['a']);
  expect(filtrarAbertos(abertos, '988887777').map((o) => o.ref_app)).toEqual(['a']);
  expect(filtrarAbertos(abertos, 'orc-0002').map((o) => o.ref_app)).toEqual(['c']);
});
