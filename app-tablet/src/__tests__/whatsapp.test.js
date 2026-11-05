import { numeroWhatsApp, linkWhatsApp, textoOrcamento } from '../whatsapp';

test('número com DDD vira 55 + número; lixo vira null', () => {
  expect(numeroWhatsApp('(11) 98888-7777')).toBe('5511988887777');
  expect(numeroWhatsApp('+55 11 3333-4444')).toBe('551133334444');
  expect(numeroWhatsApp('9888')).toBeNull();
});

test('link com o texto codificado; sem número abre pra escolher o contato', () => {
  expect(linkWhatsApp('5511988887777', 'Olá, Maria!')).toBe('https://wa.me/5511988887777?text=Ol%C3%A1%2C%20Maria!');
  expect(linkWhatsApp('', 'a b')).toBe('https://wa.me/?text=a%20b');
});

const q = (mudar) => ({
  tipo: 'quadro', largura: 40, altura: 50, borda: 0, margem: 0, externa: { largura: 40, altura: 50 },
  quantidade: 1, moldura: '', vidro: '', vidro_duplo: false, fundo: '', espelho: '', valor_total: 0, valor_unitario: 0,
  servicos: [], ...mudar
});

test('um quadro: texto sem travessão, com paspatur, itens, quantidade e total', () => {
  const texto = textoOrcamento({
    cliente: 'Maria Souza', ajustado: false, total: 684,
    quadros: [q({
      borda: 5, externa: { largura: 50, altura: 60 }, quantidade: 2, moldura: 'Dourada caixa lisa 2 cm',
      vidro: 'Vidro simples', fundo: 'Chapa Eucatex', valor_total: 684, valor_unitario: 342
    })]
  });
  expect(texto).toBe([
    'Olá, Maria! Segue o orçamento da Vera Molduras:',
    'Quadro de 40 x 50 cm, com paspatur de 5 cm (fica 50 x 60 cm)',
    'Moldura: Dourada caixa lisa 2 cm',
    'Vidro: Vidro simples',
    'Fundo: Chapa Eucatex',
    'Quantidade: 2',
    'Total: R$ 684,00'
  ].join('\n'));
  expect(texto).not.toMatch(/[—–]/);
});

test('um quadro sem nome, com 2 vidros', () => {
  const texto = textoOrcamento({
    cliente: '', ajustado: false, total: 97,
    quadros: [q({ largura: 30, altura: 30, externa: { largura: 30, altura: 30 }, vidro: 'Vidro simples', vidro_duplo: true, valor_total: 97 })]
  });
  expect(texto).toBe('Olá! Segue o orçamento da Vera Molduras:\nQuadro de 30 x 30 cm\nVidro: Vidro simples (2 vidros)\nTotal: R$ 97,00');
});

test('2 vidros com borda mostram o tamanho final e não falam do silicone', () => {
  const texto = textoOrcamento({
    cliente: '', ajustado: false, total: 109.1,
    quadros: [q({
      largura: 21, altura: 30, margem: 3, externa: { largura: 27, altura: 36 }, vidro: 'Vidro simples', vidro_duplo: true,
      valor_total: 109.1
    })]
  });
  expect(texto).toBe([
    'Olá! Segue o orçamento da Vera Molduras:',
    'Quadro de 21 x 30 cm, com borda de 3 cm (fica 27 x 36 cm)',
    'Vidro: Vidro simples (2 vidros)',
    'Total: R$ 109,10'
  ].join('\n'));
});

test('vários quadros: lista numerada com o valor de cada, reforma com serviço e objeto', () => {
  const texto = textoOrcamento({
    cliente: 'Ana', ajustado: false, total: 899.2,
    quadros: [
      q({ largura: 20, altura: 30, moldura: 'Clássica preta', vidro: 'Vidro simples', fundo: 'Eucatex', valor_total: 118, valor_unitario: 118 }),
      q({ largura: 50, altura: 40, quantidade: 2, moldura: 'Clássica preta', valor_total: 412, valor_unitario: 206 }),
      q({
        tipo: 'reforma', largura: 40, altura: 60, vidro: 'Vidro simples', valor_total: 73.2, valor_unitario: 43.2,
        servicos: [{ descricao: 'Limpar vidros', valor: 30 }]
      }),
      q({
        tipo: 'objeto', largura: 52, altura: 72, margem: 4, externa: { largura: 60, altura: 80 },
        moldura: 'Caixa preta', vidro: 'Vidro simples', fundo: 'Eucatex', valor_total: 296, valor_unitario: 296
      })
    ]
  });
  expect(texto).toBe([
    'Olá, Ana! Segue o orçamento da Vera Molduras:',
    '',
    '1) Quadro de 20 x 30 cm',
    'Moldura: Clássica preta',
    'Vidro: Vidro simples',
    'Fundo: Eucatex',
    'Valor: R$ 118,00',
    '',
    '2) 2 quadros de 50 x 40 cm',
    'Moldura: Clássica preta',
    'Valor: R$ 412,00 (R$ 206,00 cada)',
    '',
    '3) Reforma do seu quadro de 40 x 60 cm',
    'Vidro novo: Vidro simples',
    'Limpar vidros: R$ 30,00',
    'Valor: R$ 73,20',
    '',
    '4) Objeto de 52 x 72 cm (o quadro fica 60 x 80 cm)',
    'Moldura: Caixa preta',
    'Vidro: Vidro simples',
    'Fundo: Eucatex',
    'Valor: R$ 296,00',
    '',
    'Total: R$ 899,20'
  ].join('\n'));
  expect(texto).not.toMatch(/[—–]/);
});

test('valor ajustado tira o valor de cada quadro e dos serviços e fica só o total', () => {
  const texto = textoOrcamento({
    cliente: 'Ana', ajustado: true, total: 300,
    quadros: [
      q({ moldura: 'Clássica preta', valor_total: 200, servicos: [{ descricao: 'Instalação', valor: 20 }] }),
      q({ tipo: 'objeto', largura: 60, altura: 90, margem: 4, externa: { largura: 68, altura: 98 }, quantidade: 2, moldura: 'Caixa', valor_total: 150 })
    ]
  });
  expect(texto).not.toMatch(/Valor:/);
  expect(texto).not.toMatch(/R\$ 20/);
  expect(texto).toMatch(/\nInstalação\n/);
  expect(texto).toMatch(/2\) 2 objetos de 60 x 90 cm \(o quadro fica 68 x 98 cm\)/);
  expect(texto.endsWith('\n\nTotal: R$ 300,00')).toBe(true);
});

test('reforma sem medida e serviço sem descrição', () => {
  const texto = textoOrcamento({
    cliente: 'Rui', ajustado: false, total: 45,
    quadros: [q({
      tipo: 'reforma', largura: 0, altura: 0, externa: { largura: 0, altura: 0 }, valor_total: 45,
      servicos: [{ descricao: 'Limpar vidros', valor: 30 }, { descricao: '', valor: 15 }]
    })]
  });
  expect(texto).toBe([
    'Olá, Rui! Segue o orçamento da Vera Molduras:',
    'Reforma do seu quadro',
    'Limpar vidros: R$ 30,00',
    'Serviço: R$ 15,00',
    'Total: R$ 45,00'
  ].join('\n'));
});
