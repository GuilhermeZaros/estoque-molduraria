export function formatarReais(valor) {
  const [inteiro, centavos] = (Math.round((Number(valor) || 0) * 100) / 100).toFixed(2).split('.');
  return 'R$ ' + inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + centavos;
}

export function formatarNumero(n) {
  return String(Number((Number(n) || 0).toFixed(2))).replace('.', ',');
}

export function momentoDe(texto) {
  const t = String(texto == null ? '' : texto).trim();
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), Number(br[4] || 0), Number(br[5] || 0)).getTime();
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? 0 : ms;
}

export function dataCurta(texto) {
  const ms = momentoDe(texto);
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

export function lerValor(texto) {
  let t = String(texto == null ? '' : texto).replace(/R\$|\s/g, '');
  if (!t) return 0;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export function lerNumero(texto) {
  const t = String(texto == null ? '' : texto).trim().replace(',', '.');
  if (!t) return 0;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}
