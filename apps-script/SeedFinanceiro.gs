// SeedFinanceiro.gs — importação ÚNICA dos lançamentos de junho/2026 pras abas Saidas/Entradas.
//
// Os CSVs ficam em DadosDaLoja.gs (gastos da loja + pessoais, com a coluna tipo; e o caixa de
// vendas por página). A importação é um clique no menu, sem depender de upload no Drive.
// Idempotente: reimportar remove só as linhas origem='historico' e regrava — NUNCA toca no que
// você lançou pelo app (origem='app'). Datas DD/MM viram Date com ANO_HISTORICO; valores pt-BR
// viram número. Reimportar com este CSV de junho APAGA os meses antigos (que eram historico).

// Saídas: mes;data;descricao;valor;categoria;pagamento;obs  -> schema da aba Saidas.
function _linhasSaidasHistorico() {
  return _parseCSV(CSV_SAIDAS_HISTORICO).map(function (r, i) {
    var cat = _resolverCategoria(r.categoria, CATEGORIAS_SAIDA);
    if (!cat.reconhecida) Logger.log('Saída histórica fora do enum: "' + r.categoria + '" -> Outros');
    return {
      id: 'HS-' + String(i + 1).padStart(4, '0'),
      timestamp: new Date(),
      data: _parseDataBR(r.data, ANO_HISTORICO),
      descricao: r.descricao || '',
      valor: _parseValorBR(r.valor),
      categoria: cat.categoria,
      pagamento: r.pagamento || '',
      obs: r.obs || '',
      origem: 'historico',
      tipo: _resolverTipo(r.tipo)
    };
  });
}

// Entradas: mes;data;descricao;valor;categoria;tipo;obs (cada linha = um fechamento de caixa)
//  -> schema da aba Entradas. Sem forma de pagamento no histórico; descrição+obs viram obs.
function _linhasEntradasHistorico() {
  return _parseCSV(CSV_ENTRADAS_HISTORICO).map(function (r, i) {
    var obs = [r.descricao, r.obs].filter(function (x) { return x; }).join(' — ');
    return {
      id: 'HE-' + String(i + 1).padStart(4, '0'),
      timestamp: new Date(),
      data: _parseDataBR(r.data, ANO_HISTORICO),
      valor: _parseValorBR(r.valor),
      forma_pagamento: '',
      cliente: '',
      obs: obs,
      origem: 'historico'
    };
  });
}

// Reescreve a aba: mantém as linhas origem!='historico' (lançadas no app) e troca as históricas.
function _reimportarAba(nomeAba, novasHistoricas) {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomeAba);
  var header = CABECALHOS_FIN[nomeAba];
  var mantidas = lerAba(nomeAba).filter(function (l) { return String(l.origem) !== 'historico'; });
  var todas = mantidas.concat(novasHistoricas);
  if (aba.getLastRow() > 1) aba.getRange(2, 1, aba.getLastRow() - 1, header.length).clearContent();
  if (todas.length) {
    var matriz = todas.map(function (o) {
      return header.map(function (col) { return (o[col] === undefined || o[col] === null) ? '' : o[col]; });
    });
    aba.getRange(2, 1, matriz.length, header.length).setValues(matriz);
  }
  return novasHistoricas.length;
}

// Importação única (idempotente). Rode pelo menu "Financeiro > Importar histórico dos CSV".
function importarHistorico() {
  return comLock(function () {
    garantirAbasFinanceiro();
    var ns = _reimportarAba(ABAS_FIN.SAIDAS, _linhasSaidasHistorico());
    var ne = _reimportarAba(ABAS_FIN.ENTRADAS, _linhasEntradasHistorico());
    _escreverResumoMensal();
    return 'Histórico importado: ' + ns + ' saídas + ' + ne + ' entradas (origem=historico). Lançamentos do app preservados.';
  });
}
