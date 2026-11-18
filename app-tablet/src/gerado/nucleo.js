var KERF_M = 0.002;

var VARA_PADRAO_M = 2.70;

function perimetroM(larguraCm, alturaCm) {
  return Number((2 * (Number(larguraCm) + Number(alturaCm)) / 100).toFixed(4));
}

function areaM2(larguraCm, alturaCm) {
  return Number(((Number(larguraCm) / 100) * (Number(alturaCm) / 100)).toFixed(4));
}

function consumoMolduraM(larguraCm, alturaCm, perfilCm) {
  var perim = perimetroM(larguraCm, alturaCm);
  var p = Number(perfilCm) / 100;
  if (!p || p <= 0) return perim;
  var cantos = 8 * p;
  var triangulos = 4 * Math.SQRT2 * p;
  var serra = 8 * KERF_M;
  return Number((perim + cantos + triangulos + serra).toFixed(3));
}

var TAXA_PINTURA_CHAPA = 30;

var SILICONE_POR_METRO = 12.5;

var PRECO_CHASSI_M = 18.9;

function _arredondarPraCima(valor) {
  var centavos = Math.round(Number(valor) * 100);
  return Math.ceil(centavos / 10) / 10;
}

function travasDoChassi(larguraCm, alturaCm) {
  var l = Number(larguraCm) || 0;
  var a = Number(alturaCm) || 0;
  var maior = Math.max(l, a);
  return {
    quantidade: maior >= 150 ? 2 : maior >= 100 ? 1 : 0,
    comprimento_m: Number((Math.min(l, a) / 100).toFixed(4))
  };
}

function _numeroDaConta(n) {
  return String(Number(Number(n).toFixed(2))).replace('.', ',');
}

function _metrosDaConta(m) {
  return Number(m).toFixed(2).replace('.', ',') + ' m';
}

function _linhaDoChassi(larguraCm, alturaCm, precoM) {
  var perim = perimetroM(larguraCm, alturaCm);
  var travas = travasDoChassi(larguraCm, alturaCm);
  var metros = Number((perim + travas.quantidade * travas.comprimento_m).toFixed(4));
  var conta = 'perímetro ' + _metrosDaConta(perim);
  if (travas.quantidade) {
    conta += ' + ' + travas.quantidade + (travas.quantidade > 1 ? ' travas' : ' trava') + ' de ' +
      _metrosDaConta(travas.comprimento_m) + ' = ' + _metrosDaConta(metros);
  }
  return {
    categoria: 'chassi', item: 'Chassi',
    quantidade: Number(metros.toFixed(3)), unidade: 'm',
    calculo: conta + ' x R$ ' + Number(precoM).toFixed(2).replace('.', ',') + '/m',
    valor: _arredondarPraCima(metros * Number(precoM)),
    consumo: Number(metros.toFixed(3)),
    travas: travas.quantidade,
    trava_m: Number(travas.comprimento_m.toFixed(3))
  };
}

function calcularOrcamento(larguraCm, alturaCm, itens, opcoes) {
  opcoes = opcoes || {};
  var perim = perimetroM(larguraCm, alturaCm);
  var area = areaM2(larguraCm, alturaCm);
  var linhas = [];
  var total = 0;

  if (Number(opcoes.chassiPrecoM) > 0 && perim > 0) {
    var chassi = _linhaDoChassi(larguraCm, alturaCm, opcoes.chassiPrecoM);
    linhas.push(chassi);
    total += chassi.valor;
  }

  for (var i = 0; i < itens.length; i++) {
    var it = itens[i];
    if (opcoes.vidroDuplo && it.categoria === 'chapa') continue;
    var dobra = (opcoes.vidroDuplo && it.categoria === 'vidro') ? 2 : 1;
    var bruto, calculoTxt, quantidade, unidade, consumo;

    var fora = it.categoria === 'moldura' && !!it.porFora;
    if (it.categoria === 'moldura') {
      var somaCm = fora ? 2 * (Number(it.foraCm) || 0) : 0;
      var lm = Number(larguraCm) + somaCm;
      var am = Number(alturaCm) + somaCm;
      var perimMoldura = perimetroM(lm, am);
      quantidade = perimMoldura;
      unidade = 'm';
      bruto = perimMoldura * Number(it.preco);
      calculoTxt = (fora ? 'por fora, ' + _numeroDaConta(lm) + ' x ' + _numeroDaConta(am) + ' cm, ' : '') +
        'perímetro ' + perimMoldura.toFixed(2) + 'm x R$ ' + it.preco + '/m';
      consumo = consumoMolduraM(lm, am, it.perfilCm);
    } else {
      quantidade = area * dobra;
      unidade = 'm²';
      bruto = area * Number(it.preco) * dobra;
      calculoTxt = (dobra === 2 ? '2x ' : '') + 'área ' + area.toFixed(3) + 'm² x R$ ' + it.preco + '/m²';
      consumo = area * dobra;
    }

    var valor = _arredondarPraCima(bruto);
    var linha = {
      categoria: it.categoria,
      item: it.nome,
      quantidade: Number(quantidade.toFixed(3)),
      unidade: unidade,
      calculo: calculoTxt,
      valor: Number(valor.toFixed(2)),
      consumo: Number(consumo.toFixed(3))
    };
    if (fora) linha.por_fora = true;
    linhas.push(linha);
    total += valor;
  }

  if (opcoes.paspatur && Number(opcoes.paspaturPrecoM2) > 0) {
    var pasValor = _arredondarPraCima(area * Number(opcoes.paspaturPrecoM2));
    linhas.push({
      categoria: 'paspatur', item: 'Paspatur',
      quantidade: Number(area.toFixed(3)), unidade: 'm²',
      calculo: 'área ' + area.toFixed(3) + 'm² x R$ ' + opcoes.paspaturPrecoM2 + '/m²',
      valor: Number(pasValor.toFixed(2)), consumo: Number(area.toFixed(3))
    });
    total += pasValor;
  }

  if (opcoes.vidroDuplo && perim > 0) {
    var silValor = _arredondarPraCima(perim * SILICONE_POR_METRO);
    linhas.push({
      categoria: 'silicone', item: 'Silicone',
      quantidade: Number(perim.toFixed(3)), unidade: 'm',
      calculo: 'perímetro ' + perim.toFixed(2) + 'm x R$ ' + SILICONE_POR_METRO + '/m',
      valor: silValor, consumo: Number(perim.toFixed(3))
    });
    total += silValor;
  }

  var pinturaChapa = opcoes.objetoAlto ? TAXA_PINTURA_CHAPA : 0;
  total += pinturaChapa;

  var resultado = {
    largura_cm: Number(larguraCm),
    altura_cm: Number(alturaCm),
    perimetro_m: Number(perim.toFixed(2)),
    area_m2: Number(area.toFixed(3)),
    itens: linhas,
    valor_total: Number(total.toFixed(2))
  };
  if (pinturaChapa) resultado.pintura_chapa = pinturaChapa;
  return resultado;
}

function _ehDisponivel(valor) {
  return valor === true || String(valor).toUpperCase() === 'TRUE';
}

var LADOS_CORREDOR = { E: 'esquerda', D: 'direita', F: 'fundo' };

function _casinhasDoDeposito() {
  var out = [];
  for (var c = 1; c <= 5; c++) {
    ['E', 'D', 'F'].forEach(function (lado) {
      for (var n = 1; n <= 5; n++) out.push('CR' + c + '-' + lado + n);
    });
  }
  ['PR1', 'PR2'].forEach(function (parede) {
    for (var n = 1; n <= 6; n++) out.push(parede + '-' + n);
  });
  return out;
}

function _normalizarCasinha(codigo) {
  return String(codigo == null ? '' : codigo).trim().toUpperCase();
}

function _casinhaValida(codigo) {
  return /^(CR[1-5]-[EDF][1-5]|PR[12]-[1-6])$/.test(_normalizarCasinha(codigo));
}

function _nomeCasinha(codigo) {
  var s = _normalizarCasinha(codigo);
  var c = s.match(/^CR([1-5])-([EDF])([1-5])$/);
  if (c) return 'Corredor ' + c[1] + ', ' + LADOS_CORREDOR[c[2]] + ', casinha ' + c[3];
  var p = s.match(/^PR([12])-([1-6])$/);
  if (p) return 'Parede ' + p[1] + ', casinha ' + p[2];
  return '';
}

function _corEstoque(metros) {
  var m = Number(metros) || 0;
  if (m >= 3 * VARA_PADRAO_M - 0.0005) return 'verde';
  if (m >= VARA_PADRAO_M - 0.0005) return 'amarelo';
  return 'vermelho';
}

function _metros(valor, permiteZero) {
  var txt = String(valor == null ? '' : valor).trim();
  var n = Number(txt.replace(',', '.'));
  if (txt === '' || !isFinite(n) || n < 0 || (!permiteZero && n === 0)) {
    throw new Error('Metros inválidos: ' + valor);
  }
  return Number(n.toFixed(3));
}

function _abaterFaltas(metrosChegaram, faltas) {
  var disp = Math.max(0, Number(metrosChegaram) || 0);
  var lista = faltas || [];
  var atendidas = [];
  var abatido = 0;
  for (var i = 0; i < lista.length; i++) {
    var f = Number(lista[i].metros) || 0;
    if (f > disp + 0.0005) break;
    disp -= f;
    abatido += f;
    atendidas.push(lista[i].id);
  }
  return {
    atendidas: atendidas,
    abatido: Number(abatido.toFixed(3)),
    vai_pro_estoque: Number(Math.max(0, disp).toFixed(3))
  };
}

function _validarNovaMoldura(d) {
  var codigo = String(d.codigo == null ? '' : d.codigo).trim();
  var nome = String(d.nome == null ? '' : d.nome).trim();
  var perfil = Number(String(d.perfil_cm == null ? '' : d.perfil_cm).replace(',', '.'));
  var preco = Number(String(d.preco_m == null ? '' : d.preco_m).replace(',', '.')) || 0;
  if (!codigo) throw new Error('Informe o código da etiqueta.');
  if (!nome) throw new Error('Informe o nome da moldura.');
  if (!(perfil > 0)) throw new Error('Informe a largura do perfil em cm.');
  if (preco < 0) throw new Error('Preço inválido.');
  var casinha = _normalizarCasinha(d.casinha);
  if (casinha && !_casinhaValida(casinha)) throw new Error('Casinha inválida: ' + d.casinha);
  return {
    codigo: codigo,
    nome: nome,
    marca: String(d.marca || '').trim(),
    estilo: String(d.estilo || '').trim(),
    cor: String(d.cor || '').trim(),
    perfil_cm: perfil,
    preco_m: Number(preco.toFixed(2)),
    metros: _metros(d.metros == null || d.metros === '' ? 0 : d.metros, true),
    casinha: casinha,
    disponivel: preco > 0
  };
}

function _medidaExterna(larguraCm, alturaCm, bordaCm) {
  var b = Math.max(0, Number(bordaCm) || 0);
  return { largura: Number(larguraCm) + 2 * b, altura: Number(alturaCm) + 2 * b };
}

function _servicosDoQuadro(lista) {
  return (Array.isArray(lista) ? lista : []).map(function (s) {
    var valor = Number(s && s.valor);
    return {
      descricao: String((s && s.descricao) || '').trim(),
      valor: valor > 0 ? Number(valor.toFixed(2)) : 0
    };
  }).filter(function (s) { return s.descricao || s.valor > 0; });
}

function _totaisOrcamentoApp(orc, quantidade, servicos) {
  var q = Math.max(1, Math.round(Number(quantidade) || 1));
  var molduras = (orc.itens || []).filter(function (it) { return it.categoria === 'moldura'; });
  var moldura = molduras.filter(function (it) { return !it.por_fora; })[0];
  var fora = molduras.filter(function (it) { return it.por_fora; })[0];
  var lista = _servicosDoQuadro(servicos);
  var somaServicos = lista.reduce(function (s, x) { return s + x.valor; }, 0);
  return {
    quantidade: q,
    valor_unitario: orc.valor_total,
    valor_total: Number((orc.valor_total * q + somaServicos).toFixed(2)),
    consumo_moldura_m: moldura ? Number((moldura.consumo * q).toFixed(3)) : 0,
    consumo_fora_m: fora ? Number((fora.consumo * q).toFixed(3)) : 0,
    itens: orc.itens,
    pintura_chapa: Number(orc.pintura_chapa) || 0,
    servicos: lista
  };
}

function _ehObjeto(q) {
  var t = String((q && q.tipo) || '');
  return t === 'objeto' || t === 'camiseta';
}

function _ehTela(q) {
  return String((q && q.tipo) || '') === 'tela';
}

function _planejarBaixaMoldura(estoqueM, consumoM) {
  var est = Math.max(0, Number(estoqueM) || 0);
  var cons = Math.max(0, Number(consumoM) || 0);
  var baixa = Math.min(est, cons);
  return {
    baixa: Number(baixa.toFixed(3)),
    falta: Number((cons - baixa).toFixed(3)),
    novo_estoque: Number((est - baixa).toFixed(3))
  };
}

function _quadrosDoPedido(d) {
  var lista = d && Array.isArray(d.quadros) ? d.quadros : [];
  if (lista.length) return lista;
  return d ? [d] : [];
}

function _bordaDoQuadro(q) {
  if (_ehTela(q)) return { cm: 0, paspatur: false };
  if (_ehObjeto(q) || _ehDisponivel(q.vidro_duplo)) return { cm: Math.max(0, Number(q.margem_cm) || 0), paspatur: false };
  var p = Math.max(0, Number(q.paspatur_cm) || 0);
  return { cm: p, paspatur: p > 0 };
}

function _usosDeMoldura(quadros, calcs) {
  var usos = [];
  (quadros || []).forEach(function (q, i) {
    var c = calcs[i];
    if (!c) return;
    usos.push({ moldura: q.moldura, consumo: c.consumo_moldura_m });
    if (q.moldura_fora) usos.push({ moldura: q.moldura_fora, consumo: c.consumo_fora_m });
  });
  return usos;
}

function _consumoPorMoldura(itens) {
  var ordem = [];
  var soma = {};
  (itens || []).forEach(function (it) {
    var c = String(it.moldura == null ? '' : it.moldura).trim();
    if (!c) return;
    if (!Object.prototype.hasOwnProperty.call(soma, c)) { soma[c] = 0; ordem.push(c); }
    soma[c] += Number(it.consumo) || 0;
  });
  return ordem.map(function (c) { return { codigo: c, metros: Number(soma[c].toFixed(3)) }; });
}

function _numeroCurto(n) {
  return String(Number(n) || 0).replace('.', ',');
}

function _resumoQuadros(quadros) {
  return (quadros || []).map(function (q) {
    var tipo = String(q.tipo || 'quadro');
    var qtd = Math.max(1, Math.round(Number(q.quantidade) || 1));
    var medida = Number(q.largura_cm) > 0 && Number(q.altura_cm) > 0
      ? _numeroCurto(q.largura_cm) + ' x ' + _numeroCurto(q.altura_cm) : '';
    var txt = medida;
    if (tipo === 'camiseta') txt = 'camiseta ' + (q.tamanho ? q.tamanho : medida);
    if (tipo === 'objeto') txt = 'objeto' + (medida ? ' ' + medida : '');
    if (tipo === 'reforma') txt = 'reforma' + (medida ? ' ' + medida : '');
    if (tipo === 'tela') txt = (_ehDisponivel(q.sem_chassi) ? 'tela sem chassi' : 'tela') + (medida ? ' ' + medida : '');
    var nomes = _servicosDoQuadro(q.servicos).map(function (s) { return s.descricao; }).filter(function (d) { return d; });
    if (nomes.length) txt += ' (' + nomes.join(', ') + ')';
    return (qtd > 1 ? qtd + 'x ' : '') + txt;
  }).join('; ');
}

var TAXAS_MAQUININHA = {
  'Débito': 0.98, 'Crédito 1x': 2.83, 'Crédito 2x': 4.05, 'Crédito 3x': 4.89, 'Crédito 4x': 5.75, 'Crédito 5x': 6.61,
  'Crédito 6x': 7.49, 'Crédito 7x': 9.23, 'Crédito 8x': 10.11, 'Crédito 9x': 11.01, 'Crédito 10x': 11.91,
  'Crédito 11x': 12.83, 'Crédito 12x': 13.75
};

function _recebimento(valor, forma) {
  var bruto = Number((Number(valor) || 0).toFixed(2));
  var pct = TAXAS_MAQUININHA[String(forma == null ? '' : forma).trim()] || 0;
  var taxa = Math.round(Math.round(bruto * 100) * Math.round(pct * 100) / 10000) / 100;
  return { bruto: bruto, pct: pct, taxa: taxa, liquido: Number((bruto - taxa).toFixed(2)) };
}

export {
  KERF_M,
  VARA_PADRAO_M,
  perimetroM,
  areaM2,
  consumoMolduraM,
  TAXA_PINTURA_CHAPA,
  SILICONE_POR_METRO,
  PRECO_CHASSI_M,
  _arredondarPraCima as arredondarPraCima,
  travasDoChassi,
  _numeroDaConta as numeroDaConta,
  _metrosDaConta as metrosDaConta,
  _linhaDoChassi as linhaDoChassi,
  calcularOrcamento,
  _ehDisponivel as ehDisponivel,
  LADOS_CORREDOR,
  _casinhasDoDeposito as casinhasDoDeposito,
  _normalizarCasinha as normalizarCasinha,
  _casinhaValida as casinhaValida,
  _nomeCasinha as nomeCasinha,
  _corEstoque as corEstoque,
  _metros as metros,
  _abaterFaltas as abaterFaltas,
  _validarNovaMoldura as validarNovaMoldura,
  _medidaExterna as medidaExterna,
  _servicosDoQuadro as servicosDoQuadro,
  _totaisOrcamentoApp as totaisOrcamentoApp,
  _ehObjeto as ehObjeto,
  _ehTela as ehTela,
  _planejarBaixaMoldura as planejarBaixaMoldura,
  _quadrosDoPedido as quadrosDoPedido,
  _bordaDoQuadro as bordaDoQuadro,
  _usosDeMoldura as usosDeMoldura,
  _consumoPorMoldura as consumoPorMoldura,
  _numeroCurto as numeroCurto,
  _resumoQuadros as resumoQuadros,
  TAXAS_MAQUININHA,
  _recebimento as recebimento
};
