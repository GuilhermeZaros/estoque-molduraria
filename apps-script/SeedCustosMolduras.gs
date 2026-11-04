// SeedCustosMolduras.gs — preenche o Custo_por_metro das molduras (custos informados pelo dono,
// conferidos por fornecedor: Art Mold / Ruberti / Aguiar / Moldurarte). Casa pelo Codigo (= referência).
// Os 'X' da lista (sem custo no fornecedor) ficam de fora. Rode pelo menu. Idempotente; guarda custo < venda.

function importarCustosMolduras() {
  return comLock(function () {
    var molduras = lerAba(ABAS.MOLDURAS);
    var aplicadas = 0, puladas = 0;
    molduras.forEach(function (m) {
      var custo = CUSTOS_MOLDURAS[String(m.Codigo).trim()];
      if (custo === undefined) return;
      if (!(custo < Number(m.Valor_por_metro))) { puladas++; return; } // custo >= venda: não aplica
      atualizarCelula(ABAS.MOLDURAS, m._linha, 'Custo_por_metro', custo);
      aplicadas++;
    });
    return 'Custos aplicados: ' + aplicadas + ' molduras (puladas ' + puladas +
      ' por custo >= venda). As demais não têm custo definido.';
  });
}
