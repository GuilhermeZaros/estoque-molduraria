import { novaOperacao, semFoto, esvaziarFila, descreverOperacao } from '../fila';

test('novaOperacao guarda id, ação, dados, extra e hora', () => {
  expect(novaOperacao('ajustarMoldura', { codigo: '1', metros: 2 }, { id: 'abc12345', agora: '2026-10-30T10:00:00.000Z' }))
    .toEqual({ id_op: 'abc12345', acao: 'ajustarMoldura', dados: { codigo: '1', metros: 2 }, extra: null, criada_em: '2026-10-30T10:00:00.000Z' });
});

test('semFoto tira só o base64 e não mexe na operação original', () => {
  const op = novaOperacao('cadastrarMoldura', { codigo: '9', foto_base64: 'AAAA', foto_tipo: 'image/jpeg' }, { id: 'abc12345', agora: 't' });
  expect(semFoto(op).dados).toEqual({ codigo: '9', foto_tipo: 'image/jpeg' });
  expect(op.dados.foto_base64).toBe('AAAA');
});

function filaDe(ids) {
  const fila = ids.map((id) => ({ id_op: id }));
  return { fila, proxima: () => fila[0], tirar: async (op) => { fila.splice(fila.indexOf(op), 1); } };
}

test('envia em ordem e para no primeiro erro temporário', async () => {
  const f = filaDe(['a', 'b', 'c']);
  const enviadas = [];
  const r = await esvaziarFila({
    proxima: f.proxima,
    aoTerminar: f.tirar,
    enviar: async (op) => {
      enviadas.push(op.id_op);
      return op.id_op === 'b' ? { tipo: 'temporario', erro: 'Sem conexão com a planilha.' } : { tipo: 'ok', resultado: {} };
    }
  });
  expect(enviadas).toEqual(['a', 'b']);
  expect(r.parou).toBe('Sem conexão com a planilha.');
  expect(f.fila.map((o) => o.id_op)).toEqual(['b', 'c']);
});

test('operação recusada sai da fila sem travar as outras', async () => {
  const f = filaDe(['a', 'b']);
  const terminadas = [];
  const r = await esvaziarFila({
    proxima: f.proxima,
    aoTerminar: async (op, resposta) => { terminadas.push(op.id_op + ':' + resposta.tipo); await f.tirar(op); },
    enviar: async (op) => (op.id_op === 'a' ? { tipo: 'recusado', erro: 'Metros inválidos: -1' } : { tipo: 'ok', resultado: {} })
  });
  expect(r.parou).toBeNull();
  expect(terminadas).toEqual(['a:recusado', 'b:ok']);
});

test('pega a operação que entrou enquanto enviava', async () => {
  const f = filaDe(['a']);
  const enviadas = [];
  await esvaziarFila({
    proxima: f.proxima,
    aoTerminar: f.tirar,
    enviar: async (op) => {
      enviadas.push(op.id_op);
      if (op.id_op === 'a') f.fila.push({ id_op: 'b' });
      return { tipo: 'ok', resultado: {} };
    }
  });
  expect(enviadas).toEqual(['a', 'b']);
});

test('descreverOperacao em português', () => {
  expect(descreverOperacao({ acao: 'entradaMoldura', dados: { codigo: '101' } })).toBe('chegou mercadoria de 101');
  expect(descreverOperacao({ acao: 'contarCasinha', dados: { casinha: 'CR1-E1' } })).toBe('contagem de CR1-E1');
  expect(descreverOperacao({ acao: 'outra', dados: {} })).toBe('outra');
});

test('descreve as ações do orçamento e do inventário', () => {
  expect(descreverOperacao({ acao: 'salvarOrcamento', dados: { cliente: 'Maria' } })).toBe('orçamento de Maria');
  expect(descreverOperacao({ acao: 'fecharVenda', dados: { cliente: '' } })).toBe('venda de cliente sem nome');
  expect(descreverOperacao({ acao: 'zerarNaoEncontradas', dados: { codigos: ['1', '2'] } })).toBe('zerar 2 molduras não achadas');
  expect(descreverOperacao({ acao: 'descartarOrcamento', dados: { cliente: 'Maria' } })).toBe('descartar orçamento de Maria');
});
