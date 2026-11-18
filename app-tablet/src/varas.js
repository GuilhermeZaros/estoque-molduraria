import { VARA_PADRAO_M, metros, desencabecoM, estoqueEmPecas } from './gerado/nucleo';

export function formatarMetros(m) {
  return (Number(m) || 0).toFixed(2).replace('.', ',') + ' m';
}

export function varasTexto(m, pedacos) {
  const e = estoqueEmPecas(m, pedacos);
  const lista = e.pedacos.map(formatarMetros);
  if (!e.varas) {
    if (!lista.length) return 'sem estoque';
    return (lista.length === 1 ? 'só pedaço de ' : 'só pedaços de ') + lista.join(' + ');
  }
  return [e.varas === 1 ? '1 vara' : e.varas + ' varas', ...lista].join(' + ');
}

export function pedacoVazio() {
  return { metros: '', desencabecado: true };
}

export function numeroDoPerfil(perfil) {
  const n = Number(String(perfil == null ? '' : perfil).replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
}

export function lerPedaco(p, perfilCm) {
  const txt = String(p && p.metros != null ? p.metros : '').trim();
  if (!txt) return null;
  let bruto;
  try {
    bruto = metros(txt, false);
  } catch (e) {
    return { ok: false };
  }
  if (bruto > VARA_PADRAO_M) return { ok: false };
  const ponta = p.desencabecado === false ? desencabecoM(numeroDoPerfil(perfilCm)) : 0;
  return { ok: true, bruto, ponta, liquido: Number(Math.max(0, bruto - ponta).toFixed(3)) };
}

export function totalMetros(valor, perfilCm) {
  const v = valor || {};
  const txtVaras = String(v.varas == null ? '' : v.varas).trim();
  const txtExtra = String(v.extra == null ? '' : v.extra).trim();
  const pedacos = (Array.isArray(v.pedacos) ? v.pedacos : []).map((p) => lerPedaco(p, perfilCm)).filter(Boolean);
  if (!txtVaras && !txtExtra && !pedacos.length) return null;
  if (pedacos.some((p) => !p.ok)) return null;
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
  const soltos = pedacos.reduce((soma, p) => soma + p.liquido, 0);
  return Number((varas * VARA_PADRAO_M + extra + soltos).toFixed(3));
}

export function pedacosDoValor(valor, perfilCm) {
  const v = valor || {};
  if (!Array.isArray(v.pedacos)) return undefined;
  const lidos = v.pedacos.map((p) => lerPedaco(p, perfilCm)).filter(Boolean);
  if (lidos.some((p) => !p.ok)) return undefined;
  return lidos.map((p) => p.liquido).filter((x) => x >= 0.01);
}

export function valorInicial(m) {
  return m == null ? { varas: '', extra: '' } : { varas: '', extra: String(m).replace('.', ',') };
}
