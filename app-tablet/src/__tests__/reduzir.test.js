import { medidaReduzida } from '../reduzir';

test('lado maior vira no máximo 1280 px e a foto pequena fica como está', () => {
  expect(medidaReduzida(4000, 3000)).toEqual({ width: 1280, height: null });
  expect(medidaReduzida(3000, 4000)).toEqual({ width: null, height: 1280 });
  expect(medidaReduzida(800, 600)).toEqual({ width: 800, height: null });
  expect(medidaReduzida(0, 0)).toEqual({ width: 1280, height: null });
});
