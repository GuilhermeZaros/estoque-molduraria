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

function _proximoIdSeq(prefixo, ids, digitos) {
  var maior = 0;
  (ids || []).forEach(function (id) {
    var m = String(id == null ? '' : id).match(/(\d+)\s*$/);
    if (m) { var n = parseInt(m[1], 10); if (n > maior) maior = n; }
  });
  return prefixo + '-' + String(maior + 1).padStart(digitos || 4, '0');
}

function _metros(valor, permiteZero) {
  var txt = String(valor == null ? '' : valor).trim();
  var n = Number(txt.replace(',', '.'));
  if (txt === '' || !isFinite(n) || n < 0 || (!permiteZero && n === 0)) {
    throw new Error('Metros inválidos: ' + valor);
  }
  return Number(n.toFixed(3));
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
  var moldura = (orc.itens || []).filter(function (it) { return it.categoria === 'moldura'; })[0];
  var lista = _servicosDoQuadro(servicos);
  var somaServicos = lista.reduce(function (s, x) { return s + x.valor; }, 0);
  return {
    quantidade: q,
    valor_unitario: orc.valor_total,
    valor_total: Number((orc.valor_total * q + somaServicos).toFixed(2)),
    consumo_moldura_m: moldura ? Number((moldura.consumo * q).toFixed(3)) : 0,
    itens: orc.itens,
    pintura_chapa: Number(orc.pintura_chapa) || 0,
    servicos: lista
  };
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

function _ehObjeto(q) {
  var t = String((q && q.tipo) || '');
  return t === 'objeto' || t === 'camiseta';
}

function _bordaDoQuadro(q) {
  if (_ehObjeto(q) || _ehDisponivel(q.vidro_duplo)) return { cm: Math.max(0, Number(q.margem_cm) || 0), paspatur: false };
  var p = Math.max(0, Number(q.paspatur_cm) || 0);
  return { cm: p, paspatur: p > 0 };
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
    var nomes = _servicosDoQuadro(q.servicos).map(function (s) { return s.descricao; }).filter(function (d) { return d; });
    if (nomes.length) txt += ' (' + nomes.join(', ') + ')';
    return (qtd > 1 ? qtd + 'x ' : '') + txt;
  }).join('; ');
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

var ACOES_APP = ['salvarOrcamento', 'fecharVenda', 'descartarOrcamento', 'entradaMoldura', 'ajustarMoldura',
                 'contarCasinha', 'moverMoldura', 'cadastrarMoldura', 'zerarNaoEncontradas',
                 'criarOrdem', 'editarOrdem', 'marcarAcabamento', 'marcarPronto', 'marcarEntregue',
                 'fotoOrdem', 'tirarFotoOrdem', 'lancarGasto', 'lancarVenda', 'ajustarSaldos'];

function _molduraParaApp(x) {
  return {
    codigo: String(x.Codigo),
    nome: String(x.Nome || ''),
    marca: String(x.Marca || ''),
    estilo: String(x.Estilo || ''),
    cor: String(x.Cor || ''),
    perfil_cm: Number(x.Largura_perfil_cm) || 0,
    preco_m: Number(x.Valor_por_metro) || 0,
    estoque_m: Number(x.Estoque_atual_m) || 0,
    foto_url: String(x.Foto_URL || ''),
    local: _normalizarCasinha(x.Local),
    disponivel: _ehDisponivel(x.Disponivel)
  };
}

function _quadroParaApp(x) {
  return {
    tipo: String(x.Tipo || 'quadro'),
    tamanho: String(x.Tamanho || ''),
    largura_cm: Number(x.Largura_cm) || 0,
    altura_cm: Number(x.Altura_cm) || 0,
    margem_cm: Number(x.Margem_cm) || 0,
    quantidade: Number(x.Quantidade) || 1,
    paspatur_cm: Number(x.Paspatur_cm) || 0,
    moldura: String(x.Moldura || ''),
    vidro: String(x.Vidro || ''),
    chapa: String(x.Chapa || ''),
    espelho: String(x.Espelho || ''),
    vidro_duplo: _ehDisponivel(x.Vidro_duplo),
    objeto_alto: _ehDisponivel(x.Objeto_alto),
    valor_calculado: Number(x.Valor_calculado) || 0,
    consumo_m: Number(x.Consumo_m) || 0,
    servicos: _lerServicos(x.Servicos)
  };
}

function _lerServicos(texto) {
  if (!texto) return [];
  try {
    return _servicosDoQuadro(JSON.parse(String(texto)));
  } catch (e) {
    return [];
  }
}

function _quadrosPorRef(linhas) {
  var por = {};
  (linhas || []).forEach(function (l) {
    var ref = String(l.Ref_app || '');
    if (!ref) return;
    if (!por[ref]) por[ref] = [];
    por[ref].push(l);
  });
  Object.keys(por).forEach(function (ref) {
    por[ref].sort(function (a, b) { return Number(a.N) - Number(b.N); });
  });
  return por;
}

function _orcamentoParaApp(o, linhasQuadros) {
  var quadros = linhasQuadros && linhasQuadros.length
    ? linhasQuadros.map(function (x) { return _quadroParaApp(x); })
    : [_quadroParaApp({
      Tipo: 'quadro', Largura_cm: o.Largura_cm, Altura_cm: o.Altura_cm, Quantidade: o.Quantidade,
      Paspatur_cm: o.Paspatur_cm, Moldura: o.Moldura, Vidro: o.Vidro, Chapa: o.Chapa, Espelho: o.Espelho,
      Vidro_duplo: o.Vidro_duplo, Objeto_alto: o.Objeto_alto, Valor_calculado: o.Valor_calculado, Consumo_m: o.Consumo_m
    })];
  return {
    quadros: quadros,
    resumo: String(o.Quadros || '') || _resumoQuadros(quadros),
    id: String(o.ID),
    ref_app: String(o.Ref_app || ''),
    data_criacao: _dataHoraOS(o.Data_criacao),
    atendente: String(o.Atendente || ''),
    cliente: String(o.Cliente || ''),
    telefone: String(o.Telefone || ''),
    largura_cm: Number(o.Largura_cm) || 0,
    altura_cm: Number(o.Altura_cm) || 0,
    quantidade: Number(o.Quantidade) || 1,
    paspatur_cm: Number(o.Paspatur_cm) || 0,
    moldura: String(o.Moldura || ''),
    vidro: String(o.Vidro || ''),
    chapa: String(o.Chapa || ''),
    espelho: String(o.Espelho || ''),
    vidro_duplo: _ehDisponivel(o.Vidro_duplo),
    objeto_alto: _ehDisponivel(o.Objeto_alto),
    valor_calculado: Number(o.Valor_calculado) || 0,
    valor_final: Number(o.Valor_final) || 0,
    consumo_m: Number(o.Consumo_m) || 0,
    status: String(o.Status || ''),
    obs: String(o.Obs || '')
  };
}

function _compraParaApp(c) {
  return {
    id: String(c.ID),
    data: _dataHoraOS(c.Data),
    moldura: String(c.Moldura || ''),
    nome: String(c.Nome || ''),
    marca: String(c.Marca || ''),
    metros_faltando: Number(c.Metros_faltando) || 0,
    orcamento_id: String(c.Orcamento_id || ''),
    cliente: String(c.Cliente || '')
  };
}

function _faltasPendentesDe(compras, codigo) {
  return (compras || []).filter(function (c) {
    return String(c.Moldura) === String(codigo) && String(c.Status) === 'pendente';
  }).map(function (c) {
    return { id: String(c.ID), metros: Number(c.Metros_faltando) || 0, linha: c._linha };
  });
}

function _atendentesAtivos(usuarios) {
  return (usuarios || []).filter(function (u) {
    return String(u.nome || '').trim() && _usuarioAtivo(u.ativo);
  }).map(function (u) { return String(u.nome).trim(); });
}

function _validarCorpoApp(corpo) {
  if (!corpo || typeof corpo !== 'object') throw new Error('Pedido vazio.');
  var idOp = String(corpo.id_op == null ? '' : corpo.id_op).trim();
  if (idOp.length < 8) throw new Error('Pedido sem id_op.');
  if (ACOES_APP.indexOf(corpo.acao) < 0) throw new Error('Ação desconhecida: ' + corpo.acao);
  return { id_op: idOp, acao: corpo.acao, dados: corpo.dados || {} };
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
