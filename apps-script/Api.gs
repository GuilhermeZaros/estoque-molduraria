function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    return _json({ ok: true, dados: _rotear(p.action || '', p) });
  } catch (err) {
    return _json({ ok: false, erro: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    var corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!_tokenAppOk(corpo.token)) throw new Error('não autorizado');
    return _json({ ok: true, dados: appExecutar(corpo) });
  } catch (err) {
    return _json({ ok: false, erro: String(err && err.message ? err.message : err) });
  }
}

function _rotear(action, p) {
  switch (action) {
    case 'ping':
      return { pong: true, hora: new Date() };
    case 'buscarMolduras':
      return buscarMolduras({ estilo: p.estilo, cor: p.cor, acabamento: p.acabamento, limite: p.limite,
                              larguraMin: p.larguraMin, larguraMax: p.larguraMax });
    case 'listarMateriais':
      return listarMateriais(p.tipo);
    case 'consultarProduto':
      return consultarProduto(p.codigo);
    case 'calcularOrcamento':
      return orcamentoPorCodigos({
        moldura: p.moldura, vidro: p.vidro, chapa: p.chapa, espelho: p.espelho,
        largura: p.largura, altura: p.altura, objetoAlto: p.objetoAlto,
        vidroDuplo: p.vidroDuplo, paspatur: p.paspatur
      });
    case 'oficinaPendentes':
      if (!_tokenOficinaOk(p.token)) throw new Error('não autorizado');
      return oficinaPendentes();
    case 'oficinaConfirmarAviso':
      if (!_tokenOficinaOk(p.token)) throw new Error('não autorizado');
      return oficinaConfirmarAviso(p.id, _ehDisponivel(p.ok), p.motivo);
    case 'appSync':
      if (!_tokenAppOk(p.token)) throw new Error('não autorizado');
      return appSync();
    case 'appOficinaHistorico':
      if (!_tokenAppOk(p.token)) throw new Error('não autorizado');
      return appOficinaHistorico(p.mes);
    case 'appFinanceiro':
      if (!_tokenAppOk(p.token)) throw new Error('não autorizado');
      return appFinanceiro(p);
    default:
      throw new Error('Ação desconhecida: ' + action);
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
