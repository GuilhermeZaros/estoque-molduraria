import { criarCentral } from '../central';

const PACOTE = {
  molduras: [{
    codigo: '101', nome: 'Preta lisa', marca: '', estilo: '', cor: '', perfil_cm: 2, preco_m: 30,
    estoque_m: 2, foto_url: '', local: 'CR1-E1', disponivel: true
  }],
  materiais: [],
  casinhas_contadas: [],
  compras_pendentes: [],
  atendentes: ['Ana']
};
const comEstoque = (metros) => ({ ...PACOTE, molduras: [{ ...PACOTE.molduras[0], estoque_m: metros }] });

function armazenamentoFalso(inicial = {}) {
  const dados = new Map(Object.entries(inicial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    dados,
    async ler(chave, padrao) { return dados.has(chave) ? JSON.parse(dados.get(chave)) : padrao; },
    async gravar(chave, valor) { dados.set(chave, JSON.stringify(valor)); },
    async apagar(chave) { dados.delete(chave); }
  };
}

function apiFalsa() {
  const api = {
    online: true,
    pacote: PACOTE,
    buscas: 0,
    enviadas: [],
    respostas: {},
    async buscarPacote() {
      api.buscas++;
      return api.online ? { tipo: 'ok', dados: api.pacote } : { tipo: 'temporario', erro: 'Sem conexão com a planilha.' };
    },
    async enviar(op) {
      if (!api.online) return { tipo: 'temporario', erro: 'Sem conexão com a planilha.' };
      api.enviadas.push(op.acao);
      const responder = api.respostas[op.acao];
      return responder ? responder(op) : { tipo: 'ok', resultado: {} };
    }
  };
  return api;
}

const montadas = [];
function montar(api, armazenamento) {
  let n = 0;
  const c = criarCentral({
    api,
    armazenamento,
    gerarId: () => 'op-' + String(++n).padStart(6, '0'),
    agora: () => '2026-10-30T12:00:00.000Z',
    retentarEmMs: 60000
  });
  montadas.push(c);
  return c;
}
afterEach(() => { montadas.splice(0).forEach((c) => c.parar()); });

const estoqueNaTela = (c) => c.ler().visivel.molduras[0].estoque_m;

test('abre com o pacote guardado e troca pelo da planilha', async () => {
  const api = apiFalsa();
  api.pacote = comEstoque(7);
  const arm = armazenamentoFalso({ pacote: comEstoque(2) });
  const c = montar(api, arm);
  await c.iniciar();
  expect(c.ler().carregado).toBe(true);
  expect(estoqueNaTela(c)).toBe(7);
  expect(c.ler().sync).toEqual({ trabalhando: false, ultimo_ok: '2026-10-30T12:00:00.000Z', erro: null });
  expect(JSON.parse(arm.dados.get('pacote')).molduras[0].estoque_m).toBe(7);
});

test('sem internet a gravação fica guardada na fila e já aparece na tela', async () => {
  const api = apiFalsa();
  api.online = false;
  const arm = armazenamentoFalso({ pacote: PACOTE });
  const c = montar(api, arm);
  await c.iniciar();
  await c.registrar('ajustarMoldura', { codigo: '101', metros: 5 });
  await c.esperar();
  expect(c.ler().fila).toHaveLength(1);
  expect(estoqueNaTela(c)).toBe(5);
  expect(c.ler().pacote.molduras[0].estoque_m).toBe(2);
  expect(JSON.parse(arm.dados.get('fila'))).toEqual(['op-000001']);
  expect(arm.dados.has('op:op-000001')).toBe(true);
  expect(c.ler().sync.erro).toBe('Sem conexão com a planilha.');
});

test('a fila guardada volta quando o app abre de novo', async () => {
  const api = apiFalsa();
  api.online = false;
  const arm = armazenamentoFalso({ pacote: PACOTE });
  const primeira = montar(api, arm);
  await primeira.iniciar();
  await primeira.registrar('ajustarMoldura', { codigo: '101', metros: 5 });
  await primeira.esperar();
  primeira.parar();
  const segunda = montar(api, arm);
  await segunda.iniciar();
  expect(segunda.ler().fila.map((o) => o.acao)).toEqual(['ajustarMoldura']);
  expect(estoqueNaTela(segunda)).toBe(5);
});

test('quando a internet volta, envia em ordem, limpa a fila e busca o pacote', async () => {
  const api = apiFalsa();
  api.online = false;
  const arm = armazenamentoFalso({ pacote: PACOTE });
  const c = montar(api, arm);
  await c.iniciar();
  await c.registrar('entradaMoldura', { codigo: '101', metros: 3 });
  await c.registrar('ajustarMoldura', { codigo: '101', metros: 1 });
  await c.esperar();
  api.online = true;
  api.pacote = comEstoque(1);
  await c.sincronizar();
  expect(api.enviadas).toEqual(['entradaMoldura', 'ajustarMoldura']);
  expect(c.ler().fila).toEqual([]);
  expect(estoqueNaTela(c)).toBe(1);
  expect([...arm.dados.keys()].filter((k) => k.startsWith('op:'))).toEqual([]);
  expect(c.ler().sync.erro).toBeNull();
});

test('gravação enviada fica certa na tela antes do pacote novo chegar', async () => {
  const api = apiFalsa();
  const arm = armazenamentoFalso({ pacote: PACOTE });
  const c = montar(api, arm);
  await c.iniciar();
  const buscasAntes = api.buscas;
  api.respostas.entradaMoldura = () => ({
    tipo: 'ok', resultado: { codigo: '101', novo_estoque_m: 9, separado_m: 0, compras_atendidas: [] }
  });
  await c.registrar('entradaMoldura', { codigo: '101', metros: 7 });
  await c.esperar();
  expect(api.buscas).toBe(buscasAntes);
  expect(c.ler().pacote.molduras[0].estoque_m).toBe(9);
  expect(estoqueNaTela(c)).toBe(9);
});

test('gravação recusada vai pra "não gravou" sem a foto e não trava as outras', async () => {
  const api = apiFalsa();
  const arm = armazenamentoFalso({ pacote: PACOTE });
  const c = montar(api, arm);
  await c.iniciar();
  api.respostas.cadastrarMoldura = () => ({ tipo: 'recusado', erro: 'Já existe um produto com o código 101.' });
  await c.registrar('cadastrarMoldura', { codigo: '101', nome: 'X', perfil_cm: 2, metros: 1, foto_base64: 'AAAA' });
  await c.registrar('ajustarMoldura', { codigo: '101', metros: 4 });
  await c.esperar();
  expect(api.enviadas).toEqual(['cadastrarMoldura', 'ajustarMoldura']);
  const [falha] = c.ler().falhas;
  expect(falha.erro).toBe('Já existe um produto com o código 101.');
  expect(falha.dados.foto_base64).toBeUndefined();
  expect(c.ler().fila).toEqual([]);
  await c.descartarFalha(falha.id_op);
  expect(c.ler().falhas).toEqual([]);
});

test('gravação feita durante a busca aparece por cima do pacote novo', async () => {
  const api = apiFalsa();
  const arm = armazenamentoFalso({ pacote: PACOTE });
  const c = montar(api, arm);
  let liberar;
  api.buscarPacote = () => new Promise((r) => { liberar = () => r({ tipo: 'ok', dados: comEstoque(4) }); });
  const abrindo = c.iniciar();
  await new Promise((r) => setTimeout(r, 0));
  api.online = false;
  await c.registrar('ajustarMoldura', { codigo: '101', metros: 9 });
  liberar();
  await abrindo;
  expect(c.ler().pacote.molduras[0].estoque_m).toBe(4);
  expect(estoqueNaTela(c)).toBe(9);
  expect(c.ler().fila).toHaveLength(1);
});

test('se só a busca do pacote falhar, tenta de novo sozinho', async () => {
  jest.useFakeTimers();
  try {
    const api = apiFalsa();
    api.online = false;
    const c = montar(api, armazenamentoFalso({ pacote: PACOTE }));
    await c.iniciar();
    expect(c.ler().sync.erro).toBe('Sem conexão com a planilha.');
    api.online = true;
    api.pacote = comEstoque(4);
    await jest.advanceTimersByTimeAsync(60000);
    await c.esperar();
    expect(estoqueNaTela(c)).toBe(4);
    expect(c.ler().sync.erro).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});

test('rascunho da contagem fica guardado', async () => {
  const arm = armazenamentoFalso({ pacote: PACOTE });
  const c = montar(apiFalsa(), arm);
  await c.iniciar();
  await c.definirRascunho('CR1-E1', '101', { varas: '2', extra: '' });
  expect(JSON.parse(arm.dados.get('rascunhos'))).toEqual({ 'CR1-E1': { 101: { varas: '2', extra: '' } } });
  await c.tirarDoRascunho('CR1-E1', '101');
  expect(c.ler().rascunhos).toEqual({ 'CR1-E1': {} });
  await c.limparRascunho('CR1-E1');
  expect(c.ler().rascunhos).toEqual({});
});
