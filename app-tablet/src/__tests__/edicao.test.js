import { camposDaMoldura, ondeAMolduraEsta, codigoRepetido, juntarComE } from '../edicao';

test('campos da moldura vêm com vírgula e vazios quando não tem número', () => {
  expect(camposDaMoldura({ codigo: 101, nome: 'Clássica', marca: 'Ruberti', perfil_cm: 4.5, preco_m: 42.5, custo_m: 0, estilo: '', cor: 'Ouro' })).toEqual({
    codigo: '101', nome: 'Clássica', marca: 'Ruberti', perfil_cm: '4,5', preco_m: '42,50', custo_m: '', estilo: '', cor: 'Ouro'
  });
});

test('campos da moldura aguentam moldura sem nada', () => {
  expect(camposDaMoldura(null)).toEqual({ codigo: '', nome: '', marca: '', perfil_cm: '', preco_m: '', custo_m: '', estilo: '', cor: '' });
});

const pacote = {
  molduras: [{ codigo: '101' }, { codigo: 'A-2' }],
  materiais: [{ codigo: 'V1' }],
  orcamentos_abertos: [{ cliente: 'Ana', moldura: '', quadros: [{ moldura: '9', moldura_fora: '101' }] }],
  oficina: [{ cliente: 'Bia', quadros: [{ moldura: '101' }] }, { cliente: 'Caio', quadros: [{ moldura: '7' }] }],
  compras_pendentes: [{ moldura: '101', cliente: 'Davi' }, { moldura: '5', cliente: '' }]
};

test('onde a moldura está lista orçamento, oficina e compras', () => {
  expect(ondeAMolduraEsta(pacote, '101')).toEqual(['no orçamento de Ana', 'na ordem da oficina de Bia', 'na lista de compras (Davi)']);
  expect(ondeAMolduraEsta(pacote, '5')).toEqual(['na lista de compras']);
  expect(ondeAMolduraEsta(pacote, 'A-2')).toEqual([]);
});

test('código repetido olha molduras e materiais e ignora o próprio código', () => {
  expect(codigoRepetido(pacote, '101', 'a-2')).toBe(true);
  expect(codigoRepetido(pacote, '101', 'v1')).toBe(true);
  expect(codigoRepetido(pacote, '101', '101')).toBe(false);
  expect(codigoRepetido(pacote, '101', 'NOVO')).toBe(false);
  expect(codigoRepetido(pacote, '101', '')).toBe(false);
});

test('juntar com e', () => {
  expect(juntarComE(['no A', 'na B', 'na C'])).toBe('no A, na B e na C');
  expect(juntarComE(['no A'])).toBe('no A');
});
