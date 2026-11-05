import {
  calcularOrcamento, medidaExterna, totaisOrcamentoApp, planejarBaixaMoldura, nomeCasinha, VARA_PADRAO_M,
  quadrosDoPedido, bordaDoQuadro, consumoPorMoldura, servicosDoQuadro
} from './gerado/nucleo';
import { formatarMetros } from './varas';
import { formatarNumero, lerNumero, momentoDe } from './formato';
import { semAcento } from './busca';

export const BORDAS_PASPATUR = [3, 4, 5, 7];
export const MARGEM_OBJETO_CM = 4;
export const TIPOS_QUADRO = [
  { valor: 'quadro', titulo: 'Quadro' },
  { valor: 'reforma', titulo: 'Reforma' },
  { valor: 'objeto', titulo: 'Objeto' }
];
const MATERIAIS = ['vidro', 'chapa', 'espelho'];

let contador = 0;
function novaChave() {
  contador += 1;
  return 'q' + contador;
}

export function moldurasDoOrcamento(pacote) {
  return (pacote.molduras || []).filter((m) => m.disponivel && Number(m.preco_m) > 0);
}

export function materiaisDe(pacote, categoria) {
  return (pacote.materiais || []).filter((m) => m.categoria === categoria && m.disponivel !== false && Number(m.preco) > 0);
}

export function nomeMaterial(pacote, codigo) {
  const m = (pacote.materiais || []).find((x) => String(x.codigo) === String(codigo));
  return m ? m.nome : '';
}

function maisBarato(pacote, categoria) {
  const lista = pacote ? materiaisDe(pacote, categoria) : [];
  if (!lista.length) return '';
  return String(lista.reduce((a, b) => (Number(b.preco) < Number(a.preco) ? b : a)).codigo);
}

export function servicoVazio() {
  return { chave: novaChave(), descricao: '', valor: '' };
}

export function quadroVazio(tipo = 'quadro', pacote) {
  const q = {
    chave: novaChave(), tipo, largura: '', altura: '', margem: '', margem_outra: false, quantidade: 1, paspatur: '',
    borda_outra: false, moldura: '', vidro: '', chapa: '', espelho: '', vidro_duplo: false, objeto_alto: false, servicos: []
  };
  if (tipo !== 'objeto') return q;
  return {
    ...q, margem: String(MARGEM_OBJETO_CM), objeto_alto: true,
    vidro: maisBarato(pacote, 'vidro'), chapa: maisBarato(pacote, 'chapa')
  };
}

export function duplicarQuadro(q) {
  return { ...q, chave: novaChave(), servicos: (q.servicos || []).map((s) => ({ ...s, chave: novaChave() })) };
}

export function trocarTipo(q, tipo, pacote) {
  if (q.tipo === tipo) return q;
  if (tipo === 'objeto') {
    return {
      ...q, tipo, paspatur: '', borda_outra: false, margem: String(MARGEM_OBJETO_CM), margem_outra: false, objeto_alto: true,
      vidro_duplo: false, espelho: '', vidro: q.vidro || maisBarato(pacote, 'vidro'), chapa: q.chapa || maisBarato(pacote, 'chapa')
    };
  }
  if (q.tipo === 'objeto') return { ...q, tipo, margem: '', margem_outra: false, objeto_alto: false };
  return { ...q, tipo };
}

const SEM_MARGEM = { margem: '', margem_outra: false };

export function mudarQuadro(q, campos) {
  const novo = { ...q, ...campos };
  if (campos.vidro_duplo) return { ...novo, ...SEM_MARGEM, paspatur: '', borda_outra: false, objeto_alto: false };
  if ('vidro_duplo' in campos && q.tipo !== 'objeto') return { ...novo, ...SEM_MARGEM };
  if ('paspatur' in campos && lerNumero(campos.paspatur) !== 0) return { ...novo, ...SEM_MARGEM, vidro_duplo: false };
  return novo;
}

const NOMES_TIPO = { quadro: 'Quadro', reforma: 'Reforma', objeto: 'Objeto' };

export function rotuloQuadro(q) {
  const l = lerNumero(q.largura);
  const a = lerNumero(q.altura);
  const medida = l > 0 && a > 0 ? formatarNumero(l) + ' x ' + formatarNumero(a) : '';
  return (NOMES_TIPO[q.tipo] || 'Quadro') + (medida ? ' ' + medida : '');
}

export function orcamentoVazio(ref) {
  return { ref_app: ref, cliente: '', telefone: '', valor_final: '', obs: '', quadros: [quadroVazio('quadro')] };
}

const numeroOuVazio = (n) => (Number(n) > 0 ? formatarNumero(n) : '');

function tipoSalvo(t) {
  if (t === 'camiseta') return 'objeto';
  return t === 'reforma' || t === 'objeto' ? t : 'quadro';
}

function deQuadroSalvo(x) {
  const tipo = tipoSalvo(x.tipo);
  return {
    chave: novaChave(),
    tipo,
    largura: numeroOuVazio(x.largura_cm),
    altura: numeroOuVazio(x.altura_cm),
    margem: tipo === 'objeto' ? formatarNumero(Number(x.margem_cm) || 0) : x.vidro_duplo ? numeroOuVazio(x.margem_cm) : '',
    margem_outra: tipo !== 'objeto' && !!x.vidro_duplo && Number(x.margem_cm) > 0 && !BORDAS_PASPATUR.includes(Number(x.margem_cm)),
    quantidade: Math.max(1, Math.round(Number(x.quantidade) || 1)),
    paspatur: numeroOuVazio(x.paspatur_cm),
    borda_outra: Number(x.paspatur_cm) > 0 && !BORDAS_PASPATUR.includes(Number(x.paspatur_cm)),
    moldura: String(x.moldura || ''),
    vidro: String(x.vidro || ''),
    chapa: String(x.chapa || ''),
    espelho: String(x.espelho || ''),
    vidro_duplo: !!x.vidro_duplo,
    objeto_alto: !!x.objeto_alto,
    servicos: servicosDoQuadro(x.servicos).map((s) => ({ ...servicoVazio(), descricao: s.descricao, valor: numeroOuVazio(s.valor) }))
  };
}

export function deAberto(o) {
  const final = Number(o.valor_final) || 0;
  const ajustado = final > 0 && Math.abs(final - (Number(o.valor_calculado) || 0)) >= 0.005;
  const salvos = o.quadros && o.quadros.length ? o.quadros : quadrosDoPedido(o);
  return {
    ref_app: String(o.ref_app),
    cliente: String(o.cliente || ''),
    telefone: String(o.telefone || ''),
    valor_final: ajustado ? formatarNumero(final) : '',
    obs: String(o.obs || ''),
    quadros: salvos.map(deQuadroSalvo)
  };
}

export function filtrarAbertos(abertos, termo) {
  const alvo = semAcento(termo);
  const digitos = alvo.replace(/\D/g, '');
  const lista = (abertos || []).filter((o) => {
    if (!alvo) return true;
    if (semAcento(o.cliente).includes(alvo) || semAcento(o.id).includes(alvo)) return true;
    return digitos.length >= 4 && String(o.telefone || '').replace(/\D/g, '').includes(digitos);
  });
  return lista.sort((a, b) => momentoDe(b.data_criacao) - momentoDe(a.data_criacao));
}

function erroDeMedida(tipo) {
  if (tipo === 'objeto') return 'Informe a medida do objeto.';
  if (tipo === 'reforma') return 'Pra trocar material, informe a largura e a altura.';
  return 'Informe a largura e a altura da foto.';
}

function lerServicos(lista) {
  const out = [];
  for (const s of lista || []) {
    const descricao = String(s.descricao || '').trim();
    const valor = lerNumero(s.valor);
    if (Number.isNaN(valor)) return { erro: 'O valor do serviço ' + (descricao ? descricao + ' ' : '') + 'não é um número.' };
    out.push({ descricao, valor });
  }
  return { lista: servicosDoQuadro(out) };
}

export function calcularQuadro(pacote, q) {
  const largura = lerNumero(q.largura);
  const altura = lerNumero(q.altura);
  const temMedida = largura > 0 && altura > 0;
  const reforma = q.tipo === 'reforma';
  if (!reforma && !temMedida) return { ok: false, erro: erroDeMedida(q.tipo) };
  const usaMargem = q.tipo === 'objeto' || !!q.vidro_duplo;
  if (Number.isNaN(lerNumero(usaMargem ? q.margem : q.paspatur))) {
    return { ok: false, erro: usaMargem ? 'A borda não é um número.' : 'A borda do paspatur não é um número.' };
  }
  const borda = bordaDoQuadro({
    tipo: q.tipo, vidro_duplo: !!q.vidro_duplo, paspatur_cm: lerNumero(q.paspatur), margem_cm: lerNumero(q.margem)
  });
  const servicos = lerServicos(q.servicos);
  if (servicos.erro) return { ok: false, erro: servicos.erro };
  const itens = [];
  let moldura = null;
  if (q.moldura) {
    moldura = (pacote.molduras || []).find((m) => m.codigo === String(q.moldura)) || null;
    if (!moldura) return { ok: false, erro: 'A moldura ' + q.moldura + ' não está mais no catálogo.' };
    itens.push({ categoria: 'moldura', nome: moldura.nome, preco: Number(moldura.preco_m), perfilCm: Number(moldura.perfil_cm) || 0 });
  }
  for (const categoria of MATERIAIS) {
    const codigo = q[categoria];
    if (!codigo || (categoria === 'chapa' && q.vidro_duplo)) continue;
    const mat = (pacote.materiais || []).find((m) => m.categoria === categoria && String(m.codigo) === String(codigo));
    if (!mat) return { ok: false, erro: 'O item ' + codigo + ' não está mais no catálogo.' };
    itens.push({ categoria, nome: mat.nome, preco: Number(mat.preco), perfilCm: 0 });
  }
  if (!reforma && !itens.length) return { ok: false, erro: 'Escolha pelo menos a moldura, o vidro, o fundo ou o espelho.' };
  if (reforma && !temMedida && (itens.length || borda.paspatur)) return { ok: false, erro: erroDeMedida(q.tipo) };
  const externa = temMedida ? medidaExterna(largura, altura, borda.cm) : { largura: 0, altura: 0 };
  const orc = calcularOrcamento(externa.largura, externa.altura, itens, {
    objetoAlto: !!q.objeto_alto,
    vidroDuplo: !!q.vidro_duplo,
    paspatur: borda.paspatur,
    paspaturPrecoM2: borda.paspatur ? Number(pacote.paspatur_m2) || 0 : 0,
    siliconePrecoM2: q.vidro_duplo ? Number(pacote.silicone_m2) || 0 : 0
  });
  return {
    ok: true, tipo: q.tipo, largura: temMedida ? largura : 0, altura: temMedida ? altura : 0, externa, moldura,
    borda: borda.paspatur ? borda.cm : 0,
    margem: borda.paspatur ? 0 : borda.cm,
    calc: totaisOrcamentoApp(orc, q.quantidade, servicos.lista)
  };
}

export function calcularPedido(pacote, f) {
  const quadros = f.quadros.map((q) => calcularQuadro(pacote, q));
  const errado = quadros.findIndex((r) => !r.ok);
  let total = 0;
  let quantidade = 0;
  quadros.forEach((r) => {
    if (!r.ok) return;
    total += r.calc.valor_total;
    quantidade += r.calc.quantidade;
  });
  const valorTotal = Number(total.toFixed(2));
  const digitado = lerNumero(f.valor_final);
  return {
    ok: errado < 0,
    erro: errado < 0 ? '' : (quadros.length > 1 ? 'Quadro ' + (errado + 1) + ': ' : '') + quadros[errado].erro,
    quadros,
    quantidade,
    valor_total: valorTotal,
    valor_final: digitado > 0 ? Number(digitado.toFixed(2)) : valorTotal,
    molduras: consumoPorMoldura(f.quadros.map((q, i) => (quadros[i].ok
      ? { moldura: q.moldura, consumo: quadros[i].calc.consumo_moldura_m }
      : { moldura: '' })))
  };
}

export function avisoMoldura(moldura, consumoM) {
  if (!moldura) return null;
  const precisa = Math.max(0, Number(consumoM) || 0);
  const tem = Math.max(0, Number(moldura.estoque_m) || 0);
  const plano = planejarBaixaMoldura(tem, precisa);
  const varas = Math.ceil(precisa / VARA_PADRAO_M - 1e-9);
  const pedido = 'Precisa de ' + formatarMetros(precisa) + ' (' + (varas === 1 ? '1 vara' : varas + ' varas') + '), tem ' + formatarMetros(tem);
  const sobra = Number((tem - precisa).toFixed(3));
  let cor = 'verde';
  let titulo = 'Tem moldura';
  let texto = pedido + '.';
  if (plano.falta > 0) {
    cor = 'vermelho';
    titulo = 'Não dá';
    texto = pedido + ', faltam ' + formatarMetros(plano.falta) + '.';
  } else if (sobra < VARA_PADRAO_M) {
    cor = 'amarelo';
    titulo = 'Dá, mas fica no fim';
    texto = pedido + '. Sobram ' + formatarMetros(sobra) + '.';
  }
  return {
    cor, titulo, texto,
    lugar: moldura.local ? 'Fica em: ' + nomeCasinha(moldura.local) : 'Ainda sem casinha',
    naoConferida: !moldura.local,
    baixa: plano.baixa,
    falta: plano.falta
  };
}

export function avisosDoPedido(pacote, f, rr) {
  const avisos = new Map();
  rr.molduras.forEach((c) => {
    const moldura = (pacote.molduras || []).find((m) => m.codigo === c.codigo);
    const aviso = avisoMoldura(moldura, c.metros);
    if (!aviso) return;
    const quadros = f.quadros.map((q, i) => (String(q.moldura) === c.codigo ? i + 1 : 0)).filter(Boolean);
    avisos.set(c.codigo, { ...aviso, moldura, quadros });
  });
  return avisos;
}

function quadroParaApi(q, r) {
  return {
    tipo: q.tipo,
    largura_cm: r.largura,
    altura_cm: r.altura,
    margem_cm: r.margem,
    quantidade: r.calc.quantidade,
    paspatur_cm: r.borda,
    moldura: q.moldura || '',
    vidro: q.vidro || '',
    chapa: q.vidro_duplo ? '' : q.chapa || '',
    espelho: q.espelho || '',
    vidro_duplo: !!q.vidro_duplo,
    objeto_alto: !!q.objeto_alto,
    valor_calculado: r.calc.valor_total,
    consumo_m: r.calc.consumo_moldura_m,
    servicos: r.calc.servicos
  };
}

export function dadosParaApi(f, rr) {
  const digitado = lerNumero(f.valor_final);
  const consumo = rr.molduras.reduce((s, m) => s + m.metros, 0);
  return {
    ref_app: f.ref_app,
    cliente: String(f.cliente || '').trim(),
    telefone: String(f.telefone || '').trim(),
    valor_final: digitado > 0 ? Number(digitado.toFixed(2)) : 0,
    valor_calculado: rr.valor_total,
    consumo_m: Number(consumo.toFixed(3)),
    obs: String(f.obs || '').trim(),
    quadros: f.quadros.map((q, i) => quadroParaApi(q, rr.quadros[i]))
  };
}

export function dadosDoTexto(pacote, f, rr) {
  return {
    cliente: f.cliente,
    ajustado: Math.abs(rr.valor_final - rr.valor_total) >= 0.005,
    total: rr.valor_final,
    quadros: f.quadros.map((q, i) => {
      const r = rr.quadros[i];
      return {
        tipo: q.tipo,
        largura: r.largura,
        altura: r.altura,
        borda: r.borda,
        margem: r.margem,
        externa: r.externa,
        quantidade: r.calc.quantidade,
        moldura: r.moldura ? r.moldura.nome : '',
        vidro: q.vidro ? nomeMaterial(pacote, q.vidro) : '',
        vidro_duplo: !!q.vidro_duplo,
        fundo: q.chapa && !q.vidro_duplo ? nomeMaterial(pacote, q.chapa) : '',
        espelho: q.espelho ? nomeMaterial(pacote, q.espelho) : '',
        valor_total: r.calc.valor_total,
        valor_unitario: r.calc.valor_unitario,
        servicos: r.calc.servicos
      };
    })
  };
}
