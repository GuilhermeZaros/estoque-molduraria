import { lerValor, formatarNumero, formatarReais } from './formato';
import { recebimento, TAXAS_MAQUININHA } from './gerado/nucleo';
import { textoData, lerData } from './oficina';

export const CATEGORIAS = ['Salários', 'Impostos', 'Contas', 'Matéria-Prima', 'Marketing', 'Financiamento', 'Frete', 'Outros'];
export const FORMAS = ['Pix', 'Dinheiro', 'Débito', 'Crédito', 'Cartão parcelado', 'Cheque', 'Link', 'Boleto'];

export const TIPOS_RECEBIMENTO = ['Dinheiro', 'Pix', 'Débito', 'Crédito'];
export const PARCELAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function formaDe(tipo, parcelas) {
  if (tipo === 'Crédito') return 'Crédito ' + (Number(parcelas) >= 1 && Number(parcelas) <= 12 ? Number(parcelas) : 1) + 'x';
  return TIPOS_RECEBIMENTO.includes(tipo) ? tipo : '';
}

export function partesDaForma(forma) {
  const t = String(forma == null ? '' : forma).trim();
  const m = /^Crédito (\d{1,2})x$/.exec(t);
  if (m) return { tipo: 'Crédito', parcelas: Number(m[1]) };
  if (t === 'Crédito') return { tipo: 'Crédito', parcelas: 1 };
  return { tipo: TIPOS_RECEBIMENTO.includes(t) ? t : '', parcelas: 1 };
}

export function formaValida(forma) {
  return forma === 'Dinheiro' || forma === 'Pix' || Object.prototype.hasOwnProperty.call(TAXAS_MAQUININHA, forma);
}

function porcento(pct) {
  return String(pct.toFixed(2)).replace('.', ',') + '%';
}

export function textoRecebimento(valor, forma) {
  const r = recebimento(valor, forma);
  const entra = 'Entra ' + formatarReais(r.liquido) + ' no financeiro.';
  if (!r.pct) return 'Sem taxa. ' + entra;
  return 'Taxa da maquininha ' + porcento(r.pct) + ': ' + formatarReais(r.taxa) + '. ' + entra;
}
export const TIPOS = [
  { valor: '', titulo: 'Tudo' },
  { valor: 'loja', titulo: 'Loja' },
  { valor: 'pessoal', titulo: 'Pessoal' }
];
export const PERIODOS_VENDA = [
  { valor: 'hoje', titulo: 'Hoje' },
  { valor: 'semana', titulo: 'Semana' },
  { valor: 'mes', titulo: 'Mês' },
  { valor: 'tudo', titulo: 'Tudo' }
];
export const DIAS = [
  { valor: 0, titulo: 'Hoje' },
  { valor: 1, titulo: 'Ontem' }
];

export function dataDe(diasAtras, hoje = new Date()) {
  return textoData(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diasAtras));
}

const texto = (v) => String(v == null ? '' : v).trim();
const dataInvalida = 'Data inválida. Use dia/mês/ano, por exemplo 03/11/2026.';

export function gastoVazio(hoje = new Date()) {
  return { data: dataDe(0, hoje), descricao: '', valor: '', categoria: '', pagamento: 'Pix', tipo: 'loja', obs: '' };
}

export function validarGasto(f) {
  if (!texto(f.descricao)) return 'Diga o que foi o gasto.';
  if (!(lerValor(f.valor) > 0)) return 'Informe um valor maior que zero.';
  if (!f.categoria) return 'Escolha a categoria.';
  if (!lerData(f.data)) return dataInvalida;
  return '';
}

export function dadosDoGasto(f) {
  return {
    data: texto(f.data), descricao: texto(f.descricao), valor: lerValor(f.valor), categoria: f.categoria,
    pagamento: f.pagamento || '', tipo: f.tipo === 'pessoal' ? 'pessoal' : 'loja', obs: texto(f.obs)
  };
}

export function gastoDoLancamento(l) {
  return {
    data: l.data || '', descricao: l.descricao || '', valor: formatarNumero(l.valor),
    categoria: CATEGORIAS.includes(l.categoria) ? l.categoria : 'Outros', pagamento: l.pagamento || '',
    tipo: l.escopo === 'pessoal' ? 'pessoal' : 'loja', obs: l.obs || ''
  };
}

export function vendaDoLancamento(l) {
  const { tipo, parcelas } = partesDaForma(l.forma);
  return {
    data: l.data || '', valor: formatarNumero(l.valor_bruto || l.valor), forma_pagamento: formaDe(tipo, parcelas),
    cliente: l.cliente || '', obs: l.obs || ''
  };
}

export function detalheLancamento(l) {
  if (l.tipo === 'entrada') {
    return l.data + (l.forma ? '  ·  ' + l.forma : '') + (Number(l.taxa) > 0 ? ', taxa ' + formatarReais(l.taxa) : '');
  }
  return l.data + ((l.descricao && l.descricao !== l.categoria) || l.escopo === 'pessoal'
    ? '  ·  ' + l.categoria + (l.escopo === 'pessoal' ? ', pessoal' : '')
    : '');
}

export function lerLancamento(texto) {
  try {
    const l = texto ? JSON.parse(String(texto)) : null;
    return l && l.id ? l : null;
  } catch {
    return null;
  }
}

export function vendaVazia(hoje = new Date()) {
  return { data: dataDe(0, hoje), valor: '', forma_pagamento: '', cliente: '', obs: '' };
}

export function validarVenda(f) {
  if (!(lerValor(f.valor) > 0)) return 'Informe um valor maior que zero.';
  if (!lerData(f.data)) return dataInvalida;
  if (!formaValida(f.forma_pagamento)) return 'Escolha como o cliente pagou.';
  return '';
}

export function dadosDaVenda(f) {
  return {
    data: texto(f.data), valor: lerValor(f.valor), forma_pagamento: f.forma_pagamento || '',
    cliente: texto(f.cliente), obs: texto(f.obs)
  };
}

export function validarSaldos(f) {
  if (!texto(f.conta_empresa)) return 'Informe quanto tem na conta da loja.';
  if (Number.isNaN(lerValor(f.conta_empresa)) || Number.isNaN(lerValor(f.tesouro_direto))) return 'Valor inválido.';
  return '';
}

export function textoVariacao(pct) {
  if (pct == null) return '';
  return (pct > 0 ? '+' : '') + String(pct).replace('.', ',') + '%';
}

export function tomDaVariacao(campo, pct) {
  if (!pct) return 'neutro';
  const subiu = pct > 0;
  if (campo === 'saida') return subiu ? 'ruim' : 'bom';
  return subiu ? 'bom' : 'ruim';
}

export function proporcao(valor, maximo) {
  const v = Math.abs(Number(valor) || 0);
  const m = Math.abs(Number(maximo) || 0);
  if (!(v > 0) || !(m > 0)) return 0;
  return Math.max(2, Math.min(100, Math.round((v / m) * 100)));
}

export function opcoesDeMes(meses) {
  return [{ valor: '', titulo: 'Tudo' }, ...[...(meses || [])].reverse().map((m) => ({ valor: m.valor, titulo: m.rotulo }))];
}

export function lancamentosPendentes(fila) {
  const acoes = ['lancarGasto', 'lancarVenda', 'ajustarSaldos', 'editarLancamento', 'apagarLancamento'];
  return (fila || []).filter((o) => acoes.includes(o.acao)).length;
}

export function tetoBonito(valor) {
  const v = Math.abs(Number(valor) || 0);
  if (!(v > 0)) return 0;
  const base = Math.pow(10, Math.floor(Math.log10(v)));
  const passo = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * base >= v);
  return passo * base;
}

export function rotuloEixo(valor) {
  const v = Math.round(Number(valor) || 0);
  if (v >= 10000) return String(Number((v / 1000).toFixed(1))).replace('.', ',') + ' mil';
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
