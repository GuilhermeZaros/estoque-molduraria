import {
  abaterFaltas, normalizarCasinha, planejarBaixaMoldura, validarNovaMoldura, quadrosDoPedido, consumoPorMoldura, resumoQuadros,
  servicosDoQuadro
} from './gerado/nucleo';
import { fotosDaOrdem } from './oficina';

function trocarMoldura(pacote, codigo, mudar) {
  return {
    ...pacote,
    molduras: pacote.molduras.map((m) => (m.codigo === String(codigo) ? { ...m, ...mudar(m) } : m))
  };
}

function entrada(pacote, d, r) {
  const faltas = pacote.compras_pendentes
    .filter((c) => c.moldura === String(d.codigo))
    .map((c) => ({ id: c.id, metros: c.metros_faltando }));
  const abate = abaterFaltas(Number(d.metros), faltas);
  const atendidas = r && r.compras_atendidas ? r.compras_atendidas : abate.atendidas;
  const comEstoque = trocarMoldura(pacote, d.codigo, (m) => ({
    estoque_m: r && r.novo_estoque_m != null
      ? r.novo_estoque_m
      : Number((m.estoque_m + abate.vai_pro_estoque).toFixed(3))
  }));
  return { ...comEstoque, compras_pendentes: comEstoque.compras_pendentes.filter((c) => !atendidas.includes(c.id)) };
}

function contagem(pacote, d) {
  const casinha = normalizarCasinha(d.casinha);
  const contados = new Map((d.itens || []).map((it) => [String(it.codigo), Number(it.metros)]));
  return {
    ...pacote,
    molduras: pacote.molduras.map((m) => (contados.has(m.codigo)
      ? { ...m, local: casinha, estoque_m: contados.get(m.codigo) }
      : m)),
    casinhas_contadas: pacote.casinhas_contadas.includes(casinha)
      ? pacote.casinhas_contadas
      : [...pacote.casinhas_contadas, casinha]
  };
}

function cadastro(pacote, d, r, extra) {
  let v;
  try {
    v = validarNovaMoldura(d);
  } catch (e) {
    return pacote;
  }
  if (pacote.molduras.some((m) => m.codigo === v.codigo)) return pacote;
  const nova = {
    codigo: v.codigo, nome: v.nome, marca: v.marca, estilo: v.estilo, cor: v.cor,
    perfil_cm: v.perfil_cm, preco_m: v.preco_m, estoque_m: v.metros,
    foto_url: (r && r.foto_url) || (extra && extra.foto_uri) || '',
    local: v.casinha,
    disponivel: r && r.disponivel != null ? r.disponivel : v.disponivel
  };
  return { ...pacote, molduras: [...pacote.molduras, nova] };
}

function quadroSalvo(q) {
  return {
    tipo: q.tipo === 'reforma' || q.tipo === 'objeto' ? q.tipo : 'quadro',
    largura_cm: Number(q.largura_cm) || 0,
    altura_cm: Number(q.altura_cm) || 0,
    margem_cm: Number(q.margem_cm) || 0,
    quantidade: Number(q.quantidade) || 1,
    paspatur_cm: Number(q.paspatur_cm) || 0,
    moldura: q.moldura || '',
    vidro: q.vidro || '',
    chapa: q.chapa || '',
    espelho: q.espelho || '',
    vidro_duplo: !!q.vidro_duplo,
    objeto_alto: !!q.objeto_alto,
    valor_calculado: Number(q.valor_calculado) || 0,
    consumo_m: Number(q.consumo_m) || 0,
    servicos: servicosDoQuadro(q.servicos)
  };
}

function salvarOrcamento(pacote, d, r, criadaEm) {
  const abertos = pacote.orcamentos_abertos || [];
  const atual = abertos.find((o) => o.ref_app === d.ref_app);
  const valorCalculado = r && r.valor_calculado != null ? r.valor_calculado : Number(d.valor_calculado) || 0;
  const quadros = quadrosDoPedido(d).map(quadroSalvo);
  const orcamento = {
    id: (r && r.id) || (atual && atual.id) || '',
    ref_app: d.ref_app,
    data_criacao: (atual && atual.data_criacao) || criadaEm || '',
    cliente: d.cliente || '',
    telefone: d.telefone || '',
    quadros,
    resumo: resumoQuadros(quadros),
    quantidade: quadros.reduce((s, q) => s + q.quantidade, 0),
    valor_calculado: valorCalculado,
    valor_final: r && r.valor_final != null ? r.valor_final : Number(d.valor_final) > 0 ? Number(d.valor_final) : valorCalculado,
    consumo_m: r && r.consumo_m != null ? r.consumo_m : Number(d.consumo_m) || 0,
    status: 'aberto',
    obs: d.obs || ''
  };
  return {
    ...pacote,
    orcamentos_abertos: atual
      ? abertos.map((o) => (o.ref_app === d.ref_app ? orcamento : o))
      : [...abertos, orcamento]
  };
}

function fecharVenda(pacote, d, r, idOp) {
  const consumos = consumoPorMoldura(quadrosDoPedido(d).map((q) => ({ moldura: q.moldura, consumo: q.consumo_m })));
  let p = { ...pacote, orcamentos_abertos: (pacote.orcamentos_abertos || []).filter((o) => o.ref_app !== d.ref_app) };
  consumos.forEach((c, i) => {
    const mold = p.molduras.find((m) => m.codigo === c.codigo);
    if (!mold) return;
    const daPlanilha = r ? (r.molduras ? r.molduras.find((x) => x.codigo === c.codigo) : consumos.length === 1 ? r : null) : null;
    const plano = planejarBaixaMoldura(mold.estoque_m, c.metros);
    const novoEstoque = daPlanilha && daPlanilha.novo_estoque_m != null ? daPlanilha.novo_estoque_m : plano.novo_estoque;
    const falta = daPlanilha && daPlanilha.falta_m != null ? daPlanilha.falta_m : plano.falta;
    p = trocarMoldura(p, mold.codigo, () => ({ estoque_m: novoEstoque }));
    if (!(falta > 0)) return;
    p = {
      ...p,
      compras_pendentes: [...p.compras_pendentes, {
        id: (daPlanilha && daPlanilha.compra_id) || 'pendente-' + idOp + (i ? '-' + i : ''),
        data: '',
        moldura: mold.codigo,
        nome: mold.nome,
        marca: mold.marca,
        metros_faltando: falta,
        orcamento_id: (r && r.id) || '',
        cliente: d.cliente || ''
      }]
    };
  });
  return p;
}

function bateOrdem(d) {
  return (o) => (!!d.id && o.id === d.id) || (!!d.ref_app && o.ref_app === d.ref_app);
}

function criarOrdem(pacote, d, r, criadaEm) {
  const ordem = {
    id: (r && r.id) || '',
    ref_app: d.ref_app || '',
    cliente: d.cliente || '',
    telefone: d.telefone || '',
    descricao: d.descricao || '',
    prazo: d.prazo || '',
    valor: Number(d.valor) || 0,
    status: 'em_producao',
    aviso: '',
    data_criacao: criadaEm || '',
    data_pronto: '',
    fotos: [],
    quadros: d.quadros || []
  };
  const resto = (pacote.oficina || []).filter((o) => !(d.ref_app && o.ref_app === d.ref_app));
  return { ...pacote, oficina: [ordem, ...resto] };
}

function mudarOrdem(pacote, d, mudar) {
  const bate = bateOrdem(d);
  return { ...pacote, oficina: (pacote.oficina || []).map((o) => (bate(o) ? { ...o, ...mudar(o) } : o)) };
}

function editarOrdem(pacote, d) {
  return mudarOrdem(pacote, d, () => ({
    cliente: d.cliente || '', telefone: d.telefone || '', descricao: d.descricao || '', prazo: d.prazo || '',
    valor: Number(d.valor) || 0
  }));
}

function porFoto(pacote, d, resultado, extra) {
  const foto = {
    ref: d.foto_ref || '',
    url: (resultado && resultado.foto_url) || (extra && extra.foto_uri) || '',
    quadro: Number(d.quadro) || 0
  };
  return mudarOrdem(pacote, d, (o) => ({ fotos: [...fotosDaOrdem(o).filter((f) => !foto.ref || f.ref !== foto.ref), foto] }));
}

function tirarFoto(pacote, d) {
  const bate = (f) => (!!d.foto_ref && f.ref === d.foto_ref) || (!!d.foto_url && f.url === d.foto_url);
  return mudarOrdem(pacote, d, (o) => ({ fotos: fotosDaOrdem(o).filter((f) => !bate(f)) }));
}

function entregarOrdem(pacote, d) {
  const bate = bateOrdem(d);
  return { ...pacote, oficina: (pacote.oficina || []).filter((o) => !bate(o)) };
}

function ordemDaVenda(pacote, d, r, criadaEm) {
  if (!d.oficina) return pacote;
  const valor = r && r.valor_final != null ? r.valor_final : Number(d.valor_final) > 0 ? Number(d.valor_final) : Number(d.valor_calculado) || 0;
  return criarOrdem(pacote, {
    ref_app: d.oficina.ref_app || 'orc-' + d.ref_app,
    cliente: String(d.cliente || '').trim() || (r && r.id) || '',
    telefone: d.telefone || '',
    descricao: d.oficina.descricao || '',
    prazo: d.oficina.prazo || '',
    valor,
    quadros: d.quadros || []
  }, r && r.ordem_id ? { id: r.ordem_id } : null, criadaEm);
}

function descartarOrcamento(pacote, d) {
  return { ...pacote, orcamentos_abertos: (pacote.orcamentos_abertos || []).filter((o) => o.ref_app !== d.ref_app) };
}

function zerarNaoEncontradas(pacote, d) {
  const codigos = new Set((d.codigos || []).map(String));
  return {
    ...pacote,
    molduras: pacote.molduras.map((m) => (codigos.has(m.codigo) && !normalizarCasinha(m.local) ? { ...m, estoque_m: 0 } : m))
  };
}

export function aplicarOperacao(pacote, op, resultado) {
  const d = op.dados || {};
  switch (op.acao) {
    case 'entradaMoldura': return entrada(pacote, d, resultado);
    case 'ajustarMoldura': return trocarMoldura(pacote, d.codigo, () => ({ estoque_m: Number(d.metros) }));
    case 'contarCasinha': return contagem(pacote, d);
    case 'moverMoldura': return trocarMoldura(pacote, d.codigo, () => ({ local: normalizarCasinha(d.casinha) }));
    case 'cadastrarMoldura': return cadastro(pacote, d, resultado, op.extra);
    case 'salvarOrcamento': return salvarOrcamento(pacote, d, resultado, op.criada_em);
    case 'fecharVenda': return ordemDaVenda(fecharVenda(pacote, d, resultado, op.id_op), d, resultado, op.criada_em);
    case 'descartarOrcamento': return descartarOrcamento(pacote, d);
    case 'zerarNaoEncontradas': return zerarNaoEncontradas(pacote, d);
    case 'criarOrdem': return criarOrdem(pacote, d, resultado, op.criada_em);
    case 'editarOrdem': return editarOrdem(pacote, d);
    case 'marcarAcabamento': return mudarOrdem(pacote, d, (o) => (o.status === 'em_producao' ? { status: 'acabamento' } : {}));
    case 'marcarPronto': return mudarOrdem(pacote, d, () => ({ status: 'pronto', aviso: '', data_pronto: op.criada_em || '' }));
    case 'marcarEntregue': return entregarOrdem(pacote, d);
    case 'fotoOrdem': return porFoto(pacote, d, resultado, op.extra);
    case 'tirarFotoOrdem': return tirarFoto(pacote, d);
    default: return pacote;
  }
}

export function aplicarPendentes(pacote, fila) {
  return (fila || []).reduce((p, op) => aplicarOperacao(p, op), pacote);
}
