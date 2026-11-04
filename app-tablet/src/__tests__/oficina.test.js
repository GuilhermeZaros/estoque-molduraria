import {
  prazoDe, lerData, prazoVencido, deOrdem, validarOrdem, dadosDaOrdem, descricaoDosQuadros, resumoOficina,
  chaveDaOrdem, alvoDaOrdem, mesesRecentes, textoPrazo, ordenarProducao, textoAviso
} from '../oficina';

const hoje = new Date(2026, 10, 28, 10, 0);

test('prazo em dias vira data, virando o mês', () => {
  expect(prazoDe(0, hoje)).toBe('28/11/2026');
  expect(prazoDe(3, hoje)).toBe('01/12/2026');
});

test('lerData só aceita data que existe', () => {
  expect(lerData('5/1/2027')).toEqual(new Date(2027, 0, 5));
  expect(lerData('31/11/2026')).toBeNull();
  expect(lerData('2026-11-05')).toBeNull();
  expect(lerData('')).toBeNull();
});

test('prazo vencido é antes de hoje; hoje ainda não venceu', () => {
  expect(prazoVencido('27/11/2026', hoje)).toBe(true);
  expect(prazoVencido('28/11/2026', hoje)).toBe(false);
  expect(prazoVencido('', hoje)).toBe(false);
});

test('validar ordem pede cliente, prazo válido e valor', () => {
  expect(validarOrdem({ cliente: ' ' })).toBe('Informe o nome do cliente.');
  expect(validarOrdem({ cliente: 'Rita', prazo: '40/11/2026' })).toMatch(/Prazo inválido/);
  expect(validarOrdem({ cliente: 'Rita', prazo: '', valor: '12,x' })).toBe('Valor inválido.');
  expect(validarOrdem({ cliente: 'Rita', prazo: '30/11/2026', valor: '120,00' })).toBe('');
});

test('dados da ordem levam o alvo e o valor em número', () => {
  const f = { cliente: ' Rita ', telefone: '44 98888-7777', descricao: 'Quadro 30 x 40', prazo: '30/11/2026', valor: '1.200,50' };
  expect(dadosDaOrdem(f, { ref_app: 'r1' })).toEqual({
    ref_app: 'r1', cliente: 'Rita', telefone: '44 98888-7777', descricao: 'Quadro 30 x 40', prazo: '30/11/2026', valor: 1200.5
  });
  expect(dadosDaOrdem({ cliente: 'Rui' }, { id: 'OS-001', ref_app: '' }).valor).toBe(0);
});

test('editar ordem preenche o formulário com o valor em texto', () => {
  expect(deOrdem({ cliente: 'Rita', valor: 120.5, prazo: '30/11/2026' })).toEqual({
    cliente: 'Rita', telefone: '', descricao: '', prazo: '30/11/2026', valor: '120,5'
  });
  expect(deOrdem({ cliente: 'Rita', valor: 0 }).valor).toBe('');
});

test('descrição dos quadros junta medida, moldura e materiais', () => {
  const pacote = {
    molduras: [{ codigo: 'D-101', nome: 'Lisa preta' }],
    materiais: [{ codigo: 'VID-001', nome: 'Vidro simples' }, { codigo: 'CHA-001', nome: 'Chapa Eucatex' }]
  };
  const quadros = [
    { tipo: 'quadro', largura_cm: '30', altura_cm: '40', quantidade: 2, moldura: 'D-101', paspatur: '5', vidro: 'VID-001', chapa: 'CHA-001' },
    { tipo: 'quadro', largura_cm: '20', altura_cm: '20', quantidade: 1, moldura: '', paspatur: '', vidro: 'VID-001', vidro_duplo: true, chapa: 'CHA-001' }
  ];
  const texto = descricaoDosQuadros(pacote, quadros);
  expect(texto).toMatch(/^2x .*moldura Lisa preta, paspatur 5 cm, Vidro simples, Chapa Eucatex; /);
  expect(texto).toMatch(/Vidro simples \(2 vidros\)$/);
});

test('resumo da oficina conta produção, acabamento, prontos e atrasadas', () => {
  const lista = [
    { status: 'em_producao', prazo: '20/11/2026' },
    { status: 'em_producao', prazo: '30/11/2026' },
    { status: 'acabamento', prazo: '01/11/2026' },
    { status: 'acabamento', prazo: '' },
    { status: 'pronto', prazo: '01/11/2026' }
  ];
  expect(resumoOficina(lista, hoje)).toEqual({ producao: 2, acabamento: 2, prontos: 1, atrasadas: 2 });
  expect(resumoOficina(undefined, hoje)).toEqual({ producao: 0, acabamento: 0, prontos: 0, atrasadas: 0 });
});

test('chave e alvo da ordem usam o número quando já tem', () => {
  expect(chaveDaOrdem({ id: 'OS-001', ref_app: 'r1' })).toBe('r1');
  expect(chaveDaOrdem({ id: 'OS-001', ref_app: '' })).toBe('OS-001');
  expect(alvoDaOrdem({ id: 'OS-001', ref_app: 'r1' })).toEqual({ id: 'OS-001', ref_app: 'r1' });
  expect(alvoDaOrdem({ id: '', ref_app: 'r1' })).toEqual({ ref_app: 'r1' });
});

test('meses recentes voltam virando o ano', () => {
  const m = mesesRecentes(new Date(2026, 1, 10), 3);
  expect(m).toEqual([
    { valor: '2026-02', titulo: 'Fevereiro' },
    { valor: '2026-01', titulo: 'Janeiro' },
    { valor: '2025-12', titulo: 'Dezembro 2025' }
  ]);
});

test('texto do prazo diz atrasada, hoje, amanhã ou a data', () => {
  expect(textoPrazo('26/11/2026', hoje)).toBe('Atrasada desde 26/11/2026');
  expect(textoPrazo('28/11/2026', hoje)).toBe('Prazo: hoje');
  expect(textoPrazo('29/11/2026', hoje)).toBe('Prazo: amanhã');
  expect(textoPrazo('05/12/2026', hoje)).toBe('Prazo: 05/12/2026');
  expect(textoPrazo('', hoje)).toBe('Sem prazo');
});

test('produção fica em ordem de prazo, sem prazo no fim', () => {
  const lista = [{ id: 'a', prazo: '' }, { id: 'b', prazo: '30/11/2026' }, { id: 'c', prazo: '20/11/2026' }];
  expect(ordenarProducao(lista).map((o) => o.id)).toEqual(['c', 'b', 'a']);
});

test('aviso da Julia diz se avisou, se falhou ou se falta o WhatsApp', () => {
  expect(textoAviso({ aviso: 'enviado', telefone: '1' }).alerta).toBe(false);
  expect(textoAviso({ aviso: 'falha', telefone: '1' })).toEqual({ texto: 'A Julia não conseguiu avisar. Ligue pro cliente.', alerta: true });
  expect(textoAviso({ aviso: '', telefone: '' }).alerta).toBe(true);
  expect(textoAviso({ aviso: '', telefone: '11999998888' }).texto).toMatch(/vai avisar/);
});
