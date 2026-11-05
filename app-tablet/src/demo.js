import { aplicarOperacao } from './efeitos';
import { consumoPorMoldura, planejarBaixaMoldura, quadrosDoPedido } from './gerado/nucleo';
import { criarFinanceiroDemo } from './demoFinanceiro';
import { textoData } from './oficina';

const moldura = (codigo, nome, marca, perfil_cm, estoque_m, local, preco_m = 30) => ({
  codigo, nome, marca, estilo: '', cor: '', perfil_cm, preco_m, estoque_m, foto_url: '', local, disponivel: true
});

const material = (codigo, nome, categoria, preco) => ({
  codigo, nome, categoria, marca: '', preco, estoque: 10, unidade: 'm²', disponivel: true
});

const fotoDemo = (texto, fundo) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="' + fundo + '"/>' +
  '<rect x="70" y="60" width="500" height="360" fill="none" stroke="#c9a227" stroke-width="40"/>' +
  '<text x="320" y="255" font-family="sans-serif" font-size="46" text-anchor="middle" fill="#13294b">' + texto + '</text></svg>'
);

const quadroDemo = (mudar) => ({
  tipo: 'quadro', largura_cm: 0, altura_cm: 0, margem_cm: 0, quantidade: 1, paspatur_cm: 0, moldura: '',
  vidro: '', chapa: '', espelho: '', vidro_duplo: false, objeto_alto: false, valor_calculado: 0, consumo_m: 0, servicos: [],
  descricao: '', ...mudar
});

export const PACOTE_DEMO = {
  gerado_em: '2026-10-30T12:00:00.000Z',
  molduras: [
    moldura('D-101', 'Lisa preta 2 cm', 'Moldurarte', 2, 12.4, 'CR1-E1', 28),
    moldura('D-102', 'Lisa branca 2 cm', 'Moldurarte', 2, 3.1, 'CR1-E1', 28),
    moldura('D-103', 'Clássica dourada', 'Artmold', 3.5, 1.2, 'CR1-E2', 65),
    moldura('D-104', 'Rústica natural', 'Ruberti', 4, 9, 'CR1-F3', 48),
    moldura('D-105', 'Filete prata', 'Molduras Aguiar', 1, 0.6, 'CR3-D1', 22),
    moldura('D-106', 'Caixa preta funda', 'Artmold', 3, 6.5, 'CR3-D1', 55),
    moldura('D-107', 'Provençal branca', 'Ruberti', 5, 15.2, 'PR1-2', 72),
    moldura('D-108', 'Laca vermelha', 'Moldurarte', 2.5, 2.9, 'CR2-E4', 40),
    moldura('D-109', 'Madeira escura', 'Molduras Aguiar', 3, 20, '', 45),
    moldura('D-110', 'Ouro velho', 'Artmold', 4.5, 4.4, '', 90)
  ],
  materiais: [
    material('VID-001', 'Vidro simples', 'vidro', 180),
    material('VID-002', 'Vidro antirreflexo', 'vidro', 300),
    material('CHA-001', 'Chapa Eucatex', 'chapa', 90),
    material('ESP-001', 'Espelho 3 mm', 'espelho', 330)
  ],
  paspatur_m2: 330,
  taxa_pintura_chapa: 30,
  casinhas_contadas: ['CR1-E1', 'CR1-E2', 'CR1-F3', 'CR1-D5', 'CR3-D1', 'PR1-2'],
  orcamentos_abertos: [{
    id: 'ORC-0002', ref_app: 'demo-orcamento-0002', data_criacao: '2026-11-02T15:20:00.000Z',
    cliente: 'Maria Souza', telefone: '11988887777', largura_cm: 30, altura_cm: 40, quantidade: 1, paspatur_cm: 5,
    moldura: 'D-104', vidro: 'VID-001', chapa: 'CHA-001', espelho: '', vidro_duplo: false, objeto_alto: false,
    valor_calculado: 206.4, valor_final: 206.4, consumo_m: 2.362, status: 'aberto', obs: ''
  }, {
    id: 'ORC-0003', ref_app: 'demo-orcamento-0003', data_criacao: '2026-11-03T10:05:00.000Z',
    cliente: 'João Pereira', telefone: '11977776666', quantidade: 4, valor_calculado: 475.2, valor_final: 475.2,
    consumo_m: 5.804, status: 'aberto', obs: '', resumo: '2x 20 x 30; reforma 40 x 60 (Limpar vidros); objeto 52 x 72',
    quadros: [
      quadroDemo({
        largura_cm: 20, altura_cm: 30, quantidade: 2, moldura: 'D-101', vidro: 'VID-001', chapa: 'CHA-001', valor_calculado: 88.4,
        consumo_m: 2.578, descricao: 'Fotos dos netos, uma em cada quadro.'
      }),
      quadroDemo({
        tipo: 'reforma', largura_cm: 40, altura_cm: 60, vidro: 'VID-001', valor_calculado: 73.2,
        servicos: [{ descricao: 'Limpar vidros', valor: 30 }]
      }),
      quadroDemo({
        tipo: 'objeto', largura_cm: 52, altura_cm: 72, margem_cm: 4, moldura: 'D-106', vidro: 'VID-001',
        chapa: 'CHA-001', objeto_alto: true, valor_calculado: 313.6, consumo_m: 3.226
      })
    ]
  }],
  compras_pendentes: [{
    id: 'CMP-0001', data: '', moldura: 'D-103', nome: 'Clássica dourada', marca: 'Artmold',
    metros_faltando: 1.5, orcamento_id: 'ORC-0001', cliente: 'Cliente de teste'
  }],
  atendentes: [],
  oficina: [
    ordemDemo({
      id: 'OS-014', ref_app: 'orc-demo-orcamento-0001', cliente: 'Carla Mendes', telefone: '11955554444',
      descricao: '20 x 30, 30 x 40 com paspatur e tela 50 x 70', prazo: '31/10/2026', valor: 385,
      data_criacao: '2026-10-24T14:00:00.000Z',
      fotos: [
        { url: fotoDemo('20 x 30', '#e3e8f1'), quadro: 1 },
        { url: fotoDemo('30 x 40', '#f3e9c6'), quadro: 2 },
        { url: fotoDemo('Tela 50 x 70', '#e6f4ed'), quadro: 3 }
      ],
      quadros: [
        quadroDemo({
          largura_cm: 20, altura_cm: 30, moldura: 'D-101', vidro: 'VID-001', chapa: 'CHA-001', valor_calculado: 62,
          descricao: 'Foto da formatura da filha. Pendurar na vertical.'
        }),
        quadroDemo({
          largura_cm: 30, altura_cm: 40, paspatur_cm: 5, moldura: 'D-103', vidro: 'VID-002', chapa: 'CHA-001', objeto_alto: true,
          valor_calculado: 148, descricao: 'Certificado do curso. Paspatur branco, centralizar bem.'
        }),
        quadroDemo({
          largura_cm: 50, altura_cm: 70, moldura: 'D-110', valor_calculado: 175,
          servicos: [{ descricao: 'Esticar a tela', valor: 0 }],
          descricao: 'Tela pintada pela cliente. Sem vidro, só a moldura.'
        })
      ]
    }),
    ordemDemo({
      id: 'OS-015', ref_app: 'demo-os-15', cliente: 'Paulo Lima', telefone: '11944443333',
      descricao: '2x 20 x 30, moldura Lisa preta 2 cm, Vidro simples', prazo: '10/11/2026', valor: 176.8,
      status: 'acabamento', data_criacao: '2026-11-01T11:30:00.000Z'
    }),
    ordemDemo({
      id: 'OS-013', ref_app: 'demo-os-13', cliente: 'Rita Alves', telefone: '11933332222',
      descricao: 'Espelho 60 x 90 com moldura Provençal branca', prazo: '01/11/2026', valor: 540, status: 'pronto',
      aviso: 'enviado', data_criacao: '2026-10-20T09:10:00.000Z', data_pronto: '2026-11-01T16:00:00.000Z'
    })
  ]
};

const HISTORICO_DEMO = [
  ordemDemo({ id: 'OS-012', cliente: 'Escola Arco-Íris', descricao: '10x 30 x 40 diplomas', prazo: '25/10/2026', valor: 980, status: 'entregue', data_criacao: '2026-10-15T10:00:00.000Z' }),
  ordemDemo({ id: 'OS-011', cliente: 'Galeria Norte', descricao: 'Reforma de 3 telas', prazo: '20/10/2026', valor: 450, status: 'entregue', data_criacao: '2026-10-08T15:00:00.000Z' }),
  ordemDemo({ id: 'OS-010', cliente: 'Luiz Prado', descricao: 'Camiseta M emoldurada', prazo: '05/10/2026', valor: 310, status: 'entregue', data_criacao: '2026-09-28T13:00:00.000Z' })
];

function ordemDemo(mudar) {
  return {
    id: '', ref_app: '', cliente: '', telefone: '', descricao: '', prazo: '', valor: 0, status: 'em_producao', aviso: '',
    data_criacao: '', data_pronto: '', data_entrega: '', fotos: [], quadros: [], ...mudar
  };
}

export function criarApiDemo() {
  let pacote = PACOTE_DEMO;
  let proximoOrcamento = 3;
  let proximaCompra = 2;
  let proximaOrdem = 16;
  const financeiro = criarFinanceiroDemo();
  const historico = [...HISTORICO_DEMO];
  const ordemDe = (d) => (pacote.oficina || []).find((o) => (d.id && o.id === d.id) || (d.ref_app && o.ref_app === d.ref_app));
  const novaOrdem = () => 'OS-' + String(proximaOrdem++).padStart(3, '0');
  const espera = () => new Promise((r) => setTimeout(r, 400));
  const numero = (prefixo, n) => prefixo + '-' + String(n).padStart(4, '0');
  function resultadoDe(op) {
    const d = op.dados || {};
    const hoje = textoData(new Date());
    if (op.acao === 'criarOrdem') return { id: novaOrdem() };
    if (op.acao === 'marcarEntregue') {
      const o = ordemDe(d);
      if (!o) return {};
      historico.unshift({ ...o, status: 'entregue', data_entrega: new Date().toISOString() });
      return { id: o.id, lancado: financeiro.entradaDaOficina(o, hoje) };
    }
    if (op.acao === 'lancarGasto') return financeiro.lancarGasto(d);
    if (op.acao === 'lancarVenda') return financeiro.lancarVenda(d);
    if (op.acao === 'ajustarSaldos') return financeiro.ajustarSaldos(d, hoje);
    if (op.acao !== 'salvarOrcamento' && op.acao !== 'fecharVenda') return {};
    const aberto = pacote.orcamentos_abertos.find((o) => o.ref_app === d.ref_app);
    const id = aberto && aberto.id ? aberto.id : numero('ORC', proximoOrcamento++);
    if (op.acao === 'salvarOrcamento') return { id };
    const consumos = consumoPorMoldura(quadrosDoPedido(d).map((q) => ({ moldura: q.moldura, consumo: q.consumo_m })));
    const molduras = consumos.map((c) => {
      const mold = pacote.molduras.find((m) => m.codigo === c.codigo);
      const plano = planejarBaixaMoldura(mold ? mold.estoque_m : 0, c.metros);
      return {
        codigo: c.codigo, baixa_m: plano.baixa, falta_m: plano.falta, novo_estoque_m: plano.novo_estoque,
        compra_id: plano.falta > 0 ? numero('CMP', proximaCompra++) : ''
      };
    });
    const valor_final = Number(d.valor_final) > 0 ? Number(d.valor_final) : Number(d.valor_calculado) || 0;
    return { id, valor_final, molduras, ordem_id: d.oficina ? novaOrdem() : '' };
  }
  return {
    async buscarPacote() {
      await espera();
      return { tipo: 'ok', dados: pacote };
    },
    async buscarHistoricoOficina(mes) {
      await espera();
      const ativas = (pacote.oficina || []).filter((o) => !historico.some((h) => h.id && h.id === o.id));
      const ordens = [...ativas, ...historico].filter((o) => String(o.data_criacao).slice(0, 7) === mes);
      return {
        tipo: 'ok',
        dados: {
          mes,
          ordens,
          resumo: {
            quantidade: ordens.length,
            total: Number(ordens.reduce((t, o) => t + (Number(o.valor) || 0), 0).toFixed(2)),
            entregues: ordens.filter((o) => o.status === 'entregue').length
          }
        }
      };
    },
    async buscarFinanceiro(filtros) {
      await espera();
      return financeiro.ler(filtros);
    },
    async enviar(op) {
      await espera();
      const resultado = resultadoDe(op);
      pacote = aplicarOperacao(pacote, op, resultado);
      return { tipo: 'ok', resultado, repetida: false };
    }
  };
}
