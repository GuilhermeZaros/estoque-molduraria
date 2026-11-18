import { camposDaMoldura } from '../edicao';

test('campos da moldura vêm com vírgula e vazios quando não tem número', () => {
  expect(camposDaMoldura({ codigo: 101, nome: 'Clássica', marca: 'Ruberti', perfil_cm: 4.5, preco_m: 42.5, custo_m: 0, estilo: '', cor: 'Ouro' })).toEqual({
    codigo: '101', nome: 'Clássica', marca: 'Ruberti', perfil_cm: '4,5', preco_m: '42,50', custo_m: '', estilo: '', cor: 'Ouro'
  });
});

test('campos da moldura aguentam moldura sem nada', () => {
  expect(camposDaMoldura(null)).toEqual({ codigo: '', nome: '', marca: '', perfil_cm: '', preco_m: '', custo_m: '', estilo: '', cor: '' });
});
