import { aplicarOperacao, aplicarPendentes } from './efeitos';
import { novaOperacao, semFoto, vaiEmLote, proximoLote } from './fila';

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
    const guardarPacote = async (pacote) => {
      pedirPacote = false;
      ultimoOk = agora();
      mudar({ pacote });
      await armazenamento.gravar('pacote', pacote);
    };
    try {
      for (;;) {
        const primeira = estado.fila[0];
        if (vaiEmLote(primeira) && api.enviarLote) {
          const lote = proximoLote(estado.fila);
          const depois = estado.fila[lote.length];
          const r = await api.enviarLote(lote, pedirPacote && !vaiEmLote(depois));
          if (r.tipo !== 'ok') { erro = r.erro; break; }
          if (!r.respostas.length) { erro = 'A planilha não respondeu as gravações.'; break; }
          let parou = null;
          for (let i = 0; i < r.respostas.length && i < lote.length; i++) {
            if (r.respostas[i].tipo === 'temporario') { parou = r.respostas[i].erro; break; }
            await concluir(lote[i], r.respostas[i]);
          }
          if (parou) { erro = parou; break; }
          if (r.pacote) await guardarPacote(r.pacote);
          continue;
        }
        if (vaiEmLote(primeira)) {
          const resposta = await api.enviar(primeira);
          if (resposta.tipo === 'temporario') { erro = resposta.erro; break; }
          await concluir(primeira, resposta);
          continue;
        }
        if (pedirPacote) {
          const p = await api.buscarPacote();
          if (p.tipo !== 'ok') { erro = p.erro; break; }
          await guardarPacote(p.dados);
          continue;
        }
        if (!primeira) break;
        const resposta = await api.enviar(primeira);
        if (resposta.tipo === 'temporario') { erro = resposta.erro; break; }
        await concluir(primeira, resposta);
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
