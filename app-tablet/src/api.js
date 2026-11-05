const TEMPORARIO = /ocupado|tente de novo|tempo|timed? ?out|limite|service|serviço|exception|internal/i;

function erroDoServidor(erro) {
  if (/não autorizado/i.test(erro)) return { tipo: 'temporario', erro: 'A senha do app não confere com a da planilha.' };
  return { tipo: TEMPORARIO.test(erro) ? 'temporario' : 'recusado', erro };
}

const SEM_FOTO = 'A foto não está mais no tablet. Tire de novo.';

export function criarApi({ url, token, fetch: buscar = (...args) => globalThis.fetch(...args), esperaMs = 45000, lerFoto }) {
  async function chamar(endereco, opcoes) {
    if (!url) return { tipo: 'temporario', erro: 'Falta o endereço da planilha no app.' };
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), esperaMs);
    try {
      const resp = await buscar(endereco, { ...opcoes, signal: controle.signal });
      if (!resp.ok) return { tipo: 'temporario', erro: 'A planilha respondeu ' + resp.status + '.' };
      const texto = await resp.text();
      let corpo;
      try {
        corpo = JSON.parse(texto);
      } catch (e) {
        return { tipo: 'temporario', erro: 'A planilha mandou uma resposta que o app não entende.' };
      }
      if (corpo && corpo.ok) return { tipo: 'ok', dados: corpo.dados };
      return erroDoServidor(String((corpo && corpo.erro) || 'Erro sem mensagem.'));
    } catch (e) {
      return {
        tipo: 'temporario',
        erro: controle.signal.aborted ? 'A planilha demorou demais pra responder.' : 'Sem conexão com a planilha.'
      };
    } finally {
      clearTimeout(relogio);
    }
  }

  function ler(action, params = {}) {
    const extra = Object.keys(params)
      .filter((k) => params[k] != null && params[k] !== '')
      .map((k) => '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('');
    return chamar(url + '?action=' + action + '&token=' + encodeURIComponent(token) + extra, { method: 'GET' });
  }

  return {
    buscarPacote() {
      return ler('appSync');
    },
    buscarHistoricoOficina(mes) {
      return ler('appOficinaHistorico', { mes });
    },
    buscarFinanceiro({ pin, mes, tipo, categoria, periodo } = {}) {
      return ler('appFinanceiro', { pin, mes, tipo, categoria, periodo });
    },
    async enviar(op) {
      let dados = op.dados;
      if (op.acao === 'fotoOrdem') {
        try {
          dados = { ...dados, foto_base64: await lerFoto(op.extra && op.extra.foto_uri), foto_tipo: 'image/jpeg' };
        } catch (e) {
          return { tipo: 'recusado', erro: SEM_FOTO };
        }
        if (!dados.foto_base64) return { tipo: 'recusado', erro: SEM_FOTO };
      }
      const r = await chamar(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token, id_op: op.id_op, acao: op.acao, dados })
      });
      if (r.tipo !== 'ok') return r;
      return { tipo: 'ok', resultado: r.dados.resultado, repetida: r.dados.repetida };
    }
  };
}
