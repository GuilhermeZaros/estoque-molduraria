import { FORMATOS, papelOrcamento, papelOrdem, esc, fotosParaOPapel, telefoneDoPapel } from '../impressao';
import { nomeCasinha } from '../gerado/nucleo';

const loja = { nome: 'Vera Molduras', telefone: '(11) 0000-0000', endereco: 'Rua Exemplo, 123' };
const semContato = { nome: 'Vera Molduras', telefone: '', endereco: '' };
const quando = new Date(2026, 10, 5, 14, 30);

const q = (mudar) => ({
  tipo: 'quadro', largura: 20, altura: 30, borda: 0, margem: 0, externa: { largura: 20, altura: 30 },
  quantidade: 1, moldura: '', vidro: '', vidro_duplo: false, fundo: '', espelho: '', valor_total: 0, valor_unitario: 0,
  servicos: [], ...mudar
});

const orcamento = (mudar) => ({
  cliente: 'Maria Souza', telefone: '(11) 98888-7777', numero: 'ORC-0003', quando, ajustado: false, total: 384,
  quadros: [
    q({ quantidade: 2, moldura: 'Dourada caixa lisa 2 cm', vidro: 'Vidro simples', valor_total: 200, valor_unitario: 100 }),
    q({ largura: 50, altura: 70, moldura: 'Preta lisa', servicos: [{ descricao: 'Esticar a tela', valor: 30 }], valor_total: 184, valor_unitario: 184 })
  ],
  ...mudar
});

test('os três papéis: A4, cupom 80 mm e cupom 58 mm', () => {
  expect(FORMATOS.map((f) => [f.valor, f.titulo])).toEqual([
    ['a4', 'Folha A4'], ['cupom80', 'Cupom 80 mm'], ['cupom58', 'Cupom 58 mm']
  ]);
});

test('escape do texto digitado', () => {
  expect(esc('<b>Ana & "Cia"</b>')).toBe('&lt;b&gt;Ana &amp; &quot;Cia&quot;&lt;/b&gt;');
  expect(esc(null)).toBe('');
});

test('telefone do cliente fica legível no papel', () => {
  expect(telefoneDoPapel('11955554444')).toBe('(11) 95555-4444');
  expect(telefoneDoPapel('+55 11 3333-4444')).toBe('(11) 3333-4444');
  expect(telefoneDoPapel(' 9888 ')).toBe('9888');
  expect(telefoneDoPapel(null)).toBe('');
});

test('orçamento em A4: loja, número, data, cliente, cada quadro com o valor e o total', () => {
  const p = papelOrcamento(orcamento(), 'a4', loja);
  expect([p.width, p.height]).toEqual([595, 842]);
  for (const t of [
    'Vera Molduras', '(11) 0000-0000', 'Rua Exemplo, 123', 'ORC-0003', '05/11/2026', 'Maria Souza', '(11) 98888-7777',
    '2 quadros de 20 x 30 cm', 'Moldura: Dourada caixa lisa 2 cm', 'Vidro: Vidro simples', 'R$ 200,00', 'R$ 100,00 cada',
    'Quadro de 50 x 70 cm', 'Esticar a tela: R$ 30,00', 'R$ 184,00', 'R$ 384,00'
  ]) expect(p.html).toContain(t);
  expect(p.html).not.toContain('undefined');
  expect(p.html).not.toContain('Descrição');
});

test('orçamento com valor ajustado mostra só o total', () => {
  const p = papelOrcamento(orcamento({ ajustado: true, total: 350 }), 'a4', loja);
  expect(p.html).toContain('R$ 350,00');
  expect(p.html).toContain('Esticar a tela');
  expect(p.html).not.toContain('R$ 30,00');
  expect(p.html).not.toContain('R$ 200,00');
  expect(p.html).not.toContain('R$ 384,00');
});

test('orçamento de um quadro só: sem número na frente e sem repetir o valor', () => {
  const p = papelOrcamento(orcamento({ total: 200, quadros: [orcamento().quadros[0]] }), 'a4', loja);
  expect(p.html).toContain('Quadro de 20 x 30 cm');
  expect(p.html).toContain('Quantidade: 2');
  expect(p.html.match(/R\$ 200,00/g)).toHaveLength(1);
});

test('orçamento ainda sem número, loja sem telefone e nome com HTML', () => {
  const p = papelOrcamento(orcamento({ numero: '', cliente: '<i>Ana</i> & Cia', telefone: '' }), 'a4', semContato);
  expect(p.html).toContain('&lt;i&gt;Ana&lt;/i&gt; &amp; Cia');
  expect(p.html).not.toContain('<i>Ana');
  expect(p.html).not.toContain('class="contato"');
  expect(p.html).not.toContain('WhatsApp');
  expect(p.html).not.toContain('undefined');
});

test('orçamento em cupom: coluna estreita, altura cresce com o conteúdo', () => {
  const um = papelOrcamento(orcamento({ quadros: [orcamento().quadros[0]] }), 'cupom80', loja);
  const dois = papelOrcamento(orcamento(), 'cupom80', loja);
  const estreito = papelOrcamento(orcamento(), 'cupom58', loja);
  expect(dois.width).toBe(227);
  expect(estreito.width).toBe(164);
  expect(dois.height).toBeGreaterThan(um.height);
  expect(estreito.height).toBeGreaterThan(um.height);
  expect(estreito.html).toContain('font-size: 8pt');
  expect(dois.html).toContain('R$ 384,00');
  expect(dois.html).toContain('Dourada caixa lisa 2 cm');
});

const pacote = {
  molduras: [{ codigo: 'D-101', nome: 'Dourada caixa lisa 2 cm', local: 'CR1-F3' }, { codigo: 'D-110', nome: 'Preta lisa', local: '' }],
  materiais: [{ codigo: 'VID-001', nome: 'Vidro simples' }, { codigo: 'CHA-001', nome: 'Chapa Eucatex' }]
};
const quadroSalvo = (mudar) => ({
  tipo: 'quadro', largura_cm: 20, altura_cm: 30, margem_cm: 0, quantidade: 1, paspatur_cm: 0, moldura: '', vidro: '', chapa: '',
  espelho: '', vidro_duplo: false, objeto_alto: false, servicos: [], descricao: '', ...mudar
});
const ordem = (mudar) => ({
  id: 'OS-014', ref_app: 'orc-x', cliente: 'Carla Mendes', telefone: '(11) 97777-6666', descricao: '20 x 30 e 50 x 70',
  prazo: '13/11/2026', valor: 420, status: 'em_producao', data_criacao: '2026-11-05T13:00:00.000Z', fotos: [],
  quadros: [
    quadroSalvo({ moldura: 'D-101', vidro: 'VID-001', chapa: 'CHA-001', descricao: 'Foto da formatura. Pendurar na vertical.' }),
    quadroSalvo({ largura_cm: 50, altura_cm: 70, moldura: 'D-110', servicos: [{ descricao: 'Esticar a tela', valor: 30 }] })
  ],
  ...mudar
});

test('ordem em A4: número, cliente, prazo, quadros com foto, descrição, casinha, Não vai e quadradinho', () => {
  const p = papelOrdem(pacote, ordem(), 'a4', loja, { 1: 'data:image/jpeg;base64,AAAA' });
  expect([p.width, p.height]).toEqual([595, 842]);
  for (const t of [
    'ORDEM DE SERVIÇO', 'OS-014', 'Carla Mendes', '(11) 97777-6666', '05/11/2026', 'R$ 420,00', '13/11/2026', 'sexta',
    'Quadro 1 de 2: 20 x 30', 'Foto da formatura. Pendurar na vertical.', 'Dourada caixa lisa 2 cm (D-101)',
    'Fica em: ' + nomeCasinha('CR1-F3'), 'Vidro simples', 'Chapa Eucatex', 'Quadro 2 de 2: 50 x 70', 'Ainda sem casinha',
    'Não vai', 'Esticar a tela'
  ]) expect(p.html).toContain(t);
  expect(p.html.match(/<img /g)).toHaveLength(1);
  expect(p.html).toContain('src="data:image/jpeg;base64,AAAA"');
  expect(p.html.match(/class="caixa"/g)).toHaveLength(2);
  expect(p.html).not.toContain('R$ 30,00');
});

test('ordem feita à mão: bloco Serviço com a descrição e a foto da ordem', () => {
  const p = papelOrdem(pacote, ordem({ quadros: [], descricao: 'Trocar o vidro <quebrado>' }), 'a4', semContato, { 0: 'https://x/foto.jpg' });
  expect(p.html).toContain('Serviço');
  expect(p.html).toContain('Trocar o vidro &lt;quebrado&gt;');
  expect(p.html).toContain('src="https://x/foto.jpg"');
  expect(p.html.match(/class="caixa"/g)).toHaveLength(1);
});

test('ordem sem prazo, sem valor e sem número não quebra', () => {
  const p = papelOrdem(pacote, ordem({ id: '', prazo: '', valor: 0, telefone: '', data_criacao: '' }), 'a4', loja, {});
  expect(p.html).toContain('Sem prazo');
  expect(p.html).not.toContain('R$ 0,00');
  expect(p.html).not.toContain('undefined');
  expect(p.html).not.toContain('NaN');
});

test('fotos do papel: a primeira de cada quadro, só no A4; demorou ou falhou, vai o link', async () => {
  const o = ordem({
    fotos: [
      { url: 'https://x/a.jpg', quadro: 1 }, { url: 'https://x/b.jpg', quadro: 1 },
      { url: 'https://x/lenta.jpg', quadro: 2 }, { url: 'https://x/solta.jpg', quadro: 0 }
    ]
  });
  const converter = (url) => (url.includes('lenta') ? new Promise(() => {}) : Promise.resolve('data:' + url));
  expect(await fotosParaOPapel(o, 'a4', converter, 20)).toEqual({ 1: 'data:https://x/a.jpg', 2: 'https://x/lenta.jpg' });
  expect(await fotosParaOPapel(o, 'cupom80', converter)).toEqual({});
  const mao = ordem({ quadros: [], fotos: [{ url: 'https://x/solta.jpg', quadro: 0 }] });
  expect(await fotosParaOPapel(mao, 'a4', () => Promise.resolve(''))).toEqual({ 0: 'https://x/solta.jpg' });
});

test('ordem em cupom: sem foto, com o mesmo conteúdo', () => {
  const p = papelOrdem(pacote, ordem(), 'cupom58', loja, { 1: 'data:image/jpeg;base64,AAAA' });
  expect(p.width).toBe(164);
  expect(p.html).not.toContain('<img');
  for (const t of ['OS-014', 'Carla Mendes', '13/11/2026', 'Foto da formatura.', 'Dourada caixa lisa 2 cm (D-101)', 'Não vai']) {
    expect(p.html).toContain(t);
  }
  expect(p.height).toBeGreaterThan(300);
});
