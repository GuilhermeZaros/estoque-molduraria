import { lerValor, formatarNumero } from './formato';
import { rotuloQuadro, nomeMaterial } from './orcamento';
import { nomeCasinha, bordaDoQuadro, medidaExterna } from './gerado/nucleo';

export const PRAZOS = [
  { dias: 0, titulo: 'Hoje' },
  { dias: 1, titulo: 'Amanhã' },
  { dias: 3, titulo: '3 dias' },
  { dias: 7, titulo: '7 dias' },
  { dias: 15, titulo: '15 dias' }
];

const p2 = (n) => String(n).padStart(2, '0');

export function textoData(d) {
  return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear();
}

export function prazoDe(dias, hoje = new Date()) {
  return textoData(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias));
}

export function lerData(texto) {
  const m = String(texto == null ? '' : texto).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
}

export function prazoVencido(prazo, hoje = new Date()) {
  const d = lerData(prazo);
  return !!d && d < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
}

export function textoPrazo(prazo, hoje = new Date()) {
  const d = lerData(prazo);
  if (!d) return 'Sem prazo';
  const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((d - dia) / 86400000);
  if (dias < 0) return 'Atrasada desde ' + textoData(d);
  if (dias === 0) return 'Prazo: hoje';
  if (dias === 1) return 'Prazo: amanhã';
  return 'Prazo: ' + textoData(d);
}

export function ordenarProducao(lista) {
  const chave = (o) => {
    const d = lerData(o.prazo);
    return d ? d.getTime() : Infinity;
  };
  return [...(lista || [])].sort((a, b) => chave(a) - chave(b));
}

export function textoAviso(o) {
  if (o.aviso === 'enviado') return { texto: 'A Julia já avisou o cliente no WhatsApp.', alerta: false };
  if (o.aviso === 'falha') return { texto: 'A Julia não conseguiu avisar. Ligue pro cliente.', alerta: true };
  if (!String(o.telefone || '').trim()) return { texto: 'Sem WhatsApp na ordem. Avise o cliente por telefone.', alerta: true };
  return { texto: 'A Julia vai avisar o cliente no WhatsApp.', alerta: false };
}

export const STATUS_ORDEM = { em_producao: 'Em produção', acabamento: 'Falta acabamento', pronto: 'Pronto', entregue: 'Entregue' };

export const LIMITE_FOTOS = 5;

export function fotosDaOrdem(o) {
  return ((o && o.fotos) || []).map((f) => (typeof f === 'string'
    ? { ref: '', url: f, quadro: 0 }
    : { ref: f.ref || '', url: f.url || '', quadro: Number(f.quadro) || 0 }));
}

export function fotosDoQuadro(o, n) {
  return fotosDaOrdem(o).filter((f) => f.quadro === n);
}

export function dadosDaFoto(o, quadro, ref) {
  return { ...alvoDaOrdem(o), cliente: o.cliente || '', foto_ref: ref, quadro };
}

export function dadosDeTirarFoto(o, f) {
  return { ...alvoDaOrdem(o), cliente: o.cliente || '', foto_url: f.url, foto_ref: f.ref };
}

const TIPOS_DA_OFICINA = { reforma: 'Reforma', objeto: 'Objeto', camiseta: 'Objeto' };

export function tituloDoQuadro(q, i, total) {
  const l = Number(q.largura_cm) || 0;
  const a = Number(q.altura_cm) || 0;
  const medida = l > 0 && a > 0 ? formatarNumero(l) + ' x ' + formatarNumero(a) : '';
  const tipo = TIPOS_DA_OFICINA[q.tipo] || '';
  const qtd = Number(q.quantidade) > 1 ? q.quantidade + 'x ' : '';
  const nome = qtd + [tipo, medida].filter(Boolean).join(' ');
  return 'Quadro ' + (i + 1) + ' de ' + total + (nome ? ': ' + nome : '');
}

const linha = (rotulo, valor, detalhe = '') => ({ rotulo, valor: valor || 'Não vai', detalhe, nao: !valor });

function linhaDaMoldura(pacote, codigo) {
  if (!codigo) return linha('Moldura', '');
  const m = (pacote.molduras || []).find((x) => x.codigo === codigo);
  if (!m) return linha('Moldura', codigo);
  const casinha = m.local ? nomeCasinha(m.local) : '';
  return linha('Moldura', m.nome + ' (' + codigo + ')', casinha ? 'Fica em: ' + casinha : 'Ainda sem casinha');
}

const medidaCm = (l, a) => formatarNumero(l) + ' x ' + formatarNumero(a) + ' cm';
const juntar = (lista) => (lista.length > 1 ? lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1] : lista[0]);

export function acrescimoDoQuadro(q) {
  const l = Number(q.largura_cm) || 0;
  const a = Number(q.altura_cm) || 0;
  const borda = bordaDoQuadro(q);
  if (!(borda.cm > 0) || !(l > 0) || !(a > 0)) return null;
  const objeto = q.tipo === 'objeto' || q.tipo === 'camiseta';
  const final = medidaExterna(l, a, borda.cm);
  const cm = formatarNumero(borda.cm) + ' cm';
  const pecas = [
    q.moldura && 'a moldura',
    q.vidro && (q.vidro_duplo ? 'os 2 vidros' : 'o vidro'),
    q.chapa && !q.vidro_duplo && 'a chapa',
    q.espelho && 'o espelho',
    borda.paspatur && 'o paspatur'
  ].filter(Boolean);
  return {
    cortar: (pecas.length ? 'Cortar ' + juntar(pecas) + ' em ' : 'O quadro fica ') + medidaCm(final.largura, final.altura),
    conta: (objeto ? 'Objeto ' : 'Foto ') + medidaCm(l, a) + ' + '
      + (borda.paspatur ? 'paspatur de ' + cm + ' de cada lado' : 'borda de ' + cm + (objeto ? ' em volta' : ' de cada lado'))
  };
}

export function detalhesDoQuadro(pacote, q) {
  const nome = (codigo) => (codigo ? nomeMaterial(pacote, codigo) || codigo : '');
  const objeto = q.tipo === 'objeto' || q.tipo === 'camiseta';
  const margem = Number(q.margem_cm) || 0;
  const vidro = nome(q.vidro);
  const duplo = vidro && q.vidro_duplo ? ' (2 vidros' + (margem > 0 ? ', borda ' + formatarNumero(margem) + ' cm' : '') + ')' : '';
  const chapa = q.vidro_duplo ? '' : nome(q.chapa);
  const linhas = [
    linhaDaMoldura(pacote, q.moldura),
    linha('Vidro', vidro ? vidro + duplo : ''),
    linha('Chapa', chapa ? chapa + (q.objeto_alto ? ', com pintura' : '') : ''),
    objeto
      ? linha('Borda em volta do objeto', margem > 0 ? formatarNumero(margem) + ' cm' : '')
      : linha('Paspatur', Number(q.paspatur_cm) > 0 ? formatarNumero(Number(q.paspatur_cm)) + ' cm' : '')
  ];
  if (q.espelho) linhas.push(linha('Espelho', nome(q.espelho)));
  const servicos = (q.servicos || []).map((s) => String(s.descricao || '').trim()).filter(Boolean);
  if (servicos.length) linhas.push(linha('Serviços', servicos.join(', ')));
  return linhas;
}

export function ordemVazia() {
  return { cliente: '', telefone: '', descricao: '', prazo: '', valor: '' };
}

export function deOrdem(o) {
  return {
    cliente: o.cliente || '',
    telefone: o.telefone || '',
    descricao: o.descricao || '',
    prazo: o.prazo || '',
    valor: Number(o.valor) > 0 ? formatarNumero(o.valor) : ''
  };
}

export function validarOrdem(f) {
  if (!String(f.cliente || '').trim()) return 'Informe o nome do cliente.';
  if (String(f.prazo || '').trim() && !lerData(f.prazo)) return 'Prazo inválido. Use dia/mês/ano, por exemplo 10/11/2026.';
  if (Number.isNaN(lerValor(f.valor))) return 'Valor inválido.';
  return '';
}

export function dadosDaOrdem(f, alvo) {
  return {
    ...alvo,
    cliente: String(f.cliente || '').trim(),
    telefone: String(f.telefone || '').trim(),
    descricao: String(f.descricao || '').trim(),
    prazo: String(f.prazo || '').trim(),
    valor: lerValor(f.valor) || 0
  };
}

export function descricaoDosQuadros(pacote, quadros) {
  return (quadros || []).map((q) => {
    const partes = [(Number(q.quantidade) > 1 ? q.quantidade + 'x ' : '') + rotuloQuadro(q)];
    const moldura = q.moldura ? pacote.molduras.find((m) => m.codigo === q.moldura) : null;
    if (moldura) partes.push('moldura ' + moldura.nome);
    if (Number(String(q.paspatur || '').replace(',', '.')) > 0 && q.tipo !== 'objeto') partes.push('paspatur ' + q.paspatur + ' cm');
    const bordaDupla = q.vidro_duplo && Number(String(q.margem || '').replace(',', '.')) > 0 ? ', borda ' + q.margem + ' cm' : '';
    if (q.vidro) partes.push(nomeMaterial(pacote, q.vidro) + (q.vidro_duplo ? ' (2 vidros' + bordaDupla + ')' : ''));
    if (q.chapa && !q.vidro_duplo) partes.push(nomeMaterial(pacote, q.chapa));
    if (q.espelho) partes.push(nomeMaterial(pacote, q.espelho));
    (q.servicos || []).forEach((s) => { if (String(s.descricao || '').trim()) partes.push(String(s.descricao).trim()); });
    return partes.join(', ');
  }).join('; ');
}

export function emAndamento(o) {
  return o.status === 'em_producao' || o.status === 'acabamento';
}

export function contarAtrasadas(lista, hoje = new Date()) {
  return (lista || []).filter((o) => emAndamento(o) && prazoVencido(o.prazo, hoje)).length;
}

export function resumoOficina(lista, hoje = new Date()) {
  const ordens = lista || [];
  return {
    producao: ordens.filter((o) => o.status === 'em_producao').length,
    acabamento: ordens.filter((o) => o.status === 'acabamento').length,
    prontos: ordens.filter((o) => o.status === 'pronto').length,
    atrasadas: contarAtrasadas(ordens, hoje)
  };
}

export function chaveDaOrdem(o) {
  return o.ref_app || o.id;
}

export function alvoDaOrdem(o) {
  return o.id ? { id: o.id, ref_app: o.ref_app || '' } : { ref_app: o.ref_app };
}

export function mesesRecentes(hoje = new Date(), quantos = 6) {
  const nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return Array.from({ length: quantos }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    return { valor: d.getFullYear() + '-' + p2(d.getMonth() + 1), titulo: nomes[d.getMonth()] + (d.getFullYear() !== hoje.getFullYear() ? ' ' + d.getFullYear() : '') };
  });
}
