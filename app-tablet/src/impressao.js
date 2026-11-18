import { formatarReais, momentoDe } from './formato';
import { linhasDoQuadro } from './whatsapp';
import { lerData, textoData, tituloDoQuadro, detalhesDoQuadro, fotosDoQuadro, acrescimoDoQuadro } from './oficina';

export const FORMATOS = [
  { valor: 'a4', titulo: 'Folha A4', largura: 595, altura: 842 },
  { valor: 'cupom80', titulo: 'Cupom 80 mm', largura: 227, fonte: 9, colunas: 36 },
  { valor: 'cupom58', titulo: 'Cupom 58 mm', largura: 164, fonte: 8, colunas: 26 }
];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const formatoDe = (valor) => FORMATOS.find((f) => f.valor === valor) || FORMATOS[0];
const limpo = (t) => String(t == null ? '' : t).trim();
const dataDe = (texto) => {
  const ms = momentoDe(texto);
  return ms ? textoData(new Date(ms)) : '';
};
export function telefoneDoPapel(t) {
  const bruto = limpo(t);
  let d = bruto.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return bruto;
}

const contatoDa = (loja) => [limpo(loja && loja.telefone), limpo(loja && loja.endereco)].filter(Boolean);
const nomeDa = (loja) => limpo(loja && loja.nome) || 'Vera Molduras';

function modeloOrcamento(d) {
  const quadros = d.quadros || [];
  const varios = quadros.length > 1;
  return {
    tipo: 'ORÇAMENTO',
    titulo: 'Orçamento',
    numero: limpo(d.numero),
    data: d.quando ? textoData(d.quando) : '',
    campos: [['Cliente', limpo(d.cliente)], ['WhatsApp', telefoneDoPapel(d.telefone)]].filter((c) => c[1]),
    itens: quadros.map((q, i) => {
      const [titulo, ...linhas] = linhasDoQuadro(q, varios, d.ajustado);
      const valor = varios && !d.ajustado ? formatarReais(q.valor_total) : '';
      return {
        n: varios ? i + 1 : 0,
        titulo,
        linhas,
        valor,
        cada: valor && q.quantidade > 1 ? formatarReais(q.valor_unitario) + ' cada' : ''
      };
    }),
    total: formatarReais(d.total)
  };
}

function modeloOrdem(pacote, o, fotos) {
  const quadros = o.quadros || [];
  const prazo = lerData(o.prazo);
  const blocos = quadros.length
    ? quadros.map((q, i) => ({
      titulo: tituloDoQuadro(q, i, quadros.length),
      descricao: limpo(q.descricao),
      acrescimo: acrescimoDoQuadro(q),
      detalhes: detalhesDoQuadro(pacote, q),
      foto: (fotos && fotos[i + 1]) || ''
    }))
    : [{ titulo: 'Serviço', descricao: limpo(o.descricao) || 'Sem descrição.', acrescimo: null, detalhes: [], foto: (fotos && fotos[0]) || '' }];
  return {
    tipo: 'ORDEM DE SERVIÇO',
    titulo: 'Ordem',
    numero: limpo(o.id),
    campos: [
      ['Cliente', limpo(o.cliente) || 'Cliente sem nome'],
      ['WhatsApp', telefoneDoPapel(o.telefone)],
      ['Criada em', dataDe(o.data_criacao)],
      ['Valor', Number(o.valor) > 0 ? formatarReais(o.valor) : '']
    ].filter((c) => c[1]),
    prazo: prazo ? { data: textoData(prazo), dia: DIAS[prazo.getDay()] } : null,
    blocos
  };
}

const CSS_A4 = `
@page { margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: Helvetica, Arial, sans-serif; color: #1f2933; font-size: 10.5pt; line-height: 1.4; }
.topo { display: flex; justify-content: space-between; align-items: flex-end; gap: 16pt; padding-bottom: 9pt; border-bottom: 2.5pt solid #13294b; }
.filete { height: 1.5pt; background: #c9a227; margin-top: 2pt; }
.nome { font-family: Georgia, 'Times New Roman', serif; font-size: 22pt; font-weight: bold; color: #13294b; }
.contato { font-size: 9.5pt; color: #5b6472; margin-top: 2pt; }
.doc { text-align: right; }
.tipo { font-size: 9pt; font-weight: bold; letter-spacing: 2pt; color: #7a5c0e; }
.num { font-size: 18pt; font-weight: bold; color: #13294b; }
.data { font-size: 9.5pt; color: #5b6472; }
.campos { display: flex; flex-wrap: wrap; gap: 8pt 28pt; margin: 14pt 0; }
.rot { display: block; font-size: 8pt; font-weight: bold; letter-spacing: 1pt; text-transform: uppercase; color: #5b6472; }
.campo b { font-size: 12pt; }
.itens { border-top: 1pt solid #d8d3c4; }
.item { display: flex; gap: 12pt; padding: 10pt 0; border-bottom: 1pt solid #ebe6d8; break-inside: avoid; page-break-inside: avoid; }
.n { flex: none; width: 20pt; height: 20pt; border: 1.5pt solid #13294b; border-radius: 10pt; color: #13294b; font-weight: bold; font-size: 10pt; text-align: center; line-height: 17pt; }
.corpo { flex: 1; min-width: 0; }
.titulo { font-weight: bold; font-size: 12pt; color: #13294b; }
.valor { text-align: right; font-weight: bold; font-size: 12pt; white-space: nowrap; }
.valor small { display: block; font-weight: normal; font-size: 9pt; color: #5b6472; }
.total { display: flex; justify-content: space-between; align-items: center; margin-top: 16pt; padding: 10pt 16pt; border: 2pt solid #13294b; border-left: 7pt solid #c9a227; border-radius: 6pt; color: #13294b; break-inside: avoid; }
.total span { font-size: 11pt; font-weight: bold; letter-spacing: 2pt; }
.total b { font-size: 20pt; }
.ficha { display: flex; gap: 16pt; margin: 14pt 0 4pt; align-items: stretch; }
.ficha .campos { flex: 1; margin: 0; display: grid; grid-template-columns: 1fr 1fr; }
.prazo { flex: none; min-width: 150pt; border: 2.5pt solid #13294b; border-radius: 6pt; padding: 8pt 12pt; text-align: center; color: #13294b; }
.prazo b { display: block; font-size: 20pt; }
.prazo small { font-size: 10pt; color: #1f2933; }
.quadro { border: 1pt solid #d8d3c4; border-radius: 6pt; padding: 10pt 12pt; margin-top: 12pt; break-inside: avoid; page-break-inside: avoid; }
.cab { display: flex; justify-content: space-between; align-items: center; gap: 10pt; border-bottom: 1pt solid #ebe6d8; padding-bottom: 6pt; margin-bottom: 8pt; }
.cab h2 { margin: 0; font-size: 13pt; color: #13294b; }
.pronto { flex: none; display: flex; align-items: center; gap: 5pt; font-size: 10pt; font-weight: bold; }
.caixa { display: inline-block; width: 13pt; height: 13pt; border: 1.5pt solid #1f2933; border-radius: 2pt; }
.cresce { border: 2.5pt solid #b91c1c; border-left-width: 8pt; border-radius: 4pt; padding: 6pt 10pt; margin-bottom: 9pt; color: #991b1b; }
.cresce .rot { color: #b91c1c; letter-spacing: 1.5pt; }
.cresce b { display: block; font-size: 14pt; color: #1f2933; }
.cresce small { font-size: 10pt; color: #1f2933; }
.lado { display: flex; gap: 12pt; align-items: flex-start; }
.foto { flex: none; width: 130pt; max-height: 175pt; object-fit: cover; border-radius: 4pt; border: 1pt solid #d8d3c4; }
.info { flex: 1; min-width: 0; }
.descricao { border: 1pt solid #c9a227; border-left: 4pt solid #c9a227; border-radius: 4pt; padding: 6pt 9pt; margin-bottom: 8pt; }
.descricao .rot { color: #7a5c0e; }
.descricao p { margin: 0; font-size: 11pt; font-weight: bold; white-space: pre-wrap; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; width: 32%; font-size: 9pt; color: #5b6472; padding: 4pt 8pt 4pt 0; vertical-align: top; }
td { padding: 4pt 0; font-size: 10.5pt; font-weight: bold; vertical-align: top; }
tr + tr th, tr + tr td { border-top: 1pt solid #ebe6d8; }
td small { display: block; font-weight: normal; font-size: 9pt; color: #13294b; }
td.nao { font-weight: normal; color: #8a919c; }
`;

const cssCupom = (f) => `
@page { margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { padding: 6pt 5pt 10pt; font-family: Arial, Helvetica, sans-serif; font-size: ${f.fonte}pt; line-height: 1.35; color: #000; }
.c { text-align: center; }
.loja { font-size: 1.35em; font-weight: bold; }
.tipo { font-weight: bold; letter-spacing: 1pt; }
.num { font-size: 1.6em; font-weight: bold; }
.b { font-weight: bold; }
.dir { text-align: right; font-weight: bold; }
.peq { font-size: 0.9em; padding-left: 6pt; }
.esp { height: 5pt; }
hr { border: 0; border-top: 1pt dashed #000; margin: 5pt 0; }
.total { display: flex; justify-content: space-between; font-size: 1.45em; font-weight: bold; }
.prazo { border: 1.5pt solid #000; padding: 3pt; margin: 5pt 0 2pt; text-align: center; font-size: 1.45em; font-weight: bold; }
.desc { border: 1pt solid #000; padding: 3pt 4pt; margin: 3pt 0; font-weight: bold; white-space: pre-wrap; }
.caixa { display: inline-block; width: 1em; height: 1em; border: 1pt solid #000; vertical-align: -0.15em; margin-right: 3pt; }
.cresce { border: 2.5pt solid #000; padding: 3pt 4pt; margin: 4pt 0; }
.cresce .rot { font-weight: bold; letter-spacing: 1pt; text-align: center; }
.cresce b { display: block; font-size: 1.2em; }
`;

const pagina = (titulo, css, corpo) => '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(titulo)
  + '</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style></head><body>'
  + corpo + '</body></html>';

const tituloDoPapel = (m) => [m.titulo, m.numero, m.campos.length ? m.campos[0][1] : ''].filter(Boolean).join(' ');

function topoA4(m, loja, extra) {
  const contato = contatoDa(loja);
  return '<header><div class="topo"><div><div class="nome">' + esc(nomeDa(loja)) + '</div>'
    + (contato.length ? '<div class="contato">' + contato.map(esc).join(' · ') + '</div>' : '')
    + '</div><div class="doc"><div class="tipo">' + m.tipo + '</div>'
    + (m.numero ? '<div class="num">' + esc(m.numero) + '</div>' : '')
    + (extra || '') + '</div></div><div class="filete"></div></header>';
}

const camposA4 = (campos) => '<div class="campos">' + campos.map((c) => (
  '<div class="campo"><span class="rot">' + c[0] + '</span><b>' + esc(c[1]) + '</b></div>'
)).join('') + '</div>';

function orcamentoA4(m, loja) {
  const itens = m.itens.map((it) => '<div class="item">'
    + (it.n ? '<div class="n">' + it.n + '</div>' : '')
    + '<div class="corpo"><div class="titulo">' + esc(it.titulo) + '</div>'
    + it.linhas.map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>'
    + (it.valor ? '<div class="valor">' + it.valor + (it.cada ? '<small>' + it.cada + '</small>' : '') + '</div>' : '')
    + '</div>').join('');
  return topoA4(m, loja, m.data ? '<div class="data">' + m.data + '</div>' : '')
    + camposA4(m.campos)
    + '<section class="itens">' + itens + '</section>'
    + '<div class="total"><span>TOTAL</span><b>' + m.total + '</b></div>';
}

function linhaDeMaterial(d) {
  return '<tr><th>' + esc(d.rotulo) + '</th><td' + (d.nao ? ' class="nao"' : '') + '>' + esc(d.valor)
    + (d.detalhe ? '<small>' + esc(d.detalhe) + '</small>' : '') + '</td></tr>';
}

function ordemA4(m, loja) {
  const prazo = '<div class="prazo"><span class="rot">PRAZO</span>'
    + (m.prazo ? '<b>' + m.prazo.data + '</b><small>' + m.prazo.dia + '</small>' : '<b>Sem prazo</b>') + '</div>';
  const blocos = m.blocos.map((b) => '<section class="quadro"><div class="cab"><h2>' + esc(b.titulo) + '</h2>'
    + '<div class="pronto"><span class="caixa"></span>pronto</div></div>'
    + (b.acrescimo ? '<div class="cresce"><span class="rot">O QUADRO CRESCE</span><b>' + esc(b.acrescimo.cortar) + '</b><small>'
      + esc(b.acrescimo.conta) + '</small></div>' : '')
    + '<div class="lado">'
    + (b.foto ? '<img class="foto" src="' + esc(b.foto) + '" alt="" onerror="this.remove()">' : '')
    + '<div class="info">'
    + (b.descricao ? '<div class="descricao"><span class="rot">Descrição</span><p>' + esc(b.descricao) + '</p></div>' : '')
    + (b.detalhes.length ? '<table>' + b.detalhes.map(linhaDeMaterial).join('') + '</table>' : '')
    + '</div></div></section>').join('');
  return topoA4(m, loja) + '<div class="ficha">' + camposA4(m.campos) + prazo + '</div>' + blocos;
}

function criarCupom(f) {
  const partes = [];
  let linhas = 0;
  const conta = (t, escala) => Math.max(1, Math.ceil((String(t).length * escala) / f.colunas)) * escala;
  return {
    linha(t, classe = '', escala = 1, extra = 0) {
      if (!t) return;
      partes.push('<div' + (classe ? ' class="' + classe + '"' : '') + '>' + esc(t) + '</div>');
      linhas += conta(t, escala) + extra;
    },
    bruto(html, quantas) {
      partes.push(html);
      linhas += quantas;
    },
    sep() {
      partes.push('<hr>');
      linhas += 1;
    },
    fim() {
      return { corpo: partes.join(''), altura: Math.ceil((linhas * f.fonte * 1.35 + 40) * 1.1) };
    }
  };
}

function topoCupom(c, m, loja) {
  c.linha(nomeDa(loja), 'c loja', 1.35);
  contatoDa(loja).forEach((t) => c.linha(t, 'c'));
  c.sep();
  c.linha(m.tipo, 'c tipo');
  c.linha(m.numero, 'c num', 1.6);
  c.linha(m.data, 'c');
  c.sep();
  m.campos.forEach((x) => c.linha(x[0] + ': ' + x[1]));
}

function orcamentoCupom(m, loja, f) {
  const c = criarCupom(f);
  topoCupom(c, m, loja);
  c.sep();
  m.itens.forEach((it, i) => {
    if (i) c.bruto('<div class="esp"></div>', 0.4);
    c.linha((it.n ? it.n + ') ' : '') + it.titulo, 'b');
    it.linhas.forEach((l) => c.linha(l));
    c.linha(it.valor ? it.valor + (it.cada ? ' (' + it.cada + ')' : '') : '', 'dir');
  });
  c.sep();
  c.bruto('<div class="total"><span>TOTAL</span><span>' + m.total + '</span></div>', 1.45);
  return c.fim();
}

function ordemCupom(m, loja, f) {
  const c = criarCupom(f);
  topoCupom(c, m, loja);
  c.linha(m.prazo ? 'PRAZO ' + m.prazo.data + ' (' + m.prazo.dia + ')' : 'Sem prazo', 'prazo', 1.45, 0.8);
  m.blocos.forEach((b) => {
    c.sep();
    c.linha(b.titulo, 'b');
    c.bruto('<div><span class="caixa"></span>pronto</div>', 1);
    if (b.acrescimo) {
      c.bruto('<div class="cresce"><div class="rot">O QUADRO CRESCE</div><b>' + esc(b.acrescimo.cortar) + '</b><div>'
        + esc(b.acrescimo.conta) + '</div></div>', 1.5 + Math.ceil((b.acrescimo.cortar.length * 1.2) / f.colunas) * 1.2
        + Math.ceil(b.acrescimo.conta.length / f.colunas));
    }
    c.linha(b.descricao, 'desc', 1, 0.6);
    b.detalhes.forEach((d) => {
      c.linha(d.rotulo + ': ' + d.valor);
      c.linha(d.detalhe, 'peq', 0.9);
    });
  });
  return c.fim();
}

function montar(m, formato, loja, a4, cupom) {
  const f = formatoDe(formato);
  if (f.valor === 'a4') return { html: pagina(tituloDoPapel(m), CSS_A4, a4(m, loja)), width: f.largura, height: f.altura };
  const r = cupom(m, loja, f);
  return { html: pagina(tituloDoPapel(m), cssCupom(f), r.corpo), width: f.largura, height: Math.max(r.altura, 200) };
}

function comLimite(promessa, ms) {
  let relogio;
  const limite = new Promise((pronto) => {
    relogio = setTimeout(() => pronto(''), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(relogio));
}

export async function fotosParaOPapel(o, formato, converter, limite = 8000) {
  if (formatoDe(formato).valor !== 'a4' || !o) return {};
  const total = (o.quadros || []).length;
  const numeros = total ? Array.from({ length: total }, (_, i) => i + 1) : [0];
  const fotos = {};
  await Promise.all(numeros.map(async (n) => {
    const f = fotosDoQuadro(o, n)[0];
    if (!f || !f.url) return;
    fotos[n] = (await comLimite(converter(f.url), limite)) || f.url;
  }));
  return fotos;
}

export function papelOrcamento(d, formato, loja) {
  return montar(modeloOrcamento(d), formato, loja, orcamentoA4, orcamentoCupom);
}

export function papelOrdem(pacote, o, formato, loja, fotos) {
  return montar(modeloOrdem(pacote, o, fotos), formato, loja, ordemA4, ordemCupom);
}
