const DESCRICOES = {
  entradaMoldura: (d) => 'chegou mercadoria de ' + d.codigo,
  ajustarMoldura: (d) => 'correção de ' + d.codigo,
  contarCasinha: (d) => 'contagem de ' + d.casinha,
  moverMoldura: (d) => 'mudança de ' + d.codigo,
  cadastrarMoldura: (d) => 'cadastro de ' + d.codigo,
  salvarOrcamento: (d) => 'orçamento de ' + (d.cliente || 'cliente sem nome'),
  fecharVenda: (d) => 'venda de ' + (d.cliente || 'cliente sem nome'),
  descartarOrcamento: (d) => 'descartar orçamento de ' + (d.cliente || 'cliente sem nome'),
  zerarNaoEncontradas: (d) => 'zerar ' + (d.codigos || []).length + ' molduras não achadas'
};

export function novaOperacao(acao, dados, { id, agora, extra } = {}) {
  return { id_op: id, acao, dados, extra: extra || null, criada_em: agora || new Date().toISOString() };
}

export function semFoto(op) {
  if (!op.dados || !op.dados.foto_base64) return op;
  const { foto_base64, ...resto } = op.dados;
  return { ...op, dados: resto };
}

export async function esvaziarFila({ proxima, enviar, aoTerminar }) {
  for (;;) {
    const op = proxima();
    if (!op) return { parou: null };
    const resposta = await enviar(op);
    if (resposta.tipo === 'temporario') return { parou: resposta.erro };
    await aoTerminar(op, resposta);
  }
}

export function descreverOperacao(op) {
  const descrever = DESCRICOES[op.acao];
  return descrever ? descrever(op.dados || {}) : op.acao;
}
