import { criarApi } from '../api';

function resposta(corpo, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo))
  };
}

const OP = { id_op: 'abc12345', acao: 'ajustarMoldura', dados: { codigo: '1', metros: 4 }, extra: { foto_uri: 'x' } };

test('buscarPacote chama appSync com a senha codificada', async () => {
  const chamadas = [];
  const api = criarApi({
    url: 'https://exemplo/exec',
    token: 'a b&c',
    fetch: async (u, o) => { chamadas.push([u, o.method]); return resposta({ ok: true, dados: { molduras: [] } }); }
  });
  expect(await api.buscarPacote()).toEqual({ tipo: 'ok', dados: { molduras: [] } });
  expect(chamadas).toEqual([['https://exemplo/exec?action=appSync&token=a%20b%26c', 'GET']]);
});

test('enviar faz POST em texto com token, id_op, ação e dados, sem o extra', async () => {
  let pedido;
  const api = criarApi({
    url: 'https://exemplo/exec',
    token: 't0k3n',
    fetch: async (u, o) => {
      pedido = { u, ...o };
      return resposta({ ok: true, dados: { repetida: false, resultado: { codigo: '1', novo_estoque_m: 4 } } });
    }
  });
  expect(await api.enviar(OP)).toEqual({ tipo: 'ok', resultado: { codigo: '1', novo_estoque_m: 4 }, repetida: false });
  expect(pedido.method).toBe('POST');
  expect(pedido.headers['Content-Type']).toBe('text/plain;charset=utf-8');
  expect(JSON.parse(pedido.body)).toEqual({ token: 't0k3n', id_op: 'abc12345', acao: 'ajustarMoldura', dados: { codigo: '1', metros: 4 } });
});

test.each([
  ['sem rede', async () => { throw new TypeError('Network request failed'); }, 'Sem conexão com a planilha.'],
  ['404 do Google', async () => resposta('<html>', 404), 'A planilha respondeu 404.'],
  ['página HTML no lugar do JSON', async () => resposta('<html>erro</html>'), 'A planilha mandou uma resposta que o app não entende.'],
  ['planilha ocupada', async () => resposta({ ok: false, erro: 'Sistema ocupado, tente de novo em instantes.' }), 'Sistema ocupado, tente de novo em instantes.'],
  ['senha errada', async () => resposta({ ok: false, erro: 'não autorizado' }), 'A senha do app não confere com a da planilha.']
])('%s é temporário', async (_nome, buscar, erro) => {
  const api = criarApi({ url: 'https://exemplo/exec', token: 't', fetch: buscar });
  expect(await api.enviar(OP)).toEqual({ tipo: 'temporario', erro });
});

test('erro de validação é recusado com a mensagem do servidor', async () => {
  const api = criarApi({ url: 'https://exemplo/exec', token: 't', fetch: async () => resposta({ ok: false, erro: 'Moldura não encontrada: 999' }) });
  expect(await api.enviar(OP)).toEqual({ tipo: 'recusado', erro: 'Moldura não encontrada: 999' });
});

test('desiste quando a planilha demora demais', async () => {
  const api = criarApi({
    url: 'https://exemplo/exec',
    token: 't',
    esperaMs: 20,
    fetch: (u, o) => new Promise((_, rejeitar) => o.signal.addEventListener('abort', () => rejeitar(new Error('abortado'))))
  });
  expect(await api.buscarPacote()).toEqual({ tipo: 'temporario', erro: 'A planilha demorou demais pra responder.' });
});

test('sem endereço configurado avisa em vez de chamar', async () => {
  const api = criarApi({ url: '', token: 't', fetch: async () => { throw new Error('não devia chamar'); } });
  expect(await api.buscarPacote()).toEqual({ tipo: 'temporario', erro: 'Falta o endereço da planilha no app.' });
});

test('buscarFinanceiro e buscarHistoricoOficina mandam só os filtros preenchidos', async () => {
  const chamadas = [];
  const api = criarApi({
    url: 'https://exemplo/exec',
    token: 't',
    fetch: async (u) => { chamadas.push(u); return resposta({ ok: true, dados: {} }); }
  });
  await api.buscarFinanceiro({ pin: '012345', mes: '2026-11', tipo: '', periodo: 'mes' });
  await api.buscarHistoricoOficina('2026-10');
  expect(chamadas).toEqual([
    'https://exemplo/exec?action=appFinanceiro&token=t&pin=012345&mes=2026-11&periodo=mes',
    'https://exemplo/exec?action=appOficinaHistorico&token=t&mes=2026-10'
  ]);
});

test('senha errada do financeiro volta como recusada com a mensagem da planilha', async () => {
  const api = criarApi({ url: 'https://exemplo/exec', token: 't', fetch: async () => resposta({ ok: false, erro: 'Senha errada.' }) });
  expect(await api.buscarFinanceiro({ pin: '000000' })).toEqual({ tipo: 'recusado', erro: 'Senha errada.' });
});

test('foto da ordem lê o arquivo do tablet na hora de enviar', async () => {
  let corpo;
  const lidos = [];
  const api = criarApi({
    url: 'https://exemplo/exec',
    token: 't',
    lerFoto: async (uri) => { lidos.push(uri); return 'QkFTRTY0'; },
    fetch: async (u, o) => {
      corpo = JSON.parse(o.body);
      return resposta({ ok: true, dados: { repetida: false, resultado: { foto_url: 'https://d/2' } } });
    }
  });
  const op = { id_op: 'f1', acao: 'fotoOrdem', dados: { id: 'OS-014', foto_ref: 'a' }, extra: { foto_uri: 'file:///a.jpg' } };
  expect(await api.enviar(op)).toEqual({ tipo: 'ok', resultado: { foto_url: 'https://d/2' }, repetida: false });
  expect(lidos).toEqual(['file:///a.jpg']);
  expect(corpo.dados).toEqual({ id: 'OS-014', foto_ref: 'a', foto_base64: 'QkFTRTY0', foto_tipo: 'image/jpeg' });
  expect(op.dados).toEqual({ id: 'OS-014', foto_ref: 'a' });
});

test('foto que sumiu do tablet é recusada sem chamar a planilha', async () => {
  const buscar = jest.fn();
  const api = criarApi({ url: 'https://exemplo/exec', token: 't', fetch: buscar, lerFoto: async () => { throw new Error('sumiu'); } });
  const op = { id_op: 'f2', acao: 'fotoOrdem', dados: { id: 'OS-014', foto_ref: 'a' }, extra: { foto_uri: 'file:///x.jpg' } };
  expect(await api.enviar(op)).toEqual({ tipo: 'recusado', erro: 'A foto não está mais no tablet. Tire de novo.' });
  expect(buscar).not.toHaveBeenCalled();
});
