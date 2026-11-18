var KERF_M = 0.002;

var VARA_PADRAO_M = 2.70;

function desencabecoM(perfilCm) {
  var p = Number(perfilCm) / 100;
  if (!p || p <= 0) return 0;
  return Number((Math.SQRT2 * p + KERF_M).toFixed(4));
}

function consumoLadoM(ladoCm, perfilCm) {
  var lado = Number(ladoCm) / 100;
  if (!lado || lado <= 0) return 0;
  var p = Number(perfilCm) / 100;
  if (!p || p <= 0) return Number(lado.toFixed(3));
  return Number((lado + 2 * p + Math.SQRT2 * p + 2 * KERF_M).toFixed(3));
}

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
  var custo = Number(String(d.custo_m == null ? '' : d.custo_m).replace(',', '.'));
  if (!codigo) throw new Error('Informe o código da etiqueta.');
  if (!nome) throw new Error('Informe o nome da moldura.');
  if (!(perfil > 0)) throw new Error('Informe a largura do perfil em cm.');
  if (preco < 0) throw new Error('Preço inválido.');
  if (!isFinite(custo) || custo < 0) throw new Error('Preço de custo inválido.');
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
    custo_m: Number((custo || 0).toFixed(2)),
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

function _ladosDaMoldura(q, perfilDentroCm, fora) {
  var ext = _medidaExterna(q.largura_cm, q.altura_cm, _bordaDoQuadro(q).cm);
  var soma = fora ? 2 * Math.max(0, Number(perfilDentroCm) || 0) : 0;
  var lados = [ext.largura + soma, ext.altura + soma]
    .map(function (x) { return Number(Number(x).toFixed(1)); })
    .filter(function (x) { return x > 0; });
  return lados.filter(function (x, i) { return lados.indexOf(x) === i; }).sort(function (a, b) { return b - a; });
}

function _textoQuebra(x) {
  var n = Math.max(1, Math.round(Number(x && x.quantidade) || 1));
  return n + (n > 1 ? ' lados' : ' lado') + ' de ' + _numeroDaConta(x.lado_cm) + ' cm' + (x.fora ? ' (moldura de fora)' : '');
}

var SOBRA_MINIMA_M = 0.10;

function _lerPedacos(v) {
  var lista;
  if (Array.isArray(v)) lista = v;
  else if (typeof v === 'number') lista = [v];
  else lista = String(v == null ? '' : v).replace(/m/gi, '').split(/[;+]/);
  return lista.map(function (x) {
    return typeof x === 'number' ? x : Number(String(x == null ? '' : x).trim().replace(',', '.'));
  }).filter(function (x) {
    return isFinite(x) && x >= 0.01 && x <= VARA_PADRAO_M + 0.0005;
  }).map(function (x) {
    return Number(Number(x).toFixed(3));
  }).sort(function (a, b) { return b - a; });
}

function _textoPedacos(lista) {
  var ok = _lerPedacos(lista);
  if (!ok.length) return '';
  return ok.map(function (x) { return String(Number(x.toFixed(3))).replace('.', ','); }).join(' + ') + ' m';
}

function _somaPedacos(lista) {
  return Number((lista || []).reduce(function (s, x) { return s + (Number(x) || 0); }, 0).toFixed(3));
}

function _estoqueEmPecas(totalM, pedacos) {
  var total = Math.max(0, Number(totalM) || 0);
  var lista = _lerPedacos(pedacos);
  if (_somaPedacos(lista) > total + 0.0005) lista = [];
  var resto = total - _somaPedacos(lista);
  var varas = Math.max(0, Math.floor((resto + 0.01) / VARA_PADRAO_M));
  var sobra = Number(Math.max(0, resto - varas * VARA_PADRAO_M).toFixed(3));
  if (sobra >= 0.01) lista = _lerPedacos(lista.concat([sobra]));
  return { varas: varas, pedacos: lista };
}

function _totalDasPecas(e) {
  return Number(((Number(e.varas) || 0) * VARA_PADRAO_M + _somaPedacos(e.pedacos)).toFixed(3));
}

function _somarVarasEPedacos(e, metros) {
  var m = Math.max(0, Number(metros) || 0);
  var varas = Math.floor((m + 0.0005) / VARA_PADRAO_M);
  var resto = Number((m - varas * VARA_PADRAO_M).toFixed(3));
  return { varas: e.varas + varas, pedacos: _lerPedacos(e.pedacos.concat(resto >= 0.01 ? [resto] : [])) };
}

function _melhorEncaixe(capacidade, lados) {
  var grupos = [];
  lados.forEach(function (l, i) {
    var g = grupos.filter(function (x) { return Math.abs(x.m - l.m) < 1e-9; })[0];
    if (!g) { g = { m: l.m, idx: [] }; grupos.push(g); }
    g.idx.push(i);
  });
  grupos.sort(function (a, b) { return b.m - a.m; });
  var melhor = { usado: 0, conta: [] };
  var conta = [];
  var passos = 0;
  var limite = capacidade + 0.0005;
  function busca(k, usado) {
    if (++passos > 20000) return;
    if (usado > melhor.usado + 1e-9) melhor = { usado: usado, conta: conta.slice() };
    if (k >= grupos.length) return;
    var g = grupos[k];
    var max = Math.min(g.idx.length, Math.floor((limite - usado) / g.m + 1e-9));
    for (var n = max; n >= 0; n--) {
      conta[k] = n;
      busca(k + 1, usado + n * g.m);
    }
    conta[k] = 0;
  }
  busca(0, 0);
  var escolhidos = [];
  melhor.conta.forEach(function (n, k) {
    for (var i = 0; i < n; i++) escolhidos.push(grupos[k].idx[i]);
  });
  return escolhidos;
}

function _planejarCorte(estoque, lados) {
  var varas = Math.max(0, Number(estoque.varas) || 0);
  var restam = (lados || []).slice();
  var pecas = [];
  var usar = function (peca, indices) {
    var tirar = indices.slice().sort(function (a, b) { return b - a; });
    tirar.forEach(function (i) {
      peca.lados.push(restam[i]);
      peca.m = Math.max(0, peca.m - restam[i].m);
      restam.splice(i, 1);
    });
    peca.lados.sort(function (a, b) { return b.m - a.m; });
  };
  _lerPedacos(estoque.pedacos).slice().reverse().forEach(function (x) {
    var peca = { de: 'pedaco', tamanho_m: x, m: x, lados: [] };
    pecas.push(peca);
    if (restam.length) usar(peca, _melhorEncaixe(x, restam));
  });
  restam.sort(function (a, b) { return b.m - a.m; });
  while (restam.length && restam[0].m > VARA_PADRAO_M + 0.0005) {
    var precisa = Math.ceil(restam[0].m / VARA_PADRAO_M - 1e-9);
    if (varas < precisa) break;
    varas -= precisa;
    var longa = Number((precisa * VARA_PADRAO_M).toFixed(3));
    var emenda = { de: 'vara', varas: precisa, tamanho_m: longa, m: longa, lados: [] };
    pecas.push(emenda);
    usar(emenda, [0]);
  }
  while (restam.length && varas > 0) {
    var cabem = _melhorEncaixe(VARA_PADRAO_M, restam);
    if (!cabem.length) break;
    varas--;
    var vara = { de: 'vara', varas: 1, tamanho_m: VARA_PADRAO_M, m: VARA_PADRAO_M, lados: [] };
    pecas.push(vara);
    usar(vara, cabem);
  }
  var faltam = restam;
  pecas.forEach(function (p) { p.m = Math.floor(p.m * 1000 + 1e-6) / 1000; });
  var usos = pecas.filter(function (p) { return p.lados.length; }).map(function (p) {
    return {
      de: p.de, varas: p.varas || 0, tamanho_m: p.tamanho_m, lados: p.lados,
      sobra_m: p.m >= SOBRA_MINIMA_M ? p.m : 0, perda_m: p.m >= SOBRA_MINIMA_M ? 0 : p.m
    };
  });
  var ficam = pecas.filter(function (p) { return p.lados.length ? p.m >= SOBRA_MINIMA_M : true; })
    .map(function (p) { return p.m; });
  var novo = { varas: varas, pedacos: _lerPedacos(ficam) };
  var antes = _totalDasPecas({ varas: estoque.varas, pedacos: _lerPedacos(estoque.pedacos) });
  var falta = faltam.reduce(function (s, l) { return s + l.m; }, 0);
  return {
    usos: usos, faltam: faltam, novo: novo,
    baixa_m: Number((antes - _totalDasPecas(novo)).toFixed(3)),
    falta_m: Number(falta.toFixed(3)),
    novo_estoque_m: _totalDasPecas(novo)
  };
}

function _consumoLadoExato(ladoCm, perfilCm) {
  var p = Math.max(0, Number(perfilCm) || 0) / 100;
  var lado = Number(ladoCm) / 100;
  return p > 0 ? lado + 2 * p + Math.SQRT2 * p + 2 * KERF_M : lado;
}

function _ladosDoQuadro(q, perfilCm, perfilDentroCm, fora) {
  var ext = _medidaExterna(q.largura_cm, q.altura_cm, _bordaDoQuadro(q).cm);
  var soma = fora ? 2 * Math.max(0, Number(perfilDentroCm) || 0) : 0;
  var l = Number((Number(ext.largura) + soma).toFixed(1));
  var a = Number((Number(ext.altura) + soma).toFixed(1));
  if (!(l > 0) || !(a > 0)) return [];
  var qtd = Math.max(1, Math.round(Number(q.quantidade) || 1));
  var out = [];
  for (var i = 0; i < qtd; i++) {
    [l, l, a, a].forEach(function (cm) { out.push({ cm: cm, m: _consumoLadoExato(cm, perfilCm) }); });
  }
  return out;
}

function _cortesDoPedido(quadros, molduras) {
  var porCodigo = {};
  var ordem = [];
  var perfil = function (c) { return molduras[c] ? Number(molduras[c].perfil_cm) || 0 : 0; };
  (quadros || []).forEach(function (q, i) {
    var usos = [];
    var dentro = String(q.moldura == null ? '' : q.moldura).trim();
    var fora = String(q.moldura_fora == null ? '' : q.moldura_fora).trim();
    if (dentro) usos.push({ codigo: dentro, fora: false });
    if (fora) usos.push({ codigo: fora, fora: true });
    usos.forEach(function (u) {
      if (!molduras[u.codigo]) return;
      if (!porCodigo[u.codigo]) { porCodigo[u.codigo] = []; ordem.push(u.codigo); }
      _ladosDoQuadro(q, perfil(u.codigo), u.fora ? perfil(dentro) : 0, u.fora).forEach(function (l) {
        porCodigo[u.codigo].push({ cm: l.cm, m: l.m, quadro: i + 1, fora: u.fora });
      });
    });
  });
  return ordem.map(function (c) {
    var m = molduras[c];
    var plano = _planejarCorte(_estoqueEmPecas(m.estoque_m, m.pedacos), porCodigo[c]);
    plano.codigo = c;
    return plano;
  });
}

function _resumoDosCortes(planos) {
  return (planos || []).map(function (p) {
    return {
      codigo: p.codigo,
      usos: p.usos.map(function (u) {
        return {
          de: u.de, varas: u.varas || 0, tamanho_m: u.tamanho_m, sobra_m: u.sobra_m,
          lados: u.lados.map(function (l) { return { cm: l.cm, quadro: l.quadro || 0, fora: !!l.fora }; })
        };
      }),
      faltam: p.faltam.map(function (l) { return { cm: l.cm, quadro: l.quadro || 0, fora: !!l.fora }; })
    };
  });
}

function _corteDoLadoAMais(estoque, ladoCm, perfilCm, quantidade) {
  var lados = [];
  for (var i = 0; i < quantidade; i++) lados.push({ cm: Number(ladoCm), m: consumoLadoM(ladoCm, perfilCm) });
  return _planejarCorte(estoque, lados);
}

function _desfazerDoCorte(plano) {
  var usou = [];
  var varas = 0;
  var sobras = [];
  plano.usos.forEach(function (u) {
    if (u.de === 'vara') varas += u.varas || 1;
    else usou.push(u.tamanho_m);
    if (u.sobra_m > 0) sobras.push(u.sobra_m);
  });
  return { usou: usou, varas: varas, sobras: sobras };
}

function _devolverCorte(estoque, quebra) {
  var c = quebra && quebra.corte;
  var lista = estoque.pedacos.slice();
  if (c && Array.isArray(c.sobras)) {
    var achou = c.sobras.every(function (x) {
      for (var i = 0; i < lista.length; i++) {
        if (Math.abs(lista[i] - x) < 0.0015) { lista.splice(i, 1); return true; }
      }
      return false;
    });
    if (achou) {
      return { varas: estoque.varas + (Number(c.varas) || 0), pedacos: _lerPedacos(lista.concat(c.usou || [])) };
    }
  }
  return { varas: estoque.varas, pedacos: _lerPedacos(estoque.pedacos.concat([Number(quebra.metros) || 0])) };
}

export {
  KERF_M,
  VARA_PADRAO_M,
  desencabecoM,
  consumoLadoM,
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
  _recebimento as recebimento,
  _ladosDaMoldura as ladosDaMoldura,
  _textoQuebra as textoQuebra,
  SOBRA_MINIMA_M,
  _lerPedacos as lerPedacos,
  _textoPedacos as textoPedacos,
  _somaPedacos as somaPedacos,
  _estoqueEmPecas as estoqueEmPecas,
  _totalDasPecas as totalDasPecas,
  _somarVarasEPedacos as somarVarasEPedacos,
  _melhorEncaixe as melhorEncaixe,
  _planejarCorte as planejarCorte,
  _consumoLadoExato as consumoLadoExato,
  _ladosDoQuadro as ladosDoQuadro,
  _cortesDoPedido as cortesDoPedido,
  _resumoDosCortes as resumoDosCortes,
  _corteDoLadoAMais as corteDoLadoAMais,
  _desfazerDoCorte as desfazerDoCorte,
  _devolverCorte as devolverCorte
};
