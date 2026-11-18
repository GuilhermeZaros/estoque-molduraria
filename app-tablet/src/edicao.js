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
