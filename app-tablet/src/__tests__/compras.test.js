import { listaDeCompras, textoCompras } from '../compras';

const m = (codigo, marca, estoque_m, local) => ({ codigo, nome: 'Mold ' + codigo, marca, estoque_m, local, disponivel: true });
const pacote = {
  molduras: [m('A1', 'Artmold', 1, 'CR1-E1'), m('A2', 'Artmold', 20, 'CR1-E1'), m('R1', 'Ruberti', 5, 'CR2-D1'), m('S1', '', 0.5, 'PR1-1'), m('A3', 'Artmold', 0.2, '')],
  compras_pendentes: [
    { id: 'CMP-1', moldura: 'A2', nome: 'Mold A2', marca: 'Artmold', metros_faltando: 1.5, cliente: 'Maria', orcamento_id: 'ORC-1' },
    { id: 'CMP-2', moldura: 'A2', nome: 'Mold A2', marca: 'Artmold', metros_faltando: 0.5, cliente: 'João', orcamento_id: 'ORC-2' }
  ]
};

test('agrupa por fornecedor: encomendas somadas por moldura e o que está acabando (só com casinha)', () => {
  const g = listaDeCompras(pacote);
  expect(g.map((x) => x.marca)).toEqual(['Artmold', 'Ruberti', 'Sem fornecedor']);
  expect(g[0].encomendas).toEqual([{ codigo: 'A2', nome: 'Mold A2', metros: 2, clientes: ['Maria', 'João'] }]);
  expect(g[0].acabando.map((x) => x.codigo)).toEqual(['A1']);
  expect(g[1].acabando.map((x) => x.codigo)).toEqual(['R1']);
  expect(g[2].acabando.map((x) => x.codigo)).toEqual(['S1']);
});

test('texto pro fornecedor com encomendas e reposição', () => {
  expect(textoCompras(listaDeCompras(pacote)[0])).toBe([
    'Lista de compras da Vera Molduras (Artmold)',
    'Encomendas de clientes:',
    '• A2 Mold A2: 2,00 m',
    'Repor estoque:',
    '• A1 Mold A1'
  ].join('\n'));
});

test('nada pendente e nada acabando: lista vazia', () => {
  expect(listaDeCompras({ molduras: [m('A2', 'Artmold', 20, 'CR1-E1')], compras_pendentes: [] })).toEqual([]);
});
