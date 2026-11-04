import {
  VARA_PADRAO_M, consumoMolduraM, corEstoque, nomeCasinha, casinhaValida, metros, validarNovaMoldura
} from '../gerado/nucleo';

test.each([
  [90, 60, 2, 3.289],
  [90, 60, 0, 3],
  [30, 40, 1.5, 1.621],
  [50, 70, 3, 2.826]
])('consumo real da vara %s x %s, perfil %s cm = %s m (o primeiro é o 328,9 cm do Simulador)', (l, a, perfil, esperado) => {
  expect(consumoMolduraM(l, a, perfil)).toBe(esperado);
});

test('cores pela vara de 2,70 m', () => {
  expect(VARA_PADRAO_M).toBe(2.7);
  expect(corEstoque(8.1)).toBe('verde');
  expect(corEstoque(8.09)).toBe('amarelo');
  expect(corEstoque(2.7)).toBe('amarelo');
  expect(corEstoque(2.69)).toBe('vermelho');
});

test('nome falado da casinha', () => {
  expect(nomeCasinha('CR3-F1')).toBe('Corredor 3, fundo, casinha 1');
  expect(nomeCasinha('PR1-4')).toBe('Parede 1, casinha 4');
  expect(casinhaValida('PR2-7')).toBe(false);
});

test('metros aceita vírgula e recusa vazio', () => {
  expect(metros('2,5')).toBe(2.5);
  expect(() => metros('')).toThrow('Metros inválidos');
  expect(metros('0', true)).toBe(0);
});

test('moldura nova sem preço entra fora do catálogo', () => {
  const m = validarNovaMoldura({ codigo: ' 123 ', nome: 'Preta lisa', perfil_cm: '2,5', metros: '5,4', casinha: 'cr1-e1' });
  expect(m).toMatchObject({ codigo: '123', perfil_cm: 2.5, metros: 5.4, casinha: 'CR1-E1', disponivel: false });
});
