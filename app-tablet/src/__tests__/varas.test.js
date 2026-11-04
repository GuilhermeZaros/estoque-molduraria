import { formatarMetros, varasTexto, totalMetros, valorInicial } from '../varas';

test('formatarMetros em pt-BR', () => {
  expect(formatarMetros(9.3)).toBe('9,30 m');
  expect(formatarMetros(undefined)).toBe('0,00 m');
});

test('varasTexto mostra varas de 2,70 e o pedaço', () => {
  expect(varasTexto(9.3)).toBe('3 varas + 1,20 m');
  expect(varasTexto(2.7)).toBe('1 vara');
  expect(varasTexto(8.1)).toBe('3 varas');
  expect(varasTexto(0.8)).toBe('só pedaço de 0,80 m');
  expect(varasTexto(0)).toBe('sem estoque');
});

test('totalMetros soma varas inteiras e metros soltos', () => {
  expect(totalMetros({ varas: '3', extra: '1,2' })).toBe(9.3);
  expect(totalMetros({ varas: '', extra: '20' })).toBe(20);
  expect(totalMetros({ varas: '2', extra: '' })).toBe(5.4);
  expect(totalMetros({ varas: '0', extra: '0' })).toBe(0);
  expect(totalMetros({ varas: '', extra: '' })).toBeNull();
  expect(totalMetros({ varas: '1,5', extra: '' })).toBeNull();
  expect(totalMetros({ varas: '', extra: 'abc' })).toBeNull();
});

test('valorInicial põe os metros no campo de pedaços', () => {
  expect(valorInicial(9.3)).toEqual({ varas: '', extra: '9,3' });
  expect(valorInicial(null)).toEqual({ varas: '', extra: '' });
});
