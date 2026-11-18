// SeedMoldurasRelatorio.gs — cadastra de uma vez as molduras do relatório do sistema da loja
// (dados em MoldurasRelatorioDados.gs). Entram com estoque 0 e sem foto: a quantidade se acerta
// contando no tablet e a foto se tira na tela de editar. Rode pelo menu. Idempotente: pula o
// código que já existe na aba Molduras (mesmo escrito diferente, ex.: "066-R-390" = "066-R390").
// O custo vem do CUSTOS_MOLDURAS do DadosDaLoja.gs, quando ele existe e é menor que a venda.

// Só o primeiro traço conta (separa perfil de acabamento): "12-1049" ≠ "1210-49".
// Depois do traço, espaço e traço somem. "RM" e "R" continuam diferentes (375-RM-300 ≠ 375-R300).
function _chaveCodigoMoldura(codigo) {
  var t = String(codigo == null ? '' : codigo).toUpperCase().trim().replace(/\s+/g, '-');
  var i = t.indexOf('-');
  if (i < 0) return t;
  var resto = t.slice(i + 1).replace(/-/g, '');
  return t.slice(0, i + 1) + resto;
}

// Linhas novas pra aba Molduras (puro, testado). `atuais` = linhas da aba; `custos` = {codigo: custo}.
function _moldurasDoRelatorioParaCadastrar(atuais, catalogo, custos) {
  var existentes = {};
  (atuais || []).forEach(function (m) { existentes[_chaveCodigoMoldura(m.Codigo)] = true; });
  var novas = [], puladas = 0, comCusto = 0;
  (catalogo || []).forEach(function (m) {
    var chave = _chaveCodigoMoldura(m.Codigo);
    if (existentes[chave]) { puladas++; return; }
    existentes[chave] = true;
    var venda = Number(m.Valor_por_metro) || 0;
    var custo = custos ? Number(custos[m.Codigo]) : NaN;
    var temCusto = custo > 0 && custo < venda;
    if (temCusto) comCusto++;
    novas.push({
      Codigo: m.Codigo, Nome: m.Nome, Marca: m.Marca || '', Estilo: m.Estilo || '', Cor: m.Cor || '',
      Largura_perfil_cm: m.Largura_perfil_cm || '', Valor_por_metro: venda || '',
      Custo_por_metro: temCusto ? custo : '', Descricao: m.Descricao || '', Foto_URL: '',
      Estoque_atual_m: 0, Disponivel: venda > 0
    });
  });
  return { novas: novas, puladas: puladas, comCusto: comCusto };
}

function cadastrarMoldurasDoRelatorio() {
  return comLock(function () {
    var custos = (typeof CUSTOS_MOLDURAS !== 'undefined') ? CUSTOS_MOLDURAS : {};
    var r = _moldurasDoRelatorioParaCadastrar(lerAba(ABAS.MOLDURAS), MOLDURAS_RELATORIO, custos);
    anexarLinhas(ABAS.MOLDURAS, r.novas);
    return 'Molduras do relatório: ' + r.novas.length + ' cadastradas (' + r.comCusto + ' com custo), ' +
      r.puladas + ' já existiam. Todas entram com estoque 0 e sem foto.';
  });
}
