export const SENHA_DEMO = '123456';

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ABREV = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const r2 = (n) => Number((Number(n) || 0).toFixed(2));
const r1 = (n) => Number((Number(n) || 0).toFixed(1));
const chaveMes = (data) => {
  const [, m, a] = String(data).split('/');
  return a + '-' + m;
};
const ms = (data) => {
  const [d, m, a] = String(data).split('/').map(Number);
  return new Date(a, m - 1, d).getTime();
};

const entrada = (id, data, valor, cliente, forma_pagamento = 'Pix') => ({ id, data, valor, cliente, forma_pagamento, origem: 'demo' });
const saida = (id, data, valor, descricao, categoria, tipo = 'loja') => ({ id, data, valor, descricao, categoria, tipo, origem: 'demo' });

function resumir(entradas, todasSaidas, mes, tipo) {
  const saidas = todasSaidas.filter((s) => !tipo || s.tipo === tipo);
  const mapa = {};
  const garante = (k) => (mapa[k] = mapa[k] || { entrada: 0, saida: 0 });
  entradas.forEach((e) => { garante(chaveMes(e.data)).entrada += e.valor; });
  saidas.forEach((s) => { garante(chaveMes(s.data)).saida += s.valor; });
  const chaves = Object.keys(mapa).sort();
  let acumulado = 0;
  const por_mes = chaves.map((k) => {
    const saldo = r2(mapa[k].entrada - mapa[k].saida);
    acumulado = r2(acumulado + saldo);
    return {
      mes: k, rotulo: ABREV[Number(k.slice(5))] + '/' + k.slice(2, 4), entrada: r2(mapa[k].entrada), saida: r2(mapa[k].saida),
      saldo, saldo_acumulado: acumulado
    };
  });
  const noMes = (lista) => lista.filter((x) => !mes || chaveMes(x.data) === mes);
  const soma = (lista) => lista.reduce((t, x) => t + x.valor, 0);
  const kpis = (ent, sai) => ({
    entrada: r2(soma(ent)), saida: r2(soma(sai)), saldo: r2(soma(ent) - soma(sai)),
    margem: soma(ent) > 0 ? r1(((soma(ent) - soma(sai)) / soma(ent)) * 100) : 0
  });
  const saidasDoMes = noMes(saidas);
  const totalCat = soma(saidasDoMes);
  const cats = {};
  saidasDoMes.forEach((s) => { cats[s.categoria] = (cats[s.categoria] || 0) + s.valor; });
  const idx = mes ? chaves.indexOf(mes) : chaves.length - 1;
  const pct = (a, b) => (Math.abs(b) > 0 ? r1(((a - b) / Math.abs(b)) * 100) : null);
  const variacao = idx >= 1
    ? {
      tem: true, mes_atual: por_mes[idx].rotulo, mes_anterior: por_mes[idx - 1].rotulo,
      entrada: pct(por_mes[idx].entrada, por_mes[idx - 1].entrada),
      saida: pct(por_mes[idx].saida, por_mes[idx - 1].saida),
      saldo: pct(por_mes[idx].saldo, por_mes[idx - 1].saldo)
    }
    : { tem: false };
  const lancamentos = [
    ...noMes(entradas).map((e) => ({ _ms: ms(e.data), data: e.data, tipo: 'entrada', descricao: e.cliente || 'Venda', categoria: 'Venda', valor: e.valor })),
    ...saidasDoMes.map((s) => ({ _ms: ms(s.data), data: s.data, tipo: 'saida', descricao: s.descricao, categoria: s.categoria, escopo: s.tipo, valor: s.valor }))
  ].sort((a, b) => b._ms - a._ms).map(({ _ms, ...l }) => l);
  return {
    mes_sel: mes,
    tipo_sel: tipo,
    meses: chaves.map((k) => ({ valor: k, rotulo: MESES[Number(k.slice(5))] + ' de ' + k.slice(0, 4) })),
    periodo: kpis(noMes(entradas), saidasDoMes),
    acumulado: kpis(entradas, saidas),
    por_mes,
    saidas_por_categoria: Object.keys(cats)
      .map((c) => ({ categoria: c, valor: r2(cats[c]), pct: totalCat > 0 ? r1((cats[c] / totalCat) * 100) : 0 }))
      .sort((a, b) => b.valor - a.valor),
    variacao,
    lancamentos,
    saidas_por_tipo: {
      loja: r2(soma(todasSaidas.filter((s) => s.tipo !== 'pessoal'))),
      pessoal: r2(soma(todasSaidas.filter((s) => s.tipo === 'pessoal')))
    }
  };
}

const FATOR = { hoje: 0.05, semana: 0.25, mes: 1, tudo: 3.2 };

function relatorio(periodo) {
  const f = FATOR[periodo] || 1;
  const faturamento = r2(6840 * f);
  const num_vendas = Math.max(1, Math.round(38 * f));
  return {
    periodo,
    faturamento,
    num_vendas,
    ticket_medio: r2(faturamento / num_vendas),
    lucro: { tem_custo: true, valor: r2(faturamento * 0.46), itens_sem_custo: 2 },
    serie_tempo: [],
    por_categoria: [
      { categoria: 'moldura', valor: r2(4210 * f), quantidade: r1(96 * f), unidade: 'm' },
      { categoria: 'vidro', valor: r2(1630 * f), quantidade: r1(9.4 * f), unidade: 'm²' },
      { categoria: 'chapa', valor: r2(1000 * f), quantidade: r1(11 * f), unidade: 'm²' }
    ],
    ranking_molduras: [
      { nome: 'Lisa preta 2 cm', metros: r1(28 * f), valor: r2(784 * f) },
      { nome: 'Rústica natural', metros: r1(19 * f), valor: r2(912 * f) },
      { nome: 'Provençal branca', metros: r1(14 * f), valor: r2(1008 * f) },
      { nome: 'Madeira escura', metros: r1(11 * f), valor: r2(495 * f) },
      { nome: 'Ouro velho', metros: r1(6 * f), valor: r2(540 * f) }
    ]
  };
}

export function criarFinanceiroDemo() {
  const entradas = [
    entrada('E-0001', '04/09/2026', 1890, 'Loja balcão'),
    entrada('E-0002', '18/09/2026', 2450, 'Ateliê Rosa', 'Crédito'),
    entrada('E-0003', '29/09/2026', 1320, 'Loja balcão', 'Dinheiro'),
    entrada('E-0004', '06/10/2026', 2780, 'Escola Arco-Íris', 'Boleto'),
    entrada('E-0005', '15/10/2026', 1960, 'Loja balcão'),
    entrada('E-0006', '27/10/2026', 2210, 'Galeria Norte', 'Link'),
    entrada('E-0007', '01/11/2026', 1430, 'Loja balcão'),
    entrada('E-0008', '02/11/2026', 980, 'Maria Souza', 'Débito')
  ];
  const saidas = [
    saida('S-0001', '05/09/2026', 1800, 'Salário ajudante', 'Salários'),
    saida('S-0002', '10/09/2026', 640, 'Luz e internet', 'Contas'),
    saida('S-0003', '20/09/2026', 1250, 'Varas Moldurarte', 'Matéria-Prima'),
    saida('S-0004', '22/09/2026', 400, 'Mercado', 'Outros', 'pessoal'),
    saida('S-0005', '05/10/2026', 1800, 'Salário ajudante', 'Salários'),
    saida('S-0006', '10/10/2026', 690, 'Luz e internet', 'Contas'),
    saida('S-0007', '14/10/2026', 980, 'Vidros', 'Matéria-Prima'),
    saida('S-0008', '20/10/2026', 520, 'Imposto do mês', 'Impostos'),
    saida('S-0009', '25/10/2026', 350, 'Anúncio Instagram', 'Marketing'),
    saida('S-0010', '02/11/2026', 210, 'Frete das varas', 'Frete'),
    saida('S-0011', '03/11/2026', 300, 'Farmácia', 'Outros', 'pessoal')
  ];
  let base = 1500;
  let tesouro = 23115.33;
  let atualizado = '01/11/2026 09:00';
  const fluxo = () => r2(entradas.reduce((t, e) => t + e.valor, 0) - saidas.reduce((t, s) => t + s.valor, 0));
  const proximo = (prefixo, lista) => prefixo + '-' + String(lista.length + 1).padStart(4, '0');
  const saldos = () => {
    const conta = r2(base + fluxo());
    return { conta_empresa: conta, tesouro_direto: r2(tesouro), total: r2(conta + tesouro), atualizado_em: atualizado };
  };

  return {
    ler({ pin, mes = '', tipo = '', periodo = 'mes' } = {}) {
      if (String(pin || '') !== SENHA_DEMO) return { tipo: 'recusado', erro: 'Senha errada.' };
      return {
        tipo: 'ok',
        dados: {
          saldos: saldos(),
          resumo: resumir(entradas, saidas, mes, tipo),
          config: { categorias: [], formas: [] },
          relatorio: relatorio(periodo)
        }
      };
    },
    lancarGasto(d) {
      const nova = saida(proximo('S', saidas), d.data, Number(d.valor) || 0, d.descricao, d.categoria, d.tipo === 'pessoal' ? 'pessoal' : 'loja');
      saidas.push(nova);
      return { id: nova.id, valor: nova.valor, categoria: nova.categoria, tipo: nova.tipo };
    },
    lancarVenda(d) {
      const nova = entrada(proximo('E', entradas), d.data, Number(d.valor) || 0, d.cliente, d.forma_pagamento);
      entradas.push(nova);
      return { id: nova.id, valor: nova.valor };
    },
    ajustarSaldos(d, agora) {
      const conta = Number(d.conta_empresa) || 0;
      tesouro = Number(d.tesouro_direto) || 0;
      base = r2(conta - fluxo());
      atualizado = agora;
      return { conta_empresa: r2(conta), tesouro_direto: r2(tesouro), total: r2(conta + tesouro) };
    },
    entradaDaOficina(ordem, data) {
      if (!(Number(ordem.valor) > 0)) return false;
      entradas.push(entrada(proximo('E', entradas), data, Number(ordem.valor), ordem.cliente, ''));
      return true;
    }
  };
}
