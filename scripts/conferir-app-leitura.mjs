import { randomUUID } from 'node:crypto';

const URL_API = process.env.APPS_SCRIPT_URL;
const TOKEN = process.env.APP_TOKEN;
if (!URL_API || !TOKEN) {
  console.error('Faltou APPS_SCRIPT_URL ou APP_TOKEN no .env');
  process.exit(1);
}

async function get(params) {
  const r = await fetch(URL_API + '?' + new URLSearchParams(params), { redirect: 'follow' });
  return r.json();
}

async function post(corpo) {
  const r = await fetch(URL_API, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });
  return r.json();
}

function confere(nome, ok, detalhe) {
  console.log((ok ? 'OK    ' : 'FALHA ') + nome + (detalhe ? ': ' + detalhe : ''));
  if (!ok) process.exitCode = 1;
}

const errado = await get({ action: 'appSync', token: 'errado' });
confere('appSync recusa senha errada', errado.ok === false);

const resposta = await get({ action: 'appSync', token: TOKEN });
const sync = { ok: resposta.ok, erro: resposta.erro, ...(resposta.dados || {}) };
confere('appSync responde', sync.ok === true, sync.ok ? '' : sync.erro);
if (sync.ok) {
  const abertos = sync.orcamentos_abertos || [];
  confere('molduras e atendentes', (sync.molduras || []).length > 0 && (sync.atendentes || []).length > 0,
    (sync.molduras || []).length + ' molduras, ' + (sync.atendentes || []).length + ' atendentes');
  confere('orçamentos abertos vêm com a lista de quadros', abertos.every((o) => Array.isArray(o.quadros) && o.quadros.length > 0 && typeof o.resumo === 'string'),
    abertos.length + ' abertos' + (abertos.length ? ': ' + abertos.map((o) => (o.id || 'sem número') + ' (' + o.quadros.length + ' quadro(s): ' + o.resumo + ')').join('; ') : ''));
  const oficina = sync.oficina;
  confere('ordens da oficina vêm no appSync', Array.isArray(oficina),
    Array.isArray(oficina) ? oficina.filter((o) => o.status === 'em_producao').length + ' em produção, ' + oficina.filter((o) => o.status === 'acabamento').length + ' no acabamento, ' + oficina.filter((o) => o.status === 'pronto').length + ' prontas' : 'faltou o campo oficina');
}

const mes = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
const historico = await get({ action: 'appOficinaHistorico', token: TOKEN, mes });
confere('histórico da oficina do mês responde', historico.ok === true && !!(historico.dados && historico.dados.resumo),
  historico.ok ? mes + ': ' + historico.dados.resumo.quantidade + ' ordens' : historico.erro);
const historicoErrado = await get({ action: 'appOficinaHistorico', token: 'errado', mes });
confere('histórico da oficina recusa senha errada', historicoErrado.ok === false);
const financeiroErrado = await get({ action: 'appFinanceiro', token: 'errado' });
confere('financeiro recusa senha do app errada', financeiroErrado.ok === false && /autorizado/.test(financeiroErrado.erro || ''));

const acaoErrada = await post({ token: TOKEN, id_op: randomUUID(), acao: 'apagarTudo', dados: {} });
confere('doPost recusa ação desconhecida', acaoErrada.ok === false && /Ação desconhecida/.test(acaoErrada.erro || ''));
