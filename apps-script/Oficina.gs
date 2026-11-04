// Oficina.gs — ordens de serviço da molduraria + ponte do aviso automático da Julia.
//
//  - Texto LIVRE (não amarra no catálogo de estoque): muita moldura da loja não está no sistema.
//  - Fluxo de status: em_producao -> acabamento -> pronto -> entregue.
//  - Quando a oficina marca "pronto", a Julia (bot) avisa o cliente no WhatsApp e grava o aviso aqui.
//  - O VALOR cai no Financeiro (Entradas, origem 'oficina') quando o cliente RETIRA (entregue).
//
// Auth: funções da interface usam a sessão de login (_validarSessao/_validarGestao).
//       Os 2 endpoints do bot (oficinaPendentes/oficinaConfirmarAviso) são protegidos por TOKEN
//       (Script Property OFICINA_TOKEN), checado no Api.gs — porque o web app é anônimo.

// ====================== Núcleo puro (testável em Node) ======================

// Próximo ID "OS-NNN": maior número existente + 1, com 3 dígitos.
function _proximoIdOS(ids) {
  var maior = 0;
  (ids || []).forEach(function (id) {
    var m = String(id == null ? '' : id).match(/(\d+)\s*$/);
    if (m) { var n = parseInt(m[1], 10); if (n > maior) maior = n; }
  });
  return 'OS-' + String(maior + 1).padStart(3, '0');
}

// Prazo: aceita ISO do <input type=date> ('AAAA-MM-DD') ou texto; guarda/exibe como "DD/MM/AAAA".
function _prazoStr(raw) {
  var s = String(raw == null ? '' : raw).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : s;
}

function _prazoParaTexto(v) {
  if (v && typeof v.getMonth === 'function') {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(v.getDate()) + '/' + p(v.getMonth() + 1) + '/' + v.getFullYear();
  }
  return _prazoStr(v);
}

function _isoOuTexto(v) {
  if (v && typeof v.toISOString === 'function') return v.toISOString();
  return String(v == null ? '' : v);
}

function _ordemParaApp(o) {
  return {
    id: String(o.ID || ''), ref_app: String(o.Ref_app || ''), cliente: String(o.Cliente || ''),
    telefone: String(o.Telefone || ''), descricao: String(o.Descricao || ''), prazo: _prazoParaTexto(o.Prazo),
    valor: Number(o.Valor) || 0, status: String(o.Status || ''), aviso: String(o.Aviso || ''),
    data_criacao: _isoOuTexto(o.Data_criacao), data_pronto: _isoOuTexto(o.Data_pronto),
    data_entrega: _isoOuTexto(o.Data_entrega)
  };
}

// Date -> "dd/mm/aaaa hh:mm" (string). Regra de ouro: nada de Date no retorno do google.script.run.
function _dataHoraOS(v) {
  if (!v) return '';
  if (v && typeof v.getMonth === 'function') {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(v.getDate()) + '/' + p(v.getMonth() + 1) + '/' + v.getFullYear() +
           ' ' + p(v.getHours()) + ':' + p(v.getMinutes());
  }
  return String(v);
}

// ====================== Aba / setup ======================

function garantirAbaOficina() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABAS_FIN.OFICINA);
  if (!aba) {
    aba = ss.insertSheet(ABAS_FIN.OFICINA);
    aba.getRange(1, 1, 1, CABECALHOS_FIN.Oficina.length).setValues([CABECALHOS_FIN.Oficina]);
    aba.setFrozenRows(1);
  }
  return 'Aba Oficina pronta.';
}

// Item de menu: cria a aba Oficina, garante a coluna "papeis" em Usuarios e gera/mostra o token do bot.
function prepararOficina() {
  garantirAbaOficina();
  garantirAbaUsuarios(); // adiciona a coluna "papeis" se faltar
  var token = _garantirTokenOficina();
  var msg = 'Pronto!\n\n• Aba "Oficina" criada/conferida.\n• Coluna "papeis" garantida em Usuarios ' +
            '(preencha: atendimento / oficina / dono — pode acumular com vírgula).\n\n' +
            'OFICINA_TOKEN (cole no .env do bot e reinicie a Julia):\n' + token;
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

function _garantirTokenOficina() {
  var props = PropertiesService.getScriptProperties();
  var t = props.getProperty('OFICINA_TOKEN');
  if (!t) { t = Utilities.getUuid(); props.setProperty('OFICINA_TOKEN', t); }
  return t;
}

function _tokenOficinaOk(t) {
  var esperado = PropertiesService.getScriptProperties().getProperty('OFICINA_TOKEN');
  return !!esperado && String(t == null ? '' : t) === esperado;
}

// ====================== Helpers internos ======================

function _acharOrdem(id) {
  if (!abaExiste(ABAS_FIN.OFICINA)) return null;
  var linhas = lerAba(ABAS_FIN.OFICINA);
  for (var i = 0; i < linhas.length; i++) {
    if (String(linhas[i].ID) === String(id)) return linhas[i];
  }
  return null;
}

function _acharOrdemApp(d) {
  var id = String(d && d.id || '');
  var ref = String(d && d.ref_app || '');
  var linhas = abaExiste(ABAS_FIN.OFICINA) ? lerAba(ABAS_FIN.OFICINA) : [];
  for (var i = 0; i < linhas.length; i++) {
    if (id && String(linhas[i].ID) === id) return linhas[i];
    if (ref && String(linhas[i].Ref_app || '') === ref) return linhas[i];
  }
  throw new Error('Ordem não encontrada.');
}

function _idsOficina() {
  if (!abaExiste(ABAS_FIN.OFICINA)) return [];
  return lerAba(ABAS_FIN.OFICINA).map(function (o) { return o.ID; });
}

function _lancarEntradaOficina(valor, cliente, idOS) {
  garantirColunas(ABAS_FIN.ENTRADAS, CABECALHOS_FIN.Entradas);
  var id = _proximoIdFin('E', _idsDaAba(ABAS_FIN.ENTRADAS));
  anexarLinha(ABAS_FIN.ENTRADAS, {
    id: id, timestamp: new Date(), data: new Date(), valor: valor,
    forma_pagamento: '', cliente: cliente || '', obs: 'Ordem ' + idOS, origem: 'oficina'
  });
  return id;
}

function _dadosDaOrdem(d) {
  var cliente = String(d.cliente || '').trim();
  if (!cliente) throw new Error('Informe o nome do cliente.');
  var valor = _parseValorBR(d.valor);
  return {
    Cliente: cliente, Telefone: String(d.telefone || '').trim(), Descricao: String(d.descricao || '').trim(),
    Prazo: _prazoStr(d.prazo), Valor: valor >= 0 ? valor : 0
  };
}

function _criarOrdemNucleo(d, quem) {
  garantirColunas(ABAS_FIN.OFICINA, CABECALHOS_FIN.Oficina);
  var campos = _dadosDaOrdem(d);
  var id = _proximoIdOS(_idsOficina());
  var linha = {
    ID: id, Data_criacao: new Date(), Status: 'em_producao', Aviso: '', Data_aviso: '', Data_pronto: '',
    Data_entrega: '', Lancado_financeiro: '', Criado_por: quem || '', Finalizado_por: '',
    Obs: String(d.obs || '').trim(), Ref_app: String(d.ref_app || '')
  };
  Object.keys(campos).forEach(function (k) { linha[k] = campos[k]; });
  anexarLinha(ABAS_FIN.OFICINA, linha);
  return { id: id };
}

function _editarOrdemNucleo(o, d) {
  atualizarCampos(ABAS_FIN.OFICINA, o._linha, _dadosDaOrdem(d));
  return { id: String(o.ID) };
}

function _marcarAcabamentoNucleo(o) {
  var atual = String(o.Status || '');
  if (atual !== 'em_producao' && atual !== 'acabamento') return { id: String(o.ID), status: atual };
  atualizarCampos(ABAS_FIN.OFICINA, o._linha, { Status: 'acabamento' });
  return { id: String(o.ID), status: 'acabamento' };
}

function _marcarProntoNucleo(o, quem) {
  atualizarCampos(ABAS_FIN.OFICINA, o._linha, { Status: 'pronto', Data_pronto: new Date(), Finalizado_por: quem || '' });
  return { id: String(o.ID) };
}

function _marcarEntregueNucleo(o) {
  atualizarCampos(ABAS_FIN.OFICINA, o._linha, { Status: 'entregue', Data_entrega: new Date() });
  var jaLancado = o.Lancado_financeiro === true || String(o.Lancado_financeiro).toUpperCase() === 'TRUE';
  var valor = Number(o.Valor) || 0;
  if (jaLancado || !(valor > 0)) return { id: String(o.ID), lancado: false };
  _lancarEntradaOficina(valor, o.Cliente, o.ID);
  atualizarCampos(ABAS_FIN.OFICINA, o._linha, { Lancado_financeiro: true });
  return { id: String(o.ID), lancado: true };
}

// ====================== Funções da interface (login) ======================

function criarOrdem(args) {
  var email = _validarGestao(args.token);
  return comLock(function () {
    var r = _criarOrdemNucleo(args, email);
    return { ok: true, id: r.id };
  });
}

function listarOrdens(token, filtro) {
  _validarSessao(token);
  if (!abaExiste(ABAS_FIN.OFICINA)) return [];
  var linhas = lerAba(ABAS_FIN.OFICINA);
  var aceitos = filtro ? String(filtro).split(',') : null;
  var out = [];
  for (var i = linhas.length - 1; i >= 0; i--) {
    var o = linhas[i];
    if (!o.ID) continue;
    if (aceitos && aceitos.indexOf(String(o.Status)) < 0) continue;
    out.push({
      id: o.ID, cliente: o.Cliente, telefone: o.Telefone, descricao: o.Descricao,
      prazo: _prazoParaTexto(o.Prazo), valor: Number(o.Valor) || 0, status: o.Status || '',
      aviso: o.Aviso || '', data_aviso: _dataHoraOS(o.Data_aviso),
      data_criacao: _dataHoraOS(o.Data_criacao), data_pronto: _dataHoraOS(o.Data_pronto),
      data_entrega: _dataHoraOS(o.Data_entrega), criado_por: o.Criado_por || ''
    });
  }
  return out;
}

function marcarPronto(args) {
  var email = _validarSessao(args.token);
  return comLock(function () {
    var o = _acharOrdem(args.id);
    if (!o) throw new Error('Ordem não encontrada: ' + args.id);
    _marcarProntoNucleo(o, email);
    return { ok: true };
  });
}

function marcarAcabamento(args) {
  _validarSessao(args.token);
  return comLock(function () {
    var o = _acharOrdem(args.id);
    if (!o) throw new Error('Ordem não encontrada: ' + args.id);
    _marcarAcabamentoNucleo(o);
    return { ok: true };
  });
}

function editarOrdem(args) {
  _validarGestao(args.token);
  return comLock(function () {
    var o = _acharOrdem(args.id);
    if (!o) throw new Error('Ordem não encontrada: ' + args.id);
    _editarOrdemNucleo(o, args);
    return { ok: true };
  });
}

function marcarEntregue(args) {
  _validarGestao(args.token);
  return comLock(function () {
    var o = _acharOrdem(args.id);
    if (!o) throw new Error('Ordem não encontrada: ' + args.id);
    return { ok: true, lancado: _marcarEntregueNucleo(o).lancado };
  });
}

// ====================== Endpoints do BOT (token checado no Api.gs) ======================

// Ordens prontas, ainda não avisadas e com telefone. Devolve o mínimo (sem descrição interna).
function oficinaPendentes() {
  if (!abaExiste(ABAS_FIN.OFICINA)) return [];
  var linhas = lerAba(ABAS_FIN.OFICINA);
  var out = [];
  for (var i = 0; i < linhas.length; i++) {
    var o = linhas[i];
    if (String(o.Status) !== 'pronto') continue;
    if (String(o.Aviso || '') !== '') continue;
    if (!String(o.Telefone || '').trim()) continue;
    out.push({ id: o.ID, cliente: o.Cliente, telefone: String(o.Telefone) });
  }
  return out;
}

// A Julia confirma o aviso. ok=true -> 'enviado'; ok=false -> 'falha' (+ motivo na Obs).
function oficinaConfirmarAviso(id, ok, motivo) {
  return comLock(function () {
    var o = _acharOrdem(id);
    if (!o) throw new Error('Ordem não encontrada: ' + id);
    if (ok) {
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Aviso', 'enviado');
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Data_aviso', new Date());
    } else {
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Aviso', 'falha');
      var obs = String(o.Obs || '');
      var nota = 'aviso falhou: ' + (motivo || 'erro');
      atualizarCelula(ABAS_FIN.OFICINA, o._linha, 'Obs', obs ? (obs + ' | ' + nota) : nota);
    }
    return { ok: true };
  });
}
