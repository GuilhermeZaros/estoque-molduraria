export const LADO_MAXIMO = 1280;

export function medidaReduzida(largura, altura, maximo = LADO_MAXIMO) {
  if (!(largura > 0) || !(altura > 0)) return { width: maximo, height: null };
  if (largura >= altura) return { width: Math.min(maximo, largura), height: null };
  return { width: null, height: Math.min(maximo, altura) };
}
