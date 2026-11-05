import {
  prazoDe, lerData, prazoVencido, deOrdem, validarOrdem, dadosDaOrdem, descricaoDosQuadros, resumoOficina,
  chaveDaOrdem, alvoDaOrdem, mesesRecentes, textoPrazo, ordenarProducao, textoAviso, fotosDaOrdem, fotosDoQuadro,
  ordemVazia, LIMITE_FOTOS, tituloDoQuadro, detalhesDoQuadro, dadosDaFoto, dadosDeTirarFoto
} from '../oficina';
import { nomeCasinha } from '../gerado/nucleo';

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

test('descrição dos 2 vidros leva a borda', () => {
  const pacote = { molduras: [], materiais: [{ codigo: 'VID-001', nome: 'Vidro simples' }] };
  const quadros = [{ tipo: 'quadro', largura_cm: '21', altura_cm: '30', quantidade: 1, vidro: 'VID-001', vidro_duplo: true, margem: '3' }];
  expect(descricaoDosQuadros(pacote, quadros)).toMatch(/Vidro simples \(2 vidros, borda 3 cm\)$/);
});

test('descrição dos quadros leva os serviços e ignora paspatur do objeto', () => {
  const texto = descricaoDosQuadros({ molduras: [], materiais: [] }, [
    { tipo: 'objeto', largura: '52', altura: '72', quantidade: 1, paspatur: '5', servicos: [] },
    { tipo: 'reforma', largura: '', altura: '', quantidade: 1, servicos: [{ descricao: 'Limpar vidros', valor: '30' }, { descricao: ' ', valor: '5' }] }
  ]);
  expect(texto).toBe('Objeto 52 x 72; Reforma, Limpar vidros');
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

test('fotos da ordem: link antigo vem sem quadro e a foto de um quadro guarda o número', () => {
  expect(fotosDaOrdem({ fotos: ['https://d/1', { ref: 'a', url: 'file:///a.jpg', quadro: 2 }, { url: 'https://d/3', quadro: 1 }] })).toEqual([
    { ref: '', url: 'https://d/1', quadro: 0 }, { ref: 'a', url: 'file:///a.jpg', quadro: 2 }, { ref: '', url: 'https://d/3', quadro: 1 }
  ]);
  expect(fotosDaOrdem({})).toEqual([]);
  expect(LIMITE_FOTOS).toBe(5);
  const o = { fotos: [{ url: 'https://d/1', quadro: 0 }, { url: 'https://d/2', quadro: 2 }, { url: 'https://d/3', quadro: 2 }] };
  expect(fotosDoQuadro(o, 2).map((f) => f.url)).toEqual(['https://d/2', 'https://d/3']);
  expect(fotosDoQuadro(o, 0).map((f) => f.url)).toEqual(['https://d/1']);
  expect(fotosDoQuadro(o, 1)).toEqual([]);
});

test('formulário da ordem não leva mais as fotos', () => {
  expect(ordemVazia()).toEqual({ cliente: '', telefone: '', descricao: '', prazo: '', valor: '' });
  expect(deOrdem({ cliente: 'Carla', fotos: ['https://d/1'] })).not.toHaveProperty('fotos');
});

test('foto tirada na ordem aberta vai com o número do quadro; tirar manda o link e o ref', () => {
  const o = { id: 'OS-014', ref_app: 'r', cliente: 'Carla' };
  expect(dadosDaFoto(o, 2, 'n1')).toEqual({ id: 'OS-014', ref_app: 'r', cliente: 'Carla', foto_ref: 'n1', quadro: 2 });
  expect(dadosDaFoto({ ref_app: 'r2', cliente: 'Ana' }, 0, 'n2')).toEqual({ ref_app: 'r2', cliente: 'Ana', foto_ref: 'n2', quadro: 0 });
  expect(dadosDeTirarFoto(o, { ref: 'b', url: 'file:///b.jpg', quadro: 2 }))
    .toEqual({ id: 'OS-014', ref_app: 'r', cliente: 'Carla', foto_url: 'file:///b.jpg', foto_ref: 'b' });
});

test('título de cada quadro na ordem aberta', () => {
  const q = (mudar) => ({ tipo: 'quadro', largura_cm: 0, altura_cm: 0, quantidade: 1, ...mudar });
  expect(tituloDoQuadro(q({ largura_cm: 20, altura_cm: 30 }), 0, 2)).toBe('Quadro 1 de 2: 20 x 30');
  expect(tituloDoQuadro(q({ largura_cm: 20.5, altura_cm: 30, quantidade: 2 }), 1, 3)).toBe('Quadro 2 de 3: 2x 20,5 x 30');
  expect(tituloDoQuadro(q({ tipo: 'reforma', largura_cm: 40, altura_cm: 60 }), 1, 3)).toBe('Quadro 2 de 3: Reforma 40 x 60');
  expect(tituloDoQuadro(q({ tipo: 'reforma' }), 0, 1)).toBe('Quadro 1 de 1: Reforma');
  expect(tituloDoQuadro(q({ tipo: 'objeto', largura_cm: 52, altura_cm: 72 }), 2, 3)).toBe('Quadro 3 de 3: Objeto 52 x 72');
  expect(tituloDoQuadro(q({ tipo: 'camiseta', largura_cm: 52, altura_cm: 72 }), 0, 1)).toBe('Quadro 1 de 1: Objeto 52 x 72');
  expect(tituloDoQuadro(q(), 0, 1)).toBe('Quadro 1 de 1');
});

const pacoteOficina = {
  molduras: [{ codigo: 'D-104', nome: 'Rústica natural', local: 'CR1-F3' }, { codigo: 'D-109', nome: 'Madeira escura', local: '' }],
  materiais: [{ codigo: 'VID-001', nome: 'Vidro simples' }, { codigo: 'CHA-001', nome: 'Chapa Eucatex' }, { codigo: 'ESP-001', nome: 'Espelho 3 mm' }]
};
const quadroSalvo = (mudar) => ({
  tipo: 'quadro', largura_cm: 30, altura_cm: 40, margem_cm: 0, quantidade: 1, paspatur_cm: 0, moldura: '', vidro: '', chapa: '',
  espelho: '', vidro_duplo: false, objeto_alto: false, servicos: [], descricao: '', ...mudar
});

test('detalhes do quadro: o que vai, onde está a moldura e o que não vai', () => {
  expect(detalhesDoQuadro(pacoteOficina, quadroSalvo({
    moldura: 'D-104', vidro: 'VID-001', chapa: 'CHA-001', objeto_alto: true, paspatur_cm: 5, espelho: 'ESP-001',
    servicos: [{ descricao: 'Limpar vidros', valor: 30 }, { descricao: 'Trocar gancho', valor: 10 }]
  }))).toEqual([
    { rotulo: 'Moldura', valor: 'Rústica natural (D-104)', detalhe: 'Fica em: ' + nomeCasinha('CR1-F3'), nao: false },
    { rotulo: 'Vidro', valor: 'Vidro simples', detalhe: '', nao: false },
    { rotulo: 'Chapa', valor: 'Chapa Eucatex, com pintura', detalhe: '', nao: false },
    { rotulo: 'Paspatur', valor: '5 cm', detalhe: '', nao: false },
    { rotulo: 'Espelho', valor: 'Espelho 3 mm', detalhe: '', nao: false },
    { rotulo: 'Serviços', valor: 'Limpar vidros, Trocar gancho', detalhe: '', nao: false }
  ]);
  expect(detalhesDoQuadro(pacoteOficina, quadroSalvo({ tipo: 'reforma' })).map((d) => [d.rotulo, d.valor, d.nao])).toEqual([
    ['Moldura', 'Não vai', true], ['Vidro', 'Não vai', true], ['Chapa', 'Não vai', true], ['Paspatur', 'Não vai', true]
  ]);
});

test('detalhes do quadro: 2 vidros com a borda, objeto com a borda em volta e moldura sem casinha', () => {
  const duplo = detalhesDoQuadro(pacoteOficina, quadroSalvo({ moldura: 'D-109', vidro: 'VID-001', vidro_duplo: true, margem_cm: 3 }));
  expect(duplo[0]).toEqual({ rotulo: 'Moldura', valor: 'Madeira escura (D-109)', detalhe: 'Ainda sem casinha', nao: false });
  expect(duplo.slice(1).map((d) => [d.rotulo, d.valor])).toEqual([
    ['Vidro', 'Vidro simples (2 vidros, borda 3 cm)'], ['Chapa', 'Não vai'], ['Paspatur', 'Não vai']
  ]);
  expect(detalhesDoQuadro(pacoteOficina, quadroSalvo({ vidro: 'VID-001', vidro_duplo: true }))[1].valor).toBe('Vidro simples (2 vidros)');
  const objeto = detalhesDoQuadro(pacoteOficina, quadroSalvo({ tipo: 'objeto', moldura: 'X-1', vidro: 'VID-001', chapa: 'CHA-001', margem_cm: 4.5, objeto_alto: true }));
  expect(objeto.map((d) => [d.rotulo, d.valor])).toEqual([
    ['Moldura', 'X-1'], ['Vidro', 'Vidro simples'], ['Chapa', 'Chapa Eucatex, com pintura'], ['Borda em volta do objeto', '4,5 cm']
  ]);
  expect(objeto[0].detalhe).toBe('');
});
