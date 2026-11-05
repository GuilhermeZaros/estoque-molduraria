// Config.gs — onde está cada coisa. Toda referência a aba/coluna passa por aqui.

var ABAS = {
  MOLDURAS: 'Molduras',
  VIDROS: 'Vidros',
  CHAPAS: 'Chapas',
  ESPELHOS: 'Espelhos',
  AVULSOS: 'Avulsos',
  HISTORICO: 'Historico'
};

// Categoria (singular) -> aba correspondente.
var ABA_POR_CATEGORIA = {
  moldura: ABAS.MOLDURAS,
  vidro: ABAS.VIDROS,
  chapa: ABAS.CHAPAS,
  espelho: ABAS.ESPELHOS,
  avulso: ABAS.AVULSOS
};

// Cabeçalhos exatos de cada aba (ordem das colunas).
var CABECALHOS = {
  Molduras: ['Codigo', 'Nome', 'Marca', 'Estilo', 'Cor', 'Acabamento',
             'Largura_perfil_cm', 'Valor_por_metro', 'Preco_minimo', 'Foto_URL',
             'Descricao', 'Tags', 'Estoque_atual_m', 'Estoque_minimo_m', 'Disponivel',
             'Custo_por_metro', 'Local', 'Contado_em'],
  Vidros:   ['Codigo', 'Nome', 'Tipo', 'Espessura_mm', 'Valor_por_m2', 'Preco_minimo',
             'Descricao', 'Estoque_atual_m2', 'Estoque_minimo_m2', 'Disponivel',
             'Custo_por_m2'],
  Chapas:   ['Codigo', 'Nome', 'Tipo', 'Espessura_mm', 'Valor_por_m2', 'Preco_minimo',
             'Descricao', 'Estoque_atual_m2', 'Estoque_minimo_m2', 'Disponivel',
             'Custo_por_m2'],
  Espelhos: ['Codigo', 'Nome', 'Tipo', 'Espessura_mm', 'Valor_por_m2', 'Preco_minimo',
             'Descricao', 'Estoque_atual_m2', 'Estoque_minimo_m2', 'Disponivel',
             'Custo_por_m2'],
  // Avulsos: materiais vendidos à parte (por m²), FORA do cálculo automático do quadro
  // (o orçamento só conhece moldura/vidro/chapa/espelho). Ex.: silicone, passepartout.
  Avulsos:  ['Codigo', 'Nome', 'Tipo', 'Espessura_mm', 'Valor_por_m2', 'Preco_minimo',
             'Descricao', 'Estoque_atual_m2', 'Estoque_minimo_m2', 'Disponivel',
             'Custo_por_m2'],
  Historico:['Data_hora', 'Tipo_movimentacao', 'Categoria', 'Produto', 'Quantidade',
             'Unidade', 'Valor', 'Cliente', 'Observacoes', 'Codigo']
};

// ====================== FINANCEIRO (caderno digital) ======================
// Módulo separado do estoque: gastos (Saidas) e vendas (Entradas) lançados por você.

// Ano dos lançamentos históricos importados dos CSV (datas vêm como DD/MM).
var ANO_HISTORICO = 2026;

// Abas do financeiro — propositalmente FORA de CABECALHOS (que o seedInicial limpa),
// pra um seed do catálogo nunca apagar dados financeiros.
var ABAS_FIN = {
  SAIDAS: 'Saidas',
  ENTRADAS: 'Entradas',
  RESUMO_MENSAL: 'ResumoMensal',
  USUARIOS: 'Usuarios',
  OFICINA: 'Oficina',
  SALDOS: 'Saldos'
};

var CABECALHOS_FIN = {
  Saidas:       ['id', 'timestamp', 'data', 'descricao', 'valor', 'categoria', 'pagamento', 'obs', 'origem', 'tipo'],
  Entradas:     ['id', 'timestamp', 'data', 'valor', 'forma_pagamento', 'cliente', 'obs', 'origem'],
  ResumoMensal: ['mes', 'ano', 'entrada', 'saida', 'saldo', 'margem'],
  Usuarios:     ['email', 'senha', 'nome', 'ativo', 'papeis'],
  // Saldos: 1 linha de dados (conta + tesouro). atualizado_em vira string no retorno (regra de ouro).
  Saldos:       ['conta_empresa', 'tesouro_direto', 'atualizado_em'],
  // Oficina: ordens de serviço (texto livre). Protegida do seed, como o resto do financeiro.
  Oficina:      ['ID', 'Data_criacao', 'Cliente', 'Telefone', 'Descricao', 'Prazo', 'Valor',
                 'Status', 'Aviso', 'Data_aviso', 'Data_pronto', 'Data_entrega',
                 'Lancado_financeiro', 'Criado_por', 'Finalizado_por', 'Obs', 'Ref_app', 'Fotos']
};

// Enum fixo de categorias de SAÍDA. O que vier fora cai em 'Outros' (com aviso no log).
var CATEGORIAS_SAIDA = ['Salários', 'Impostos', 'Contas', 'Matéria-Prima',
  'Marketing', 'Financiamento', 'Frete', 'Outros'];

// Saldos iniciais (semeados na 1ª criação da aba Saldos).
var SALDO_INICIAL = { conta_empresa: 2950.12, tesouro_direto: 23115.33 };

// Formas de pagamento (dropdown dos lançamentos).
var FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Débito', 'Crédito', 'Cartão parcelado',
  'Cheque', 'Link', 'Boleto'];

var ABAS_APP = {
  CASINHAS: 'Casinhas',
  ORCAMENTOS: 'Orcamentos',
  QUADROS: 'Orcamento_quadros',
  COMPRAS: 'Compras',
  OPERACOES: 'AppOperacoes'
};

var CABECALHOS_APP = {
  Casinhas:     ['Codigo', 'Contada_em', 'Contada_por'],
  Orcamentos:   ['ID', 'Ref_app', 'Data_criacao', 'Atendente', 'Cliente', 'Telefone',
                 'Largura_cm', 'Altura_cm', 'Quantidade', 'Paspatur_cm',
                 'Moldura', 'Vidro', 'Chapa', 'Espelho', 'Vidro_duplo', 'Objeto_alto',
                 'Valor_calculado', 'Valor_final', 'Consumo_m',
                 'Status', 'Data_fechamento', 'Fechado_por', 'Falta_m', 'Obs', 'Quadros'],
  Orcamento_quadros: ['Orcamento', 'Ref_app', 'N', 'Tipo', 'Tamanho', 'Largura_cm', 'Altura_cm', 'Margem_cm',
                 'Quantidade', 'Paspatur_cm', 'Moldura', 'Vidro', 'Chapa', 'Espelho', 'Vidro_duplo',
                 'Objeto_alto', 'Valor_calculado', 'Consumo_m', 'Servicos'],
  Compras:      ['ID', 'Data', 'Moldura', 'Nome', 'Marca', 'Metros_faltando',
                 'Orcamento_id', 'Cliente', 'Status', 'Data_atendida'],
  AppOperacoes: ['Id_op', 'Data', 'Acao', 'Resultado']
};
