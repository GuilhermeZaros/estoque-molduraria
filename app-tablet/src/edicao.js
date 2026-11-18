import { formatarNumero } from './formato';

const numeroNoCampo = (n) => (Number(n) > 0 ? formatarNumero(Number(n)) : '');
const dinheiroNoCampo = (n) => (Number(n) > 0 ? Number(n).toFixed(2).replace('.', ',') : '');

export function camposDaMoldura(m) {
  const x = m || {};
  return {
    codigo: String(x.codigo || ''),
    nome: x.nome || '',
    marca: x.marca || '',
    perfil_cm: numeroNoCampo(x.perfil_cm),
    preco_m: dinheiroNoCampo(x.preco_m),
    custo_m: dinheiroNoCampo(x.custo_m),
    estilo: x.estilo || '',
    cor: x.cor || ''
  };
}

export function ondeAMolduraEsta(pacote, codigo) {
  const p = pacote || {};
  const c = String(codigo);
  const usa = (q) => String(q.moldura || '') === c || String(q.moldura_fora || '') === c;
  const lugares = [];
  (p.orcamentos_abertos || []).forEach((o) => {
    if (String(o.moldura || '') === c || (o.quadros || []).some(usa)) lugares.push('no orçamento de ' + (o.cliente || 'cliente sem nome'));
  });
  (p.oficina || []).forEach((o) => {
    if ((o.quadros || []).some(usa)) lugares.push('na ordem da oficina de ' + (o.cliente || 'cliente sem nome'));
  });
  (p.compras_pendentes || []).forEach((x) => {
    if (String(x.moldura) === c) lugares.push('na lista de compras' + (x.cliente ? ' (' + x.cliente + ')' : ''));
  });
  return lugares.filter((x, i) => lugares.indexOf(x) === i);
}

export function juntarComE(lista) {
  return lista.length > 1 ? lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1] : lista.join('');
}

export function codigoRepetido(pacote, codigoAtual, novo) {
  const n = String(novo || '').trim().toUpperCase();
  if (!n || n === String(codigoAtual).toUpperCase()) return false;
  const p = pacote || {};
  return [...(p.molduras || []), ...(p.materiais || [])].some((x) => String(x.codigo).trim().toUpperCase() === n);
}
