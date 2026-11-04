// Movimentacao.gs — escritas. Tudo sob comLock(); histórico é append-only.

// Registra uma linha no histórico (nunca apaga nada).
function registrarHistorico(mov) {
  anexarLinha(ABAS.HISTORICO, {
    Data_hora: mov.data_hora || new Date(),
    Tipo_movimentacao: mov.tipo,
    Categoria: mov.categoria || '',
    Produto: mov.produto || '',
    Quantidade: mov.quantidade != null ? mov.quantidade : '',
    Unidade: mov.unidade || '',
    Valor: mov.valor != null ? mov.valor : '',
    Cliente: mov.cliente || '',
    Observacoes: mov.observacoes || '',
    Codigo: mov.codigo || ''
  });
}
