export function planilhaFalsa(ctx, abas) {
  const cab = { ...ctx.CABECALHOS, ...ctx.CABECALHOS_FIN, ...ctx.CABECALHOS_APP };
  const dados = {};
  for (const [nome, linhas] of Object.entries(abas)) dados[nome] = linhas.map((l) => ({ ...l }));

  const exigeAba = (nome) => {
    if (!(nome in dados)) throw new Error('Aba não encontrada: ' + nome);
  };
  const confere = (nome, campos) => {
    exigeAba(nome);
    for (const c of Object.keys(campos)) {
      if (!cab[nome] || !cab[nome].includes(c)) throw new Error(`Coluna "${c}" não existe na aba ${nome}`);
    }
  };
  const comLinha = (nome) => {
    exigeAba(nome);
    return dados[nome].map((l, i) => ({ ...l, _linha: i + 2 }));
  };

  ctx.abaExiste = (nome) => nome in dados;
  ctx.lerAba = comLinha;
  ctx.lerAbas = (nomes) => Object.fromEntries(nomes.map((n) => [n, n in dados ? comLinha(n) : []]));
  ctx.acharPorCodigo = (nome, codigo) =>
    comLinha(nome).find((l) => String(l.Codigo) === String(codigo)) || null;
  ctx.anexarLinha = (nome, obj) => {
    confere(nome, obj);
    dados[nome].push({ ...obj });
  };
  ctx.atualizarCampos = (nome, linha, campos) => {
    confere(nome, campos);
    Object.assign(dados[nome][linha - 2], campos);
  };
  ctx.apagarLinhas = (nome, linhas) => {
    exigeAba(nome);
    [...linhas].sort((a, b) => b - a).forEach((n) => dados[nome].splice(n - 2, 1));
  };
  ctx.garantirColunas = (nome) => {
    if (!(nome in dados)) dados[nome] = [];
  };
  ctx.comLock = (fn) => fn();
  return dados;
}
