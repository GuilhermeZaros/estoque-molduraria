import { buscarMolduras } from '../busca';

const lista = [
  { codigo: '1020', nome: 'Lisa preta', marca: 'Moldurarte', cor: 'preta' },
  { codigo: '102', nome: 'Clássica dourada', marca: 'Artmold', cor: 'dourada' },
  { codigo: 'A-77', nome: 'Rústica madeira', marca: 'Ruberti', cor: 'natural' }
];

test('busca vazia não lista nada', () => {
  expect(buscarMolduras(lista, '  ')).toEqual([]);
});

test('acha por nome sem acento e por várias palavras', () => {
  expect(buscarMolduras(lista, 'classica').map((m) => m.codigo)).toEqual(['102']);
  expect(buscarMolduras(lista, 'rustica natural').map((m) => m.codigo)).toEqual(['A-77']);
});

test('código exato vem primeiro', () => {
  expect(buscarMolduras(lista, '102').map((m) => m.codigo)).toEqual(['102', '1020']);
});

test('respeita o limite', () => {
  expect(buscarMolduras(lista, 'a', 2)).toHaveLength(2);
});
