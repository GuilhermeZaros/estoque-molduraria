import { chaveDaOrdem } from './oficina';

let lembrada = null;

export function lembrarOrdem(o) {
  lembrada = o;
}

export function ordemLembrada(chave) {
  return lembrada && chaveDaOrdem(lembrada) === chave ? lembrada : null;
}
