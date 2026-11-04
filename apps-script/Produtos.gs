// Produtos.gs — cadastro de produtos (escrita). _proximoCodigo é puro (testável em Node).

var _PREFIXO_CAT = { moldura: 'MOL', vidro: 'VID', chapa: 'CHA', espelho: 'ESP', avulso: 'AVU' };

// Próximo código sequencial da categoria: pega o MAIOR número existente com o prefixo e soma 1.
function _proximoCodigo(prefixo, codigosExistentes) {
  var max = 0;
  (codigosExistentes || []).forEach(function (c) {
    var m = String(c).match(new RegExp('^' + prefixo + '-(\\d+)$'));
    if (m) { var n = Number(m[1]); if (n > max) max = n; }
  });
  return prefixo + '-' + String(max + 1).padStart(3, '0');
}
