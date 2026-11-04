import { VARA_PADRAO_M, metros } from './gerado/nucleo';

export function formatarMetros(m) {
  return (Number(m) || 0).toFixed(2).replace('.', ',') + ' m';
}

export function varasTexto(m) {
  const total = Math.max(0, Number(m) || 0);
  const varas = Math.floor((total + 0.0005) / VARA_PADRAO_M);
  const resto = Number((total - varas * VARA_PADRAO_M).toFixed(2));
  const pedaco = resto >= 0.01 ? formatarMetros(resto) : '';
  if (!varas) return pedaco ? 'só pedaço de ' + pedaco : 'sem estoque';
  const nome = varas === 1 ? '1 vara' : varas + ' varas';
  return pedaco ? nome + ' + ' + pedaco : nome;
}

export function totalMetros(valor) {
  const v = valor || {};
  const txtVaras = String(v.varas == null ? '' : v.varas).trim();
  const txtExtra = String(v.extra == null ? '' : v.extra).trim();
  if (!txtVaras && !txtExtra) return null;
  const varas = txtVaras ? Number(txtVaras) : 0;
  if (!Number.isInteger(varas) || varas < 0) return null;
  let extra = 0;
  if (txtExtra) {
    try {
      extra = metros(txtExtra, true);
    } catch (e) {
      return null;
    }
  }
  return Number((varas * VARA_PADRAO_M + extra).toFixed(3));
}

export function valorInicial(m) {
  return m == null ? { varas: '', extra: '' } : { varas: '', extra: String(m).replace('.', ',') };
}
