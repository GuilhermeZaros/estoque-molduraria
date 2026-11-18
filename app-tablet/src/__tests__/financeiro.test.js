import {
  dataDe, gastoVazio, validarGasto, dadosDoGasto, vendaVazia, validarVenda, dadosDaVenda, validarSaldos,
  textoVariacao, tomDaVariacao, proporcao, opcoesDeMes, lancamentosPendentes, tetoBonito, rotuloEixo,
  gastoDoLancamento, vendaDoLancamento, lerLancamento, formaDe, partesDaForma, formaValida, textoRecebimento, detalheLancamento, nomeDoTipo, vendasPorTipo
} from '../financeiro';
import { criarCofre } from '../senhaFinanceiro';

const hoje = new Date(2026, 10, 1, 15, 0);

test('hoje e ontem viram dia/mês/ano, virando o mês', () => {
  expect(dataDe(0, hoje)).toBe('01/11/2026');
  expect(dataDe(1, hoje)).toBe('31/10/2026');
});

test('gasto precisa de descrição, valor, categoria e data válida', () => {
  const f = gastoVazio(hoje);
  expect(validarGasto(f)).toBe('Diga o que foi o gasto.');
  expect(validarGasto({ ...f, descricao: 'Luz' })).toBe('Informe um valor maior que zero.');
  expect(validarGasto({ ...f, descricao: 'Luz', valor: '120,50' })).toBe('Escolha a categoria.');
  expect(validarGasto({ ...f, descricao: 'Luz', valor: '120,50', categoria: 'Contas', data: '31/02/2026' })).toMatch(/Data inválida/);
  expect(validarGasto({ ...f, descricao: 'Luz', valor: '120,50', categoria: 'Contas' })).toBe('');
});

test('dados do gasto vão com número e tipo loja ou pessoal', () => {
  const d = dadosDoGasto({ ...gastoVazio(hoje), descricao: ' Mercado ', valor: '1.234,56', categoria: 'Outros', tipo: 'pessoal' });
  expect(d).toEqual({
    data: '01/11/2026', descricao: 'Mercado', valor: 1234.56, categoria: 'Outros', pagamento: 'Pix', tipo: 'pessoal', obs: ''
  });
  expect(dadosDoGasto({ ...gastoVazio(hoje), tipo: 'qualquer' }).tipo).toBe('loja');
});

test('venda precisa de valor e data válida', () => {
  const f = vendaVazia(hoje);
  expect(validarVenda(f)).toBe('Informe um valor maior que zero.');
  expect(validarVenda({ ...f, valor: 'abc' })).toBe('Informe um valor maior que zero.');
  expect(validarVenda({ ...f, valor: '250', forma_pagamento: 'Pix' })).toBe('');
  expect(dadosDaVenda({ ...f, valor: '250', forma_pagamento: 'Pix', cliente: ' Rui ' })).toEqual({
    data: '01/11/2026', valor: 250, forma_pagamento: 'Pix', cliente: 'Rui', obs: ''
  });
});

test('ajuste de saldos exige a conta e números válidos', () => {
  expect(validarSaldos({ conta_empresa: '', tesouro_direto: '' })).toMatch(/conta da loja/);
  expect(validarSaldos({ conta_empresa: '1.000,00', tesouro_direto: 'x' })).toBe('Valor inválido.');
  expect(validarSaldos({ conta_empresa: '1.000,00', tesouro_direto: '' })).toBe('');
});

test('variação mostra sinal e diz se foi bom ou ruim pra cada lado', () => {
  expect(textoVariacao(12.5)).toBe('+12,5%');
  expect(textoVariacao(-3)).toBe('-3%');
  expect(textoVariacao(null)).toBe('');
  expect(tomDaVariacao('entrada', 10)).toBe('bom');
  expect(tomDaVariacao('saida', 10)).toBe('ruim');
  expect(tomDaVariacao('saldo', -5)).toBe('ruim');
  expect(tomDaVariacao('saida', 0)).toBe('neutro');
});

test('proporção das barras fica entre 2 e 100, e zero quando não tem valor', () => {
  expect(proporcao(50, 200)).toBe(25);
  expect(proporcao(1, 1000)).toBe(2);
  expect(proporcao(-300, 300)).toBe(100);
  expect(proporcao(0, 300)).toBe(0);
  expect(proporcao(10, 0)).toBe(0);
});

test('meses do filtro vêm do mais novo pro mais velho, com Tudo na frente', () => {
  const meses = [{ valor: '2026-09', rotulo: 'Setembro de 2026' }, { valor: '2026-10', rotulo: 'Outubro de 2026' }];
  expect(opcoesDeMes(meses).map((m) => m.valor)).toEqual(['', '2026-10', '2026-09']);
});

test('conta os lançamentos do financeiro que ainda estão na fila', () => {
  expect(lancamentosPendentes([{ acao: 'lancarGasto' }, { acao: 'contarCasinha' }, { acao: 'ajustarSaldos' }])).toBe(2);
});

test('teto do eixo arredonda pra cima num número redondo', () => {
  expect(tetoBonito(2780)).toBe(3000);
  expect(tetoBonito(6900)).toBe(8000);
  expect(tetoBonito(1800)).toBe(2000);
  expect(tetoBonito(2400)).toBe(2500);
  expect(tetoBonito(100)).toBe(100);
  expect(tetoBonito(0)).toBe(0);
});

test('rótulo do eixo usa ponto de milhar e mil acima de 10 mil', () => {
  expect(rotuloEixo(2500)).toBe('2.500');
  expect(rotuloEixo(500)).toBe('500');
  expect(rotuloEixo(25000)).toBe('25 mil');
  expect(rotuloEixo(12500)).toBe('12,5 mil');
});

test('cofre guarda a senha por 10 minutos parados e renova a cada uso', () => {
  let agora = 0;
  const cofre = criarCofre(() => agora);
  expect(cofre.ler()).toBe('');
  cofre.guardar('123456');
  agora = 9 * 60 * 1000;
  expect(cofre.ler()).toBe('123456');
  agora += 9 * 60 * 1000;
  expect(cofre.ler()).toBe('123456');
  agora += 10 * 60 * 1000 + 1;
  expect(cofre.ler()).toBe('');
  cofre.guardar('654321');
  cofre.esquecer();
  expect(cofre.ler()).toBe('');
});

test('cofre ativo confere sem renovar o tempo', () => {
  let agora = 0;
  const cofre = criarCofre(() => agora);
  cofre.guardar('123456');
  agora = 6 * 60 * 1000;
  expect(cofre.ativo()).toBe(true);
  agora = 10 * 60 * 1000 + 1;
  expect(cofre.ativo()).toBe(false);
  expect(cofre.ler()).toBe('');
});

test('lançamento do extrato vira o formulário de editar e conta como pendente', () => {
  const gasto = { id: 'S-0003', tipo: 'saida', data: '05/11/2026', descricao: 'Luz', categoria: 'Contas', escopo: 'pessoal', valor: 45.9, pagamento: 'Pix', obs: '' };
  expect(gastoDoLancamento(gasto)).toEqual({ data: '05/11/2026', descricao: 'Luz', valor: '45,9', categoria: 'Contas', pagamento: 'Pix', tipo: 'pessoal', obs: '' });
  expect(gastoDoLancamento({ ...gasto, categoria: 'Antiga' }).categoria).toBe('Outros');
  expect(vendaDoLancamento({ id: 'E-0002', data: '02/11/2026', valor: 120, cliente: 'Ana', forma: 'Dinheiro', obs: 'x' }))
    .toEqual({ data: '02/11/2026', valor: '120', forma_pagamento: 'Dinheiro', cliente: 'Ana', obs: 'x' });
  expect(lerLancamento(JSON.stringify(gasto))).toEqual(gasto);
  expect(lerLancamento('{quebrado')).toBe(null);
  expect(lerLancamento(JSON.stringify({ valor: 1 }))).toBe(null);
  expect(lerLancamento(undefined)).toBe(null);
  expect(lancamentosPendentes([{ acao: 'editarLancamento' }, { acao: 'apagarLancamento' }, { acao: 'fotoOrdem' }])).toBe(2);
});

test('forma de recebimento: tipo, parcelas, taxa e texto', () => {
  expect(formaDe('Crédito', 3)).toBe('Crédito 3x');
  expect(formaDe('Crédito', 40)).toBe('Crédito 1x');
  expect(formaDe('Débito', 5)).toBe('Débito');
  expect(formaDe('Cheque', 1)).toBe('');
  expect(partesDaForma('Crédito 12x')).toEqual({ tipo: 'Crédito', parcelas: 12 });
  expect(partesDaForma('Crédito')).toEqual({ tipo: 'Crédito', parcelas: 1 });
  expect(partesDaForma('Boleto')).toEqual({ tipo: '', parcelas: 1 });
  expect(formaValida('Crédito 7x')).toBe(true);
  expect(formaValida('Pix')).toBe(true);
  expect(formaValida('')).toBe(false);
  expect(formaValida('Crédito')).toBe(false);
  expect(textoRecebimento(100, 'Débito')).toBe('Taxa da maquininha 0,98%: R$ 0,98. Entra R$ 99,02 no financeiro.');
  expect(textoRecebimento(100, 'Dinheiro')).toBe('Sem taxa. Entra R$ 100,00 no financeiro.');
  expect(validarVenda({ data: '01/11/2026', valor: '50', forma_pagamento: '' })).toBe('Escolha como o cliente pagou.');
  expect(vendaDoLancamento({ id: 'E-1', data: '01/11/2026', valor: 97.17, valor_bruto: 100, forma: 'Crédito 1x' }).valor).toBe('100');
  expect(detalheLancamento({ tipo: 'entrada', data: '01/11/2026', forma: 'Crédito 1x', taxa: 2.83 })).toBe('01/11/2026  ·  Crédito 1x, taxa R$ 2,83');
  expect(detalheLancamento({ tipo: 'entrada', data: '01/11/2026', forma: '', taxa: 0 })).toBe('01/11/2026');
});

test('vendas por tipo: nome amigável, junta repetidos, porcentagem e ordem', () => {
  expect(nomeDoTipo('chassi')).toBe('Tela (chassi)');
  expect(nomeDoTipo('servico')).toBe('Serviços e reforma');
  expect(nomeDoTipo('avulso')).toBe('Avulso');
  expect(nomeDoTipo('')).toBe('Outros');
  expect(vendasPorTipo([
    { categoria: 'vidro', valor: 25 },
    { categoria: 'moldura', valor: 50 },
    { categoria: 'Moldura', valor: 25 },
    { categoria: 'chapa', valor: 0 }
  ])).toEqual([
    { categoria: 'Moldura', valor: 75, pct: 75 },
    { categoria: 'Vidro', valor: 25, pct: 25 }
  ]);
  expect(vendasPorTipo(undefined)).toEqual([]);
});
