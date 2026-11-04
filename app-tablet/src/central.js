import { aplicarOperacao, aplicarPendentes } from './efeitos';
import { esvaziarFila, novaOperacao, semFoto } from './fila';

export function criarCentral({ api, armazenamento, gerarId, agora = () => new Date().toISOString(), retentarEmMs = 30000 }) {
  let estado = {
    carregado: false,
    pacote: null,
    visivel: null,
    fila: [],
    falhas: [],
    rascunhos: {},
    sync: { trabalhando: false, ultimo_ok: null, erro: null }
  };
  const ouvintes = new Set();
  let carregando = null;
  let promessa = null;
  let pedirPacote = false;
  let deNovo = false;
  let parado = false;
  let retentativa = null;

  function mudar(parcial) {
    const novo = { ...estado, ...parcial };
    if ('pacote' in parcial || 'fila' in parcial) {
      novo.visivel = novo.pacote ? aplicarPendentes(novo.pacote, novo.fila) : null;
    }
    estado = novo;
    ouvintes.forEach((f) => f());
  }

  function gravarFila() {
    return armazenamento.gravar('fila', estado.fila.map((o) => o.id_op));
  }

  async function concluir(op, resposta) {
    const fila = estado.fila.filter((o) => o.id_op !== op.id_op);
    if (resposta.tipo === 'ok') {
      const pacote = estado.pacote ? aplicarOperacao(estado.pacote, op, resposta.resultado) : null;
      mudar({ fila, pacote });
      if (pacote) await armazenamento.gravar('pacote', pacote);
    } else {
      mudar({ fila, falhas: [...estado.falhas, { ...semFoto(op), erro: resposta.erro, quando: agora() }] });
      await armazenamento.gravar('falhas', estado.falhas);
    }
    await gravarFila();
    await armazenamento.apagar('op:' + op.id_op);
  }

  function agendar(erro) {
    if (retentativa) clearTimeout(retentativa);
    retentativa = null;
    if (erro && (estado.fila.length || pedirPacote) && !parado) {
      retentativa = setTimeout(() => { retentativa = null; trabalhar(); }, retentarEmMs);
    }
  }

  async function rodar() {
    mudar({ sync: { ...estado.sync, trabalhando: true } });
    let erro = null;
    let ultimoOk = estado.sync.ultimo_ok;
    try {
      for (;;) {
        const envio = await esvaziarFila({
          proxima: () => estado.fila[0],
          enviar: (op) => api.enviar(op),
          aoTerminar: concluir
        });
        if (envio.parou) { erro = envio.parou; break; }
        if (!pedirPacote) break;
        pedirPacote = false;
        const p = await api.buscarPacote();
        if (p.tipo !== 'ok') { erro = p.erro; pedirPacote = true; break; }
        ultimoOk = agora();
        mudar({ pacote: p.dados });
        await armazenamento.gravar('pacote', p.dados);
      }
    } catch (e) {
      erro = 'Erro no app: ' + (e && e.message ? e.message : e);
    }
    mudar({ sync: { trabalhando: false, ultimo_ok: ultimoOk, erro } });
    agendar(erro);
  }

  function trabalhar() {
    if (promessa) {
      deNovo = true;
      return promessa;
    }
    promessa = (async () => {
      do {
        deNovo = false;
        await rodar();
      } while (deNovo);
    })().finally(() => { promessa = null; });
    return promessa;
  }

  function sincronizar() {
    pedirPacote = true;
    return trabalhar();
  }

  async function carregar() {
    const [pacote, ids, falhas, rascunhos] = await Promise.all([
      armazenamento.ler('pacote', null),
      armazenamento.ler('fila', []),
      armazenamento.ler('falhas', []),
      armazenamento.ler('rascunhos', {})
    ]);
    const ops = await Promise.all(ids.map((id) => armazenamento.ler('op:' + id, null)));
    mudar({ carregado: true, pacote, fila: ops.filter(Boolean), falhas, rascunhos });
  }

  async function iniciar() {
    parado = false;
    if (!carregando) carregando = carregar();
    await carregando;
    return sincronizar();
  }

  async function registrar(acao, dados, extra) {
    const op = novaOperacao(acao, dados, { id: gerarId(), agora: agora(), extra });
    await armazenamento.gravar('op:' + op.id_op, op);
    mudar({ fila: [...estado.fila, op] });
    await gravarFila();
    trabalhar();
    return op;
  }

  function descartarFalha(idOp) {
    mudar({ falhas: estado.falhas.filter((f) => f.id_op !== idOp) });
    return armazenamento.gravar('falhas', estado.falhas);
  }

  function trocarRascunho(casinha, mudarItens) {
    const itens = mudarItens({ ...(estado.rascunhos[casinha] || {}) });
    const rascunhos = { ...estado.rascunhos };
    if (itens) rascunhos[casinha] = itens;
    else delete rascunhos[casinha];
    mudar({ rascunhos });
    return armazenamento.gravar('rascunhos', rascunhos);
  }

  return {
    ler: () => estado,
    ouvir(f) {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    iniciar,
    sincronizar,
    esperar: () => promessa || Promise.resolve(),
    registrar,
    descartarFalha,
    definirRascunho: (casinha, codigo, valor) => trocarRascunho(casinha, (r) => ({ ...r, [codigo]: valor })),
    tirarDoRascunho: (casinha, codigo) => trocarRascunho(casinha, (r) => { delete r[codigo]; return r; }),
    limparRascunho: (casinha) => trocarRascunho(casinha, () => null),
    parar() {
      parado = true;
      if (retentativa) clearTimeout(retentativa);
      retentativa = null;
    }
  };
}
