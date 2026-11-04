import {
  CORREDORES, PAREDES, grupoDe, nomeGrupo, casinhasDoGrupo, rotuloCurto, layoutCorredor,
  linhasParaEscolher, moldurasPorCasinha, estadoCasinha, resumoGrupo, operacoesPraColocar
} from '../mapa';

const m = (codigo, local, estoque_m, nome = 'Moldura ' + codigo) => ({ codigo, nome, local, estoque_m });

test('grupos do depósito e nomes', () => {
  expect(CORREDORES).toEqual(['CR1', 'CR2', 'CR3', 'CR4', 'CR5']);
  expect(PAREDES).toEqual(['PR2', 'PR1']);
  expect(grupoDe('cr3-e2')).toBe('CR3');
  expect(nomeGrupo('CR3')).toBe('Corredor 3');
  expect(nomeGrupo('PR1')).toBe('Parede 1');
  expect(casinhasDoGrupo('CR2')).toHaveLength(15);
  expect(casinhasDoGrupo('PR2')).toEqual(['PR2-1', 'PR2-2', 'PR2-3', 'PR2-4', 'PR2-5', 'PR2-6']);
  expect(rotuloCurto('CR3-E2')).toBe('E2');
  expect(rotuloCurto('PR1-4')).toBe('4');
});

test('corredor: fundo da esquerda pra direita, lados com o 5 em cima, perto do fundo', () => {
  const l = layoutCorredor('CR3');
  expect(l.fundo).toEqual(['CR3-F1', 'CR3-F2', 'CR3-F3', 'CR3-F4', 'CR3-F5']);
  expect(l.esquerda).toEqual(['CR3-E5', 'CR3-E4', 'CR3-E3', 'CR3-E2', 'CR3-E1']);
  expect(l.direita[4]).toBe('CR3-D1');
});

test('escolher casinha: corredor separado em fundo, esquerda e direita; parede numa linha só', () => {
  const c = linhasParaEscolher('CR2');
  expect(c.map((l) => l.titulo)).toEqual(['Fundo', 'Esquerda', 'Direita']);
  expect(c[0].casinhas).toEqual(['CR2-F1', 'CR2-F2', 'CR2-F3', 'CR2-F4', 'CR2-F5']);
  expect(c[1].casinhas).toEqual(['CR2-E1', 'CR2-E2', 'CR2-E3', 'CR2-E4', 'CR2-E5']);
  expect(c[2].casinhas[0]).toBe('CR2-D1');
  expect(linhasParaEscolher('PR1')).toEqual([{ titulo: '', casinhas: ['PR1-1', 'PR1-2', 'PR1-3', 'PR1-4', 'PR1-5', 'PR1-6'] }]);
});

test('moldurasPorCasinha agrupa pelo local, ignora quem não tem e ordena por nome', () => {
  const g = moldurasPorCasinha([m('1', 'cr1-e1', 5, 'Prata'), m('2', '', 3), m('3', 'CR1-E1', 9, 'Ouro')]);
  expect(Object.keys(g)).toEqual(['CR1-E1']);
  expect(g['CR1-E1'].map((x) => x.codigo)).toEqual(['3', '1']);
});

test('estadoCasinha: vazia sem moldura, senão a pior cor', () => {
  expect(estadoCasinha([])).toEqual({ cor: 'vazia', total: 0 });
  expect(estadoCasinha(undefined)).toEqual({ cor: 'vazia', total: 0 });
  expect(estadoCasinha([m('1', 'CR1-E1', 8.1)]).cor).toBe('verde');
  expect(estadoCasinha([m('1', 'CR1-E1', 20), m('2', 'CR1-E1', 3)]).cor).toBe('amarelo');
  expect(estadoCasinha([m('1', 'CR1-E1', 20), m('2', 'CR1-E1', 1), m('3', 'CR1-E1', 3)])).toEqual({ cor: 'vermelho', total: 3 });
});

test('resumoGrupo conta molduras e alertas de todas as casinhas do grupo', () => {
  const g = moldurasPorCasinha([m('1', 'CR1-E1', 1), m('2', 'CR1-E1', 3), m('3', 'CR1-D2', 0.5), m('4', 'CR2-E1', 0), m('5', 'CR1-F1', 20)]);
  expect(resumoGrupo('CR1', g)).toEqual({ vermelho: 2, amarelo: 1, molduras: 4, total: 15 });
});

test('operacoesPraColocar muda a moldura de casinha e só ajusta quando tem número', () => {
  expect(operacoesPraColocar('060116', 'cr1-d1', 27)).toEqual([
    { acao: 'moverMoldura', dados: { codigo: '060116', casinha: 'CR1-D1' } },
    { acao: 'ajustarMoldura', dados: { codigo: '060116', metros: 27 } }
  ]);
  expect(operacoesPraColocar('060116', 'CR1-D1', null)).toEqual([
    { acao: 'moverMoldura', dados: { codigo: '060116', casinha: 'CR1-D1' } }
  ]);
  expect(operacoesPraColocar('060116', 'CR1-D1', 0)).toHaveLength(2);
});
