import { casinhasDoDeposito, corEstoque, normalizarCasinha } from './gerado/nucleo';

export const CORREDORES = ['CR1', 'CR2', 'CR3', 'CR4', 'CR5'];
export const PAREDES = ['PR2', 'PR1'];

const GRAVIDADE = { verde: 1, amarelo: 2, vermelho: 3 };

export function grupoDe(casinha) {
  return normalizarCasinha(casinha).split('-')[0];
}

export function nomeGrupo(grupo) {
  return (grupo.startsWith('CR') ? 'Corredor ' : 'Parede ') + grupo.slice(2);
}

export function casinhasDoGrupo(grupo) {
  return casinhasDoDeposito().filter((c) => grupoDe(c) === grupo);
}

export function rotuloCurto(casinha) {
  return normalizarCasinha(casinha).split('-')[1] || '';
}

export function layoutCorredor(grupo) {
  const lado = (letra) => [5, 4, 3, 2, 1].map((n) => grupo + '-' + letra + n);
  return {
    fundo: [1, 2, 3, 4, 5].map((n) => grupo + '-F' + n),
    esquerda: lado('E'),
    direita: lado('D')
  };
}

export function linhasParaEscolher(grupo) {
  if (!grupo.startsWith('CR')) return [{ titulo: '', casinhas: casinhasDoGrupo(grupo) }];
  const lado = (letra) => [1, 2, 3, 4, 5].map((n) => grupo + '-' + letra + n);
  return [
    { titulo: 'Fundo', casinhas: lado('F') },
    { titulo: 'Esquerda', casinhas: lado('E') },
    { titulo: 'Direita', casinhas: lado('D') }
  ];
}

export function moldurasPorCasinha(molduras) {
  const mapa = {};
  for (const m of molduras || []) {
    const c = normalizarCasinha(m.local);
    if (!c) continue;
    (mapa[c] = mapa[c] || []).push(m);
  }
  for (const c of Object.keys(mapa)) mapa[c].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return mapa;
}

export function estadoCasinha(lista) {
  const molduras = lista || [];
  if (!molduras.length) return { cor: 'vazia', total: 0 };
  let pior = 'verde';
  for (const m of molduras) {
    const cor = corEstoque(m.estoque_m);
    if (GRAVIDADE[cor] > GRAVIDADE[pior]) pior = cor;
  }
  return { cor: pior, total: molduras.length };
}

export function resumoGrupo(grupo, porCasinha) {
  const r = { vermelho: 0, amarelo: 0, molduras: 0, total: 0 };
  for (const c of casinhasDoGrupo(grupo)) {
    r.total++;
    for (const m of porCasinha[c] || []) {
      r.molduras++;
      const cor = corEstoque(m.estoque_m);
      if (cor !== 'verde') r[cor]++;
    }
  }
  return r;
}

export function operacoesPraColocar(codigo, casinha, metros) {
  const ops = [{ acao: 'moverMoldura', dados: { codigo, casinha: normalizarCasinha(casinha) } }];
  if (metros != null) ops.push({ acao: 'ajustarMoldura', dados: { codigo, metros } });
  return ops;
}
