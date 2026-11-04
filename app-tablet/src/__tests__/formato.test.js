import { formatarReais, formatarNumero, lerNumero, momentoDe, dataCurta } from '../formato';

test('reais com centavos e milhar', () => {
  expect(formatarReais(684)).toBe('R$ 684,00');
  expect(formatarReais(1234.5)).toBe('R$ 1.234,50');
  expect(formatarReais(0)).toBe('R$ 0,00');
});

test('número curto sem zero sobrando', () => {
  expect(formatarNumero(40)).toBe('40');
  expect(formatarNumero(40.5)).toBe('40,5');
  expect(formatarNumero(2.489)).toBe('2,49');
});

test('lê número digitado com vírgula ou ponto', () => {
  expect(lerNumero('40,5')).toBe(40.5);
  expect(lerNumero(' 30 ')).toBe(30);
  expect(lerNumero('')).toBe(0);
  expect(lerNumero('abc')).toBeNaN();
});

test('data da planilha ou do tablet vira momento e texto curto', () => {
  expect(momentoDe('02/11/2026 15:20')).toBe(new Date(2026, 10, 2, 15, 20).getTime());
  expect(momentoDe('2026-11-03T12:00:00.000Z')).toBe(Date.parse('2026-11-03T12:00:00.000Z'));
  expect(momentoDe('')).toBe(0);
  expect(dataCurta('02/11/2026 15:20')).toBe('02/11 15:20');
  expect(dataCurta('')).toBe('');
});