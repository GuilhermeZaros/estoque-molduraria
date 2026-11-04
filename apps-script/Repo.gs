// Repo.gs — único módulo que fala com o SpreadsheetApp.
// Lê abas como objetos, acha/atualiza/anexa linhas, e serializa escrita com lock.

var _CACHE_ABA_S = 1800;
var _CACHE_VERSAO_S = 21600;
var _CACHE_ABA_MAX = 80000;
var _abasMexidas = {};
var _dentroDoLock = 0;

function _planilha() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function _aba(nome) {
  var aba = _planilha().getSheetByName(nome);
  if (!aba) throw new Error('Aba não encontrada: ' + nome);
  return aba;
}

// Existe a aba? Pra tabelas OPCIONAIS (ex.: Avulsos) que podem ainda não ter sido criadas.
function abaExiste(nome) {
  return !!_planilha().getSheetByName(nome);
}

// Lê a aba inteira como array de objetos { Coluna: valor, _linha: n }.
function lerAba(nome) {
  return _linhasDaMatriz(_aba(nome).getDataRange().getValues());
}

function _linhasDaMatriz(valores) {
  if (valores.length < 2) return [];
  var cab = valores[0];
  var linhas = [];
  for (var i = 1; i < valores.length; i++) {
    var obj = {};
    for (var j = 0; j < cab.length; j++) obj[cab[j]] = valores[i][j];
    obj._linha = i + 1; // número real da linha na planilha (1-based)
    linhas.push(obj);
  }
  return linhas;
}

// Acha a 1ª linha cujo 'Codigo' bate. Retorna o objeto (com _linha) ou null.
function acharPorCodigo(nomeAba, codigo) {
  var linhas = lerAba(nomeAba);
  for (var i = 0; i < linhas.length; i++) {
    if (String(linhas[i].Codigo) === String(codigo)) return linhas[i];
  }
  return null;
}

// Atualiza uma célula por (linha, nome de coluna).
function atualizarCelula(nomeAba, numeroLinha, coluna, valor) {
  var aba = _aba(nomeAba);
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var idx = cab.indexOf(coluna);
  if (idx === -1) throw new Error('Coluna "' + coluna + '" não existe na aba ' + nomeAba);
  aba.getRange(numeroLinha, idx + 1).setValue(valor);
  _abaMudou(nomeAba);
}

function atualizarCampos(nomeAba, numeroLinha, campos) {
  var aba = _aba(nomeAba);
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var nomes = Object.keys(campos);
  var idxs = nomes.map(function (c) {
    var idx = cab.indexOf(c);
    if (idx === -1) throw new Error('Coluna "' + c + '" não existe na aba ' + nomeAba);
    return idx;
  });
  nomes.forEach(function (c, i) {
    aba.getRange(numeroLinha, idxs[i] + 1).setValue(campos[c]);
  });
  _abaMudou(nomeAba);
}

// Anexa uma linha a partir de um objeto, respeitando a ordem do cabeçalho.
function anexarLinha(nomeAba, obj) {
  var aba = _aba(nomeAba);
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var linha = cab.map(function (c) { return obj[c] !== undefined ? obj[c] : ''; });
  aba.appendRow(linha);
  _abaMudou(nomeAba);
}

function apagarLinhas(nomeAba, numerosLinha) {
  var aba = _aba(nomeAba);
  numerosLinha.slice().sort(function (a, b) { return b - a; }).forEach(function (n) { aba.deleteRow(n); });
  _abaMudou(nomeAba);
}

function garantirColunas(nome, cabecalho) {
  var ss = _planilha();
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
    aba.setFrozenRows(1);
    _abaMudou(nome);
    return aba;
  }
  var ultCol = Math.max(1, aba.getLastColumn());
  var cabReal = aba.getRange(1, 1, 1, ultCol).getValues()[0];
  var faltam = _colunasFaltando(cabReal, cabecalho);
  if (faltam.length) {
    aba.getRange(1, ultCol + 1, 1, faltam.length).setValues([faltam]);
    _abaMudou(nome);
  }
  return aba;
}

// Executa fn com lock exclusivo do script (evita escrita concorrente).
function comLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Sistema ocupado, tente de novo em instantes.');
  _dentroDoLock++;
  try {
    return fn();
  } finally {
    _dentroDoLock--;
    if (!_dentroDoLock) _avisarMudancas();
    lock.releaseLock();
  }
}

function lerAbas(nomes) {
  var cache = _cacheDasAbas();
  var saida = {};
  if (!cache) {
    nomes.forEach(function (n) { saida[n] = _linhasDaMatriz(_matrizDaAba(n)); });
    return saida;
  }
  var versoes = _versoesDasAbas(cache, nomes);
  var chaves = nomes.map(function (n) { return 'aba:' + n + ':' + versoes[n]; });
  var achados = _semFalha(function () { return cache.getAll(chaves); }) || {};
  var guardar = {};
  nomes.forEach(function (n, i) {
    var texto = achados[chaves[i]];
    if (texto) {
      saida[n] = _linhasDaMatriz(_matrizDoTexto(texto));
      return;
    }
    var matriz = _matrizDaAba(n);
    saida[n] = _linhasDaMatriz(matriz);
    var novo = _textoDaMatriz(matriz);
    if (novo.length <= _CACHE_ABA_MAX) guardar[chaves[i]] = novo;
  });
  if (Object.keys(guardar).length) _semFalha(function () { cache.putAll(guardar, _CACHE_ABA_S); });
  return saida;
}

function onEdit(e) {
  if (e && e.range) _trocarVersoes([e.range.getSheet().getName()]);
}

function _matrizDaAba(nome) {
  var aba = _planilha().getSheetByName(nome);
  return aba ? aba.getDataRange().getValues() : [];
}

function _textoDaMatriz(matriz) {
  return JSON.stringify(matriz.map(function (linha) {
    return linha.map(function (v) { return v && typeof v.getTime === 'function' ? { $d: v.getTime() } : v; });
  }));
}

function _matrizDoTexto(texto) {
  return JSON.parse(texto).map(function (linha) {
    return linha.map(function (v) { return v && typeof v === 'object' && '$d' in v ? new Date(v.$d) : v; });
  });
}

function _cacheDasAbas() {
  return _semFalha(function () { return CacheService.getScriptCache(); });
}

function _semFalha(fn) {
  try { return fn(); } catch (e) { return null; }
}

function _novaVersao() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function _versoesDasAbas(cache, nomes) {
  var guardadas = _semFalha(function () { return cache.getAll(nomes.map(function (n) { return 'ver:' + n; })); }) || {};
  var versoes = {};
  var novas = {};
  nomes.forEach(function (n) {
    versoes[n] = guardadas['ver:' + n];
    if (!versoes[n]) {
      versoes[n] = _novaVersao();
      novas['ver:' + n] = versoes[n];
    }
  });
  if (Object.keys(novas).length) _semFalha(function () { cache.putAll(novas, _CACHE_VERSAO_S); });
  return versoes;
}

function _trocarVersoes(nomes) {
  var novas = {};
  nomes.forEach(function (n) { novas['ver:' + n] = _novaVersao(); });
  _semFalha(function () { CacheService.getScriptCache().putAll(novas, _CACHE_VERSAO_S); });
}

function _abaMudou(nome) {
  _abasMexidas[nome] = true;
  if (!_dentroDoLock) _avisarMudancas();
}

function _avisarMudancas() {
  var nomes = Object.keys(_abasMexidas);
  if (!nomes.length) return;
  _abasMexidas = {};
  _semFalha(function () { SpreadsheetApp.flush(); });
  _trocarVersoes(nomes);
}
