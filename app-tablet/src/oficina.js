import { lerValor, formatarNumero } from './formato';
import { rotuloQuadro, nomeMaterial } from './orcamento';

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
    if (Number(String(q.paspatur || '').replace(',', '.')) > 0 && q.tipo !== 'camiseta') partes.push('paspatur ' + q.paspatur + ' cm');
    if (q.vidro) partes.push(nomeMaterial(pacote, q.vidro) + (q.vidro_duplo ? ' (2 vidros)' : ''));
    if (q.chapa && !q.vidro_duplo) partes.push(nomeMaterial(pacote, q.chapa));
    if (q.espelho) partes.push(nomeMaterial(pacote, q.espelho));
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
