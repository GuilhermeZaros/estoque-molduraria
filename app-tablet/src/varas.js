import { VARA_PADRAO_M, metros, desencabecoM } from './gerado/nucleo';

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

export function valorInicial(m) {
  return m == null ? { varas: '', extra: '' } : { varas: '', extra: String(m).replace('.', ',') };
}
