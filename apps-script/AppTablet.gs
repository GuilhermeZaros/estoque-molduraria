function garantirAbasApp() {
  Object.keys(CABECALHOS_APP).forEach(function (nome) { garantirColunas(nome, CABECALHOS_APP[nome]); });
  var casinhas = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS_APP.CASINHAS);
  if (casinhas.getLastRow() < 2) {
    var linhas = _casinhasDoDeposito().map(function (c) { return [c, '', '']; });
    casinhas.getRange(2, 1, linhas.length, 3).setValues(linhas);
  }
  return 'Abas do app prontas (Casinhas, Orcamentos, Orcamento_quadros, Compras, AppOperacoes).';
}

function prepararAppTablet() {
  var abas = garantirAbasApp();
  var mig = migrarColunas();
  DriveApp.getFolderById(FOTO_PASTA_ID).getName();
  var token = _garantirTokenApp();
  var msg = 'App do tablet pronto.\n\n' + abas + '\n' + mig +
            '\n\nSenha do app (APP_TOKEN):\n' + token;
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

function _garantirTokenApp() {
  var props = PropertiesService.getScriptProperties();
  var t = props.getProperty('APP_TOKEN');
  if (!t) { t = Utilities.getUuid(); props.setProperty('APP_TOKEN', t); }
  return t;
}

function _tokenAppOk(t) {
  var esperado = PropertiesService.getScriptProperties().getProperty('APP_TOKEN');
  return !!esperado && String(t == null ? '' : t) === esperado;
}

function _lerAbaApp(nome) {
  return abaExiste(nome) ? lerAba(nome) : [];
}

function _garantirAbaLoja() {
  if (abaExiste(ABAS_APP.LOJA)) return;
  comLock(function () {
    if (abaExiste(ABAS_APP.LOJA)) return;
    garantirColunas(ABAS_APP.LOJA, CABECALHOS_APP.Loja);
    [['Nome', NOME_PADRAO_LOJA], ['Telefone', ''], ['Endereço', '']].forEach(function (c) {
      anexarLinha(ABAS_APP.LOJA, { Campo: c[0], Valor: c[1] });
    });
  });
}

function appSync() {
  _garantirAbaLoja();
  var a = lerAbas([ABAS.MOLDURAS, ABAS.VIDROS, ABAS.CHAPAS, ABAS.ESPELHOS, ABAS.AVULSOS, ABAS_APP.QUADROS,
    ABAS_APP.CASINHAS, ABAS_APP.ORCAMENTOS, ABAS_APP.COMPRAS, ABAS_FIN.USUARIOS, ABAS_FIN.OFICINA, ABAS_APP.LOJA]);
  var quadros = _quadrosPorRef(a[ABAS_APP.QUADROS]);
  return {
    gerado_em: new Date().toISOString(),
    molduras: a[ABAS.MOLDURAS].map(function (x) { return _molduraParaApp(x); }),
    materiais: _produtosDe(a).filter(function (p) { return p.categoria !== 'moldura'; }),
    paspatur_m2: _precoPaspaturDe(a[ABAS.AVULSOS]),
    taxa_pintura_chapa: TAXA_PINTURA_CHAPA,
    casinhas_contadas: a[ABAS_APP.CASINHAS]
      .filter(function (c) { return c.Contada_em; })
      .map(function (c) { return _normalizarCasinha(c.Codigo); }),
    orcamentos_abertos: a[ABAS_APP.ORCAMENTOS]
      .filter(function (o) { return String(o.Status) === 'aberto'; })
      .map(function (o) { return _orcamentoParaApp(o, quadros[String(o.Ref_app)]); }),
    compras_pendentes: a[ABAS_APP.COMPRAS]
      .filter(function (c) { return String(c.Status) === 'pendente'; })
      .map(function (c) { return _compraParaApp(c); }),
    atendentes: _atendentesAtivos(a[ABAS_FIN.USUARIOS]),
    loja: _lojaDe(a[ABAS_APP.LOJA]),
    oficina: a[ABAS_FIN.OFICINA]
      .filter(function (o) { return o.ID && ['em_producao', 'acabamento', 'pronto'].indexOf(String(o.Status)) >= 0; })
      .reverse()
      .map(function (o) { return _ordemParaApp(o, quadros); })
  };
}

function _mesDaOrdem(v) {
  if (v && typeof v.getMonth === 'function') return v.getFullYear() + '-' + (v.getMonth() < 9 ? '0' : '') + (v.getMonth() + 1);
  var m = String(v == null ? '' : v).match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + '-' + m[2] : '';
}

function appFinanceiro(p) {
  _conferirPinFinanceiro(p.pin);
  return {
    saldos: _saldosAtuais(),
    resumo: _resumirFinanceiro(_abaFinOuVazia(ABAS_FIN.ENTRADAS), _abaFinOuVazia(ABAS_FIN.SAIDAS), {
      ano: ANO_HISTORICO, mes: String(p.mes || ''), categoria: String(p.categoria || ''), tipo: String(p.tipo || '')
    }),
    config: { categorias: CATEGORIAS_SAIDA, formas: FORMAS_PAGAMENTO },
    relatorio: _resumirRelatorios(_lerAbaApp(ABAS.HISTORICO), _lerProdutosComCusto(), String(p.periodo || 'mes'), new Date())
  };
}

function appOficinaHistorico(mes) {
  var alvo = String(mes || '');
  var quadros = _quadrosPorRef(_lerAbaApp(ABAS_APP.QUADROS));
  var ordens = _lerAbaApp(ABAS_FIN.OFICINA)
    .filter(function (o) { return o.ID && _mesDaOrdem(o.Data_criacao) === alvo; })
    .reverse()
    .map(function (o) { return _ordemParaApp(o, quadros); });
  var total = 0;
  var entregues = 0;
  ordens.forEach(function (o) { total += o.valor; if (o.status === 'entregue') entregues += 1; });
  return { mes: alvo, ordens: ordens, resumo: { quantidade: ordens.length, total: Number(total.toFixed(2)), entregues: entregues } };
}

function appExecutar(corpo) {
  var pedido = _validarCorpoApp(corpo);
  return comLock(function () {
    var feita = _operacaoFeita(pedido.id_op);
    if (feita) return { repetida: true, resultado: JSON.parse(String(feita.Resultado || '{}')) };
    var resultado = _executarAcaoApp(pedido.acao, pedido.dados);
    anexarLinha(ABAS_APP.OPERACOES, {
      Id_op: pedido.id_op, Data: new Date(), Acao: pedido.acao, Resultado: JSON.stringify(resultado)
    });
    return { repetida: false, resultado: resultado };
  });
}

function _operacaoFeita(idOp) {
  var ops = lerAba(ABAS_APP.OPERACOES);
  for (var i = ops.length - 1; i >= 0; i--) {
    if (String(ops[i].Id_op) === idOp) return ops[i];
  }
  return null;
}

function _executarAcaoApp(acao, d) {
  switch (acao) {
    case 'salvarOrcamento': return _appSalvarOrcamento(d);
    case 'fecharVenda': return _appFecharVenda(d);
    case 'descartarOrcamento': return _appDescartarOrcamento(d);
    case 'entradaMoldura': return _appEntradaMoldura(d);
    case 'ajustarMoldura': return _appAjustarMoldura(d);
    case 'contarCasinha': return _appContarCasinha(d);
    case 'moverMoldura': return _appMoverMoldura(d);
    case 'cadastrarMoldura': return _appCadastrarMoldura(d);
    case 'zerarNaoEncontradas': return _appZerarNaoEncontradas(d);
    case 'criarOrdem': return _criarOrdemNucleo(d, 'app');
    case 'editarOrdem': return _editarOrdemNucleo(_acharOrdemApp(d), d);
    case 'marcarAcabamento': return _marcarAcabamentoNucleo(_acharOrdemApp(d));
    case 'marcarPronto': return _marcarProntoNucleo(_acharOrdemApp(d), 'app');
    case 'marcarEntregue': return _marcarEntregueNucleo(_acharOrdemApp(d));
    case 'fotoOrdem': return _appFotoOrdem(d);
    case 'tirarFotoOrdem': return _appTirarFotoOrdem(d);
    case 'lancarGasto': return _gravarGasto(d, 'tablet');
    case 'lancarVenda': return _gravarVenda(d, 'tablet');
    case 'ajustarSaldos': return _gravarSaldos(d);
  }
  throw new Error('Ação desconhecida: ' + acao);
}

function _molduraOuErro(codigo) {
  var p = buscarProduto(String(codigo == null ? '' : codigo).trim());
  if (!p || p.categoria !== 'moldura') throw new Error('Moldura não encontrada: ' + codigo);
  return p;
}

function _temMaterial(q) {
  return ['moldura', 'vidro', 'chapa', 'espelho'].some(function (c) {
    return String(q[c] == null ? '' : q[c]).trim() !== '';
  });
}

function _calcularOrcamentoApp(q) {
  var borda = _bordaDoQuadro(q);
  var servicos = _servicosDoQuadro(q.servicos);
  if (_tipoDoQuadro(q) === 'reforma' && !_temMaterial(q) && !borda.paspatur) {
    var semMaterial = calcularOrcamento(0, 0, [], { objetoAlto: _ehDisponivel(q.objeto_alto) });
    return _totaisOrcamentoApp(semMaterial, q.quantidade, servicos);
  }
  var ext = _medidaExterna(q.largura_cm, q.altura_cm, borda.cm);
  var orc = orcamentoPorCodigos({
    moldura: q.moldura, vidro: q.vidro, chapa: q.chapa, espelho: q.espelho,
    largura: ext.largura, altura: ext.altura,
    objetoAlto: _ehDisponivel(q.objeto_alto),
    vidroDuplo: _ehDisponivel(q.vidro_duplo),
    paspatur: borda.paspatur
  });
  return _totaisOrcamentoApp(orc, q.quantidade, servicos);
}

function _calcularPedidoApp(d) {
  var quadros = _quadrosDoPedido(d);
  var calcs = quadros.map(function (q, i) {
    try {
      return _calcularOrcamentoApp(q);
    } catch (e) {
      throw quadros.length > 1 ? new Error('Quadro ' + (i + 1) + ': ' + e.message) : e;
    }
  });
  var total = 0;
  var consumo = 0;
  var quantidade = 0;
  calcs.forEach(function (c) {
    total += c.valor_total;
    consumo += c.consumo_moldura_m;
    quantidade += c.quantidade;
  });
  return {
    quadros: quadros, calcs: calcs, quantidade: quantidade,
    valor_total: Number(total.toFixed(2)), consumo_m: Number(consumo.toFixed(3))
  };
}

function _tipoDoQuadro(q) {
  var t = String(q.tipo || '');
  return t === 'reforma' || t === 'objeto' || t === 'camiseta' ? t : 'quadro';
}

function _linhaDoQuadro(id, ref, q, c, n) {
  var tipo = _tipoDoQuadro(q);
  var borda = _bordaDoQuadro(q);
  var duplo = _ehDisponivel(q.vidro_duplo);
  return {
    Orcamento: id, Ref_app: ref, N: n, Tipo: tipo,
    Tamanho: tipo === 'camiseta' ? String(q.tamanho || '') : '',
    Largura_cm: Number(q.largura_cm) || 0, Altura_cm: Number(q.altura_cm) || 0,
    Margem_cm: borda.paspatur ? 0 : borda.cm,
    Quantidade: c.quantidade,
    Paspatur_cm: borda.paspatur ? borda.cm : 0,
    Moldura: String(q.moldura || ''), Vidro: String(q.vidro || ''),
    Chapa: duplo ? '' : String(q.chapa || ''), Espelho: String(q.espelho || ''),
    Vidro_duplo: duplo, Objeto_alto: _ehDisponivel(q.objeto_alto),
    Valor_calculado: c.valor_total, Consumo_m: c.consumo_moldura_m,
    Servicos: c.servicos.length ? JSON.stringify(c.servicos) : '',
    Descricao: String(q.descricao || '').trim()
  };
}

function _gravarQuadros(id, ref, p) {
  garantirColunas(ABAS_APP.QUADROS, CABECALHOS_APP.Orcamento_quadros);
  var antigas = lerAba(ABAS_APP.QUADROS)
    .filter(function (l) { return String(l.Ref_app) === ref; })
    .map(function (l) { return l._linha; });
  if (antigas.length) apagarLinhas(ABAS_APP.QUADROS, antigas);
  p.quadros.forEach(function (q, i) {
    anexarLinha(ABAS_APP.QUADROS, _linhaDoQuadro(id, ref, q, p.calcs[i], i + 1));
  });
}

function _acharOrcamentoPorRef(ref) {
  var alvo = String(ref == null ? '' : ref).trim();
  if (!alvo) return null;
  var linhas = lerAba(ABAS_APP.ORCAMENTOS);
  for (var i = 0; i < linhas.length; i++) {
    if (String(linhas[i].Ref_app) === alvo) return linhas[i];
  }
  return null;
}

function _orcamentoEditavel(ref) {
  var atual = _acharOrcamentoPorRef(ref);
  if (atual && String(atual.Status) !== 'aberto') throw new Error('O orçamento ' + atual.ID + ' já foi fechado.');
  return atual;
}

function _upsertOrcamento(d, pedidoPronto) {
  var ref = String(d.ref_app == null ? '' : d.ref_app).trim();
  if (ref.length < 8) throw new Error('Orçamento sem ref_app.');
  var atual = _orcamentoEditavel(ref);
  var p = pedidoPronto || _calcularPedidoApp(d);
  var valorFinal = Number(d.valor_final) > 0 ? Number(Number(d.valor_final).toFixed(2)) : p.valor_total;
  garantirColunas(ABAS_APP.ORCAMENTOS, CABECALHOS_APP.Orcamentos);
  var campos = {
    Atendente: String(d.atendente || ''),
    Cliente: String(d.cliente || ''),
    Telefone: String(d.telefone || ''),
    Largura_cm: '', Altura_cm: '', Paspatur_cm: '', Moldura: '', Vidro: '', Chapa: '', Espelho: '',
    Vidro_duplo: '', Objeto_alto: '',
    Quantidade: p.quantidade,
    Quadros: _resumoQuadros(p.quadros),
    Valor_calculado: p.valor_total,
    Valor_final: valorFinal,
    Consumo_m: p.consumo_m,
    Obs: String(d.obs || '')
  };
  var id;
  if (atual) {
    id = String(atual.ID);
    atualizarCampos(ABAS_APP.ORCAMENTOS, atual._linha, campos);
  } else {
    id = _proximoIdSeq('ORC', lerAba(ABAS_APP.ORCAMENTOS).map(function (o) { return o.ID; }), 4);
    campos.ID = id;
    campos.Ref_app = ref;
    campos.Data_criacao = new Date();
    campos.Status = 'aberto';
    anexarLinha(ABAS_APP.ORCAMENTOS, campos);
  }
  _gravarQuadros(id, ref, p);
  return { id: id, linha: atual ? atual._linha : _acharOrcamentoPorRef(ref)._linha, pedido: p, valor_final: valorFinal };
}

function _appSalvarOrcamento(d) {
  var o = _upsertOrcamento(d);
  return {
    id: o.id, valor_calculado: o.pedido.valor_total, valor_final: o.valor_final, consumo_m: o.pedido.consumo_m
  };
}

function _registrarCompra(moldura, metros, orcamentoId, cliente) {
  var id = _proximoIdSeq('CMP', lerAba(ABAS_APP.COMPRAS).map(function (c) { return c.ID; }), 4);
  anexarLinha(ABAS_APP.COMPRAS, {
    ID: id, Data: new Date(), Moldura: String(moldura.Codigo), Nome: String(moldura.Nome || ''),
    Marca: String(moldura.Marca || ''), Metros_faltando: metros, Orcamento_id: orcamentoId,
    Cliente: cliente || '', Status: 'pendente', Data_atendida: ''
  });
  return id;
}

function _rotuloHistorico(q, i) {
  var tipo = _tipoDoQuadro(q);
  var txt = 'quadro ' + (i + 1);
  if (tipo === 'reforma') txt += ' (reforma)';
  if (tipo === 'objeto') txt += ' (objeto)';
  if (tipo === 'camiseta') txt += ' (camiseta' + (q.tamanho ? ' ' + q.tamanho : '') + ')';
  return txt;
}

function _registrarVendaApp(o, d, molduras, quando) {
  var p = o.pedido;
  var restante = {};
  molduras.forEach(function (m) { restante[m.codigo] = m.baixa_m; });
  var partes = [];
  var linhas = [];
  var taxa = 0;
  var chapaPintura = '';
  p.quadros.forEach(function (q, i) {
    var c = p.calcs[i];
    var codigoMoldura = String(q.moldura == null ? '' : q.moldura).trim();
    if (c.pintura_chapa > 0) {
      taxa += c.pintura_chapa * c.quantidade;
      if (!chapaPintura) chapaPintura = String(q.chapa || '');
    }
    var obs = 'Orçamento ' + o.id + ' (app)' + (p.quadros.length > 1 ? ', ' + _rotuloHistorico(q, i) : '');
    c.itens.forEach(function (it) {
      partes.push(Number((it.valor * c.quantidade).toFixed(2)));
      var l = { it: it, q: q, qtd: c.quantidade, obs: obs, moldura: it.categoria === 'moldura' };
      if (l.moldura) {
        var usa = Math.min(restante[codigoMoldura] || 0, c.consumo_moldura_m);
        restante[codigoMoldura] = Number(((restante[codigoMoldura] || 0) - usa).toFixed(3));
        l.codigo = codigoMoldura;
        l.baixa = Number(usa.toFixed(3));
        l.falta = Number((c.consumo_moldura_m - usa).toFixed(3));
      }
      linhas.push(l);
    });
    c.servicos.forEach(function (sv) {
      partes.push(sv.valor);
      linhas.push({ servico: sv, obs: obs });
    });
  });
  taxa = Number(taxa.toFixed(2));
  if (!linhas.length && Number(o.valor_final) - taxa > 0.005) {
    partes.push(0);
    linhas.push({ servico: { descricao: 'Reforma', valor: 0 }, obs: 'Orçamento ' + o.id + ' (app)' });
  }
  var montado = _montarValoresQuadro(partes, p.valor_total, taxa, o.valor_final);
  var cliente = String(d.cliente || '');
  linhas.forEach(function (l, i) {
    if (l.servico) {
      registrarHistorico({
        tipo: 'venda', categoria: 'servico', produto: l.servico.descricao || 'Serviço', quantidade: '', unidade: '',
        valor: montado.valores[i], cliente: cliente, observacoes: l.obs + '; serviço', codigo: '', data_hora: quando
      });
      return;
    }
    registrarHistorico({
      tipo: 'venda', categoria: l.it.categoria, produto: l.it.item,
      quantidade: l.moldura ? l.baixa : Number((l.it.quantidade * l.qtd).toFixed(3)),
      unidade: l.it.unidade, valor: montado.valores[i], cliente: cliente,
      observacoes: l.moldura
        ? l.obs + (l.falta > 0 ? '; faltou ' + l.falta + ' m (encomenda)' : '')
        : l.obs + '; sem baixa de estoque',
      codigo: l.moldura ? l.codigo : (l.q[l.it.categoria] || ''),
      data_hora: quando
    });
  });
  if (montado.pintura > 0) {
    registrarHistorico({
      tipo: 'venda', categoria: 'chapa', produto: 'Pintura de chapa', quantidade: '', unidade: '',
      valor: montado.pintura, cliente: cliente,
      observacoes: 'Orçamento ' + o.id + ' (app); pintura de chapa (objeto em relevo)',
      codigo: chapaPintura, data_hora: quando
    });
  }
}

function _appFecharVenda(d) {
  _orcamentoEditavel(d.ref_app);
  var p = _calcularPedidoApp(d);
  var planos = _consumoPorMoldura(p.quadros.map(function (q, i) {
    return { moldura: q.moldura, consumo: p.calcs[i].consumo_moldura_m };
  })).map(function (c) {
    var mold = _molduraOuErro(c.codigo);
    return { codigo: c.codigo, mold: mold, plano: _planejarBaixaMoldura(mold.dados.Estoque_atual_m, c.metros) };
  });
  var faltando = planos.filter(function (m) { return m.plano.falta > 0; });
  if (faltando.length && !_ehDisponivel(d.encomendar)) {
    throw new Error((faltando.length > 1 ? 'As molduras não dão: ' : 'A moldura não dá: ') +
      faltando.map(function (m) { return m.mold.dados.Nome + ' faltam ' + m.plano.falta + ' m'; }).join('; ') +
      '. Confirme a encomenda pra fechar.');
  }
  var o = _upsertOrcamento(d, p);
  var quando = new Date();
  var molduras = planos.map(function (m) {
    atualizarCampos(ABAS.MOLDURAS, m.mold.dados._linha, { Estoque_atual_m: m.plano.novo_estoque });
    var compraId = m.plano.falta > 0 ? _registrarCompra(m.mold.dados, m.plano.falta, o.id, String(d.cliente || '')) : '';
    return {
      codigo: m.codigo, baixa_m: m.plano.baixa, falta_m: m.plano.falta,
      novo_estoque_m: m.plano.novo_estoque, compra_id: compraId
    };
  });
  _registrarVendaApp(o, d, molduras, quando);
  var baixa = 0;
  var falta = 0;
  molduras.forEach(function (m) { baixa += m.baixa_m; falta += m.falta_m; });
  falta = Number(falta.toFixed(3));
  atualizarCampos(ABAS_APP.ORCAMENTOS, o.linha, {
    Status: 'fechado', Data_fechamento: quando,
    Fechado_por: String(d.fechado_por || d.atendente || ''), Falta_m: falta
  });
  var ordemId = d.oficina ? _criarOrdemNucleo({
    ref_app: String(d.oficina.ref_app || ('orc-' + d.ref_app)), cliente: String(d.cliente || '').trim() || o.id,
    telefone: d.telefone, descricao: d.oficina.descricao, prazo: d.oficina.prazo, valor: o.valor_final,
    obs: 'Orçamento ' + o.id
  }, 'app').id : '';
  var uma = molduras.length === 1 ? molduras[0] : null;
  return {
    id: o.id, valor_final: o.valor_final, baixa_m: Number(baixa.toFixed(3)), falta_m: falta,
    novo_estoque_m: uma ? uma.novo_estoque_m : null, compra_id: uma ? uma.compra_id : '', molduras: molduras,
    ordem_id: ordemId
  };
}

function _appDescartarOrcamento(d) {
  var atual = _orcamentoEditavel(d.ref_app);
  if (!atual) return { id: '' };
  atualizarCampos(ABAS_APP.ORCAMENTOS, atual._linha, {
    Status: 'descartado', Data_fechamento: new Date(), Fechado_por: String(d.atendente || '')
  });
  return { id: String(atual.ID) };
}

function _appEntradaMoldura(d) {
  var metros = _metros(d.metros, false);
  var p = _molduraOuErro(d.codigo);
  var faltas = _faltasPendentesDe(lerAba(ABAS_APP.COMPRAS), p.dados.Codigo);
  var ab = _abaterFaltas(metros, faltas);
  var novo = Number(((Number(p.dados.Estoque_atual_m) || 0) + ab.vai_pro_estoque).toFixed(3));
  atualizarCampos(ABAS.MOLDURAS, p.dados._linha, { Estoque_atual_m: novo });
  var agora = new Date();
  faltas.forEach(function (f) {
    if (ab.atendidas.indexOf(f.id) >= 0) {
      atualizarCampos(ABAS_APP.COMPRAS, f.linha, { Status: 'atendida', Data_atendida: agora });
    }
  });
  registrarHistorico({
    tipo: 'entrada', categoria: 'moldura', produto: p.dados.Nome, quantidade: metros, unidade: 'm',
    observacoes: 'app' + (d.atendente ? ' (' + d.atendente + ')' : '') +
      (ab.abatido > 0 ? '; ' + ab.abatido + ' m separados pras encomendas ' + ab.atendidas.join(', ') : ''),
    codigo: p.dados.Codigo
  });
  return {
    codigo: String(p.dados.Codigo), novo_estoque_m: novo,
    separado_m: ab.abatido, compras_atendidas: ab.atendidas
  };
}

function _appAjustarMoldura(d) {
  var metros = _metros(d.metros, true);
  var p = _molduraOuErro(d.codigo);
  var antes = Number(p.dados.Estoque_atual_m) || 0;
  atualizarCampos(ABAS.MOLDURAS, p.dados._linha, { Estoque_atual_m: metros, Contado_em: new Date() });
  registrarHistorico({
    tipo: 'ajuste', categoria: 'moldura', produto: p.dados.Nome,
    quantidade: Number((metros - antes).toFixed(3)), unidade: 'm',
    observacoes: 'contado ' + metros + ' m (antes ' + antes + ' m)' + (d.atendente ? '; ' + d.atendente : ''),
    codigo: p.dados.Codigo
  });
  return { codigo: String(p.dados.Codigo), novo_estoque_m: metros, antes_m: antes };
}

function _appContarCasinha(d) {
  var casinha = _normalizarCasinha(d.casinha);
  if (!_casinhaValida(casinha)) throw new Error('Casinha inválida: ' + d.casinha);
  var itens = (d.itens || []).map(function (it) {
    return { p: _molduraOuErro(it.codigo), metros: _metros(it.metros, true) };
  });
  var agora = new Date();
  itens.forEach(function (it) {
    var antes = Number(it.p.dados.Estoque_atual_m) || 0;
    atualizarCampos(ABAS.MOLDURAS, it.p.dados._linha, {
      Estoque_atual_m: it.metros, Local: casinha, Contado_em: agora
    });
    registrarHistorico({
      tipo: 'contagem', categoria: 'moldura', produto: it.p.dados.Nome,
      quantidade: Number((it.metros - antes).toFixed(3)), unidade: 'm',
      observacoes: _nomeCasinha(casinha) + ': ' + it.metros + ' m (antes ' + antes + ' m)',
      codigo: it.p.dados.Codigo
    });
  });
  var linha = acharPorCodigo(ABAS_APP.CASINHAS, casinha);
  if (linha) {
    atualizarCampos(ABAS_APP.CASINHAS, linha._linha, { Contada_em: agora, Contada_por: String(d.atendente || '') });
  }
  return { casinha: casinha, molduras: itens.length };
}

function _appMoverMoldura(d) {
  var casinha = _normalizarCasinha(d.casinha);
  if (!_casinhaValida(casinha)) throw new Error('Casinha inválida: ' + d.casinha);
  var p = _molduraOuErro(d.codigo);
  atualizarCampos(ABAS.MOLDURAS, p.dados._linha, { Local: casinha });
  return { codigo: String(p.dados.Codigo), casinha: casinha };
}

function _salvarFotoMoldura(codigo, base64, tipo) {
  var mime = String(tipo || 'image/jpeg');
  var blob = Utilities.newBlob(Utilities.base64Decode(String(base64)), mime, 'app-' + codigo + '.jpg');
  var arquivo = DriveApp.getFolderById(FOTO_PASTA_ID).createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return _linkDaFoto(arquivo);
}

function _linkDaFoto(arquivo) {
  return 'https://drive.google.com/thumbnail?id=' + arquivo.getId() + '&sz=w1000';
}

var LIMITE_FOTOS_ORDEM = 5;
var PASTA_FOTOS_OFICINA = 'Fotos da oficina';

function _pastaFotosOficina() {
  var raiz = DriveApp.getFolderById(FOTO_PASTA_ID);
  var achadas = raiz.getFoldersByName(PASTA_FOTOS_OFICINA);
  return achadas.hasNext() ? achadas.next() : raiz.createFolder(PASTA_FOTOS_OFICINA);
}

function _nomeFotoOrdem(ref) {
  return 'oficina-' + ref + '.jpg';
}

function _appFotoOrdem(d) {
  garantirColunas(ABAS_FIN.OFICINA, CABECALHOS_FIN.Oficina);
  var o = _acharOrdemApp(d);
  var ref = String(d.foto_ref || '');
  if (!ref) throw new Error('Foto sem identificação.');
  if (!d.foto_base64) throw new Error('A foto chegou vazia. Tire de novo.');
  var quadro = Math.max(0, Math.round(Number(d.quadro) || 0));
  var fotos = _fotosDaLinha(o.Fotos);
  var doQuadro = fotos.filter(function (f) { return f.quadro === quadro; });
  if (doQuadro.length >= LIMITE_FOTOS_ORDEM) {
    throw new Error((quadro ? 'O quadro ' + quadro : 'A ordem') + ' já tem ' + LIMITE_FOTOS_ORDEM + ' fotos.');
  }
  var mime = String(d.foto_tipo || 'image/jpeg');
  var blob = Utilities.newBlob(Utilities.base64Decode(String(d.foto_base64)), mime, _nomeFotoOrdem(ref));
  var arquivo = _pastaFotosOficina().createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var url = _linkDaFoto(arquivo);
  fotos.push({ url: url, quadro: quadro });
  atualizarCampos(ABAS_FIN.OFICINA, o._linha, { Fotos: _linhaDasFotos(fotos) });
  return { id: String(o.ID), foto_ref: ref, foto_url: url, quadro: quadro };
}

function _linkPeloNome(ref) {
  if (!ref) return '';
  var achados = _pastaFotosOficina().getFilesByName(_nomeFotoOrdem(ref));
  return achados.hasNext() ? _linkDaFoto(achados.next()) : '';
}

function _appTirarFotoOrdem(d) {
  var o = _acharOrdemApp(d);
  var fotos = _fotosDaLinha(o.Fotos);
  var url = String(d.foto_url || '');
  if (!/^https?:/i.test(url)) url = _linkPeloNome(String(d.foto_ref || ''));
  var tem = fotos.some(function (f) { return f.url === url; });
  if (!url || !tem) return { id: String(o.ID), foto_url: '' };
  atualizarCampos(ABAS_FIN.OFICINA, o._linha, { Fotos: _linhaDasFotos(fotos.filter(function (f) { return f.url !== url; })) });
  var id = url.match(/[?&]id=([^&]+)/);
  if (id) {
    try { DriveApp.getFileById(id[1]).setTrashed(true); } catch (e) {}
  }
  return { id: String(o.ID), foto_url: url };
}

function _appCadastrarMoldura(d) {
  var m = _validarNovaMoldura(d);
  if (buscarProduto(m.codigo)) throw new Error('Já existe um produto com o código ' + m.codigo + '.');
  var foto = d.foto_base64 ? _salvarFotoMoldura(m.codigo, d.foto_base64, d.foto_tipo) : '';
  var agora = new Date();
  anexarLinha(ABAS.MOLDURAS, {
    Codigo: m.codigo, Nome: m.nome, Marca: m.marca, Estilo: m.estilo, Cor: m.cor,
    Largura_perfil_cm: m.perfil_cm, Valor_por_metro: m.preco_m || '', Foto_URL: foto,
    Estoque_atual_m: m.metros, Disponivel: m.disponivel, Local: m.casinha,
    Contado_em: m.casinha ? agora : ''
  });
  registrarHistorico({
    tipo: 'contagem', categoria: 'moldura', produto: m.nome, quantidade: m.metros, unidade: 'm',
    observacoes: 'cadastrada pelo app' + (m.casinha ? ' em ' + _nomeCasinha(m.casinha) : ''),
    codigo: m.codigo
  });
  return { codigo: m.codigo, foto_url: foto, disponivel: m.disponivel };
}

function _appZerarNaoEncontradas(d) {
  var pedidos = (d.codigos || []).map(function (c) { return String(c); });
  var agora = new Date();
  var zeradas = [];
  lerAba(ABAS.MOLDURAS).forEach(function (m) {
    var cod = String(m.Codigo);
    if (pedidos.indexOf(cod) < 0 || _normalizarCasinha(m.Local)) return;
    var antes = Number(m.Estoque_atual_m) || 0;
    atualizarCampos(ABAS.MOLDURAS, m._linha, { Estoque_atual_m: 0, Contado_em: agora });
    registrarHistorico({
      tipo: 'ajuste', categoria: 'moldura', produto: m.Nome, quantidade: -antes, unidade: 'm',
      observacoes: 'não achada no inventário (antes ' + antes + ' m)', codigo: cod
    });
    zeradas.push(cod);
  });
  return { zeradas: zeradas };
}
