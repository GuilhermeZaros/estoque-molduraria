import { lerValor, formatarNumero } from './formato';
import { rotuloQuadro, nomeMaterial, travasDaTela } from './orcamento';
import {
  nomeCasinha, bordaDoQuadro, medidaExterna, travasDoChassi, ladosDaMoldura, textoQuebra, consumoLadoM, corteDoLadoAMais, estoqueEmPecas
} from './gerado/nucleo';

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

function molduraDe(pacote, codigo) {
  return ((pacote && pacote.molduras) || []).find((x) => x.codigo === String(codigo)) || null;
}

function nomeDaMoldura(pacote, codigo) {
  const m = molduraDe(pacote, codigo);
  return m ? m.nome : String(codigo || '');
}

function perfilDe(pacote, codigo) {
  const m = molduraDe(pacote, codigo);
  return m ? Number(m.perfil_cm) || 0 : 0;
}

export function opcoesDoLadoAMais(pacote, q) {
  const lista = [];
  if (q.moldura) lista.push({ fora: false, codigo: q.moldura, titulo: q.moldura_fora ? 'Moldura de dentro' : 'Moldura' });
  if (q.moldura_fora) lista.push({ fora: true, codigo: q.moldura_fora, titulo: 'Moldura de fora' });
  const perfilDentro = q.moldura ? perfilDe(pacote, q.moldura) : 0;
  return lista.map((x) => ({
    ...x,
    nome: nomeDaMoldura(pacote, x.codigo),
    lados: ladosDaMoldura(q, x.fora ? perfilDentro : 0, x.fora)
  }));
}

export function metrosDoLadoAMais(pacote, codigo, ladoCm, quantidade) {
  return Number(((Number(quantidade) || 0) * consumoLadoM(ladoCm, perfilDe(pacote, codigo))).toFixed(3));
}

export function novoIdQuebra(agora = Date.now(), sorte = Math.random()) {
  return 'qb-' + agora.toString(36) + sorte.toString(36).slice(2, 7);
}

export function dadosDoLadoAMais(pacote, o, quadro, escolha, id) {
  return {
    ...alvoDaOrdem(o), cliente: o.cliente || '', quadro, fora: !!escolha.fora, lado_cm: escolha.lado_cm,
    quantidade: escolha.quantidade, id_quebra: id, moldura: escolha.codigo,
    metros: metrosDoLadoAMais(pacote, escolha.codigo, escolha.lado_cm, escolha.quantidade)
  };
}

const metrosTxt = (m) => (Number(m) || 0).toFixed(2).replace('.', ',') + ' m';

function textoDosLados(lados, variosQuadros) {
  const grupos = [];
  (lados || []).forEach((l) => {
    const g = grupos.find((x) => x.cm === l.cm && x.quadro === l.quadro && x.fora === l.fora);
    if (g) g.n++;
    else grupos.push({ cm: l.cm, quadro: l.quadro, fora: l.fora, n: 1 });
  });
  return juntarTexto(grupos.map((g) => (g.n > 1 ? g.n + ' lados' : '1 lado') + ' de ' + formatarNumero(g.cm) + ' cm'
    + (variosQuadros && g.quadro ? ' do quadro ' + g.quadro : '') + (g.fora ? ' (moldura de fora)' : '')));
}

function juntarTexto(lista) {
  return lista.length > 1 ? lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1] : lista[0] || '';
}

export function cortesDaOrdem(pacote, o) {
  const varios = ((o && o.quadros) || []).length > 1;
  return ((o && o.cortes) || []).filter((c) => (c.usos || []).length || (c.faltam || []).length).map((c) => {
    const m = molduraDe(pacote, c.codigo);
    const linhas = [...(c.usos || [])]
      .sort((a, b) => (a.de === b.de ? 0 : a.de === 'pedaco' ? -1 : 1))
      .map((u) => {
        const sobra = u.sobra_m > 0 ? 'Sobra ' + metrosTxt(u.sobra_m) + ', guarde no estoque.' : 'Não sobra pedaço que preste.';
        const titulo = u.de === 'pedaco'
          ? 'Use o pedaço de ' + metrosTxt(u.tamanho_m)
          : (u.varas > 1 ? u.varas + ' varas emendadas' : 'Vara nova de 2,70 m');
        return { tipo: u.de, titulo, detalhe: 'Corta ' + textoDosLados(u.lados, varios) + '. ' + sobra };
      });
    if ((c.faltam || []).length) {
      linhas.push({ tipo: 'falta', titulo: 'Falta moldura', detalhe: textoDosLados(c.faltam, varios) + ': espera a encomenda chegar.' });
    }
    return {
      codigo: c.codigo,
      titulo: (m ? m.nome + ' (' + c.codigo + ')' : c.codigo),
      lugar: m && m.local ? 'Fica em: ' + nomeCasinha(m.local) : '',
      linhas
    };
  });
}

export function pedacoDoLadoAMais(pacote, codigo, ladoCm, quantidade) {
  const m = molduraDe(pacote, codigo);
  if (!m) return null;
  const plano = corteDoLadoAMais(estoqueEmPecas(m.estoque_m, m.pedacos || ''), Number(ladoCm) || 0, Number(m.perfil_cm) || 0, Number(quantidade) || 1);
  const pedacos = plano.usos.filter((u) => u.de === 'pedaco');
  if (plano.faltam.length) return { falta: true, texto: 'Não tem moldura que dê pra esse lado no estoque.' };
  if (!pedacos.length) return { falta: false, texto: 'Corte de uma vara nova.' };
  return { falta: false, texto: 'Dá pra usar ' + juntarTexto(pedacos.map((u) => 'o pedaço de ' + metrosTxt(u.tamanho_m))) + '.' };
}

export function dadosDeTirarLadoAMais(o, x) {
  return { ...alvoDaOrdem(o), cliente: o.cliente || '', id_quebra: x.id };
}

export function quebrasDoQuadro(o, quadro) {
  return ((o && o.quebras) || []).filter((x) => x.quadro === quadro);
}

export function textoDaQuebra(pacote, x) {
  return 'Quebrou ' + textoQuebra(x) + ' · ' + nomeDaMoldura(pacote, x.moldura);
}

const TIPOS_DA_OFICINA = { reforma: 'Reforma', objeto: 'Objeto', camiseta: 'Objeto', tela: 'Tela' };

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

function linhaDaMoldura(pacote, codigo, rotulo = 'Moldura') {
  if (!codigo) return linha(rotulo, '');
  const m = (pacote.molduras || []).find((x) => x.codigo === codigo);
  if (!m) return linha(rotulo, codigo);
  const casinha = m.local ? nomeCasinha(m.local) : '';
  return linha(rotulo, m.nome + ' (' + codigo + ')', casinha ? 'Fica em: ' + casinha : 'Ainda sem casinha');
}

function linhasDasMolduras(pacote, q) {
  if (!q.moldura || !q.moldura_fora) return [linhaDaMoldura(pacote, q.moldura)];
  return [linhaDaMoldura(pacote, q.moldura, 'Moldura por dentro'), linhaDaMoldura(pacote, q.moldura_fora, 'Moldura por fora')];
}

const medidaCm = (l, a) => formatarNumero(l) + ' x ' + formatarNumero(a) + ' cm';
const juntar = (lista) => (lista.length > 1 ? lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1] : lista[0]);

export function acrescimoDoQuadro(q) {
  const l = Number(q.largura_cm) || 0;
  const a = Number(q.altura_cm) || 0;
  const borda = bordaDoQuadro(q);
  const temFora = !!(q.moldura && q.moldura_fora);
  if (!(borda.cm > 0) || !(l > 0) || !(a > 0)) return null;
  const objeto = q.tipo === 'objeto' || q.tipo === 'camiseta';
  const final = medidaExterna(l, a, borda.cm);
  const cm = formatarNumero(borda.cm) + ' cm';
  const pecas = [
    q.moldura && (temFora ? 'a moldura de dentro' : 'a moldura'),
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

const nomeDasTravas = (n) => (n > 1 ? n + ' travas' : '1 trava');

function linhaDoChassi(q) {
  const l = Number(q.largura_cm) || 0;
  const a = Number(q.altura_cm) || 0;
  if (!(l > 0) || !(a > 0)) return linha('Chassi', 'Medida não informada');
  const t = travasDoChassi(l, a);
  return linha('Chassi', medidaCm(l, a) + (t.quantidade
    ? ', com ' + nomeDasTravas(t.quantidade) + ' de ' + formatarNumero(t.comprimento_m * 100) + ' cm'
    : ', sem trava'));
}

function linhaDosServicos(q) {
  const servicos = (q.servicos || []).map((s) => String(s.descricao || '').trim()).filter(Boolean);
  return servicos.length ? [linha('Serviços', servicos.join(', '))] : [];
}

export function detalhesDoQuadro(pacote, q) {
  if (q.tipo === 'tela') {
    const vidroTela = q.vidro ? nomeMaterial(pacote, q.vidro) || q.vidro : '';
    return [
      q.sem_chassi ? linha('Chassi', 'Não leva, a tela já vem esticada') : linhaDoChassi(q), ...linhasDasMolduras(pacote, q),
      ...(vidroTela ? [linha('Vidro', vidroTela)] : []), ...linhaDosServicos(q)
    ];
  }
  const nome = (codigo) => (codigo ? nomeMaterial(pacote, codigo) || codigo : '');
  const objeto = q.tipo === 'objeto' || q.tipo === 'camiseta';
  const margem = Number(q.margem_cm) || 0;
  const vidro = nome(q.vidro);
  const duplo = vidro && q.vidro_duplo ? ' (2 vidros' + (margem > 0 ? ', borda ' + formatarNumero(margem) + ' cm' : '') + ')' : '';
  const chapa = q.vidro_duplo ? '' : nome(q.chapa);
  const linhas = [
    ...linhasDasMolduras(pacote, q),
    linha('Vidro', vidro ? vidro + duplo : ''),
    linha('Chapa', chapa ? chapa + (q.objeto_alto ? ', com pintura' : '') : ''),
    objeto
      ? linha('Borda em volta do objeto', margem > 0 ? formatarNumero(margem) + ' cm' : '')
      : linha('Paspatur', Number(q.paspatur_cm) > 0 ? formatarNumero(Number(q.paspatur_cm)) + ' cm' : '')
  ];
  if (q.espelho) linhas.push(linha('Espelho', nome(q.espelho)));
  return [...linhas, ...linhaDosServicos(q)];
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

export function fotosDaVenda(f, fotos) {
  const ref_app = 'orc-' + f.ref_app;
  const cliente = String(f.cliente || '').trim();
  return (f.quadros || []).flatMap((q, i) => (fotos[q.chave] || []).map((foto) => ({
    dados: { ref_app, cliente, foto_ref: foto.ref, quadro: i + 1 },
    uri: foto.url
  })));
}

export function descricaoDosQuadros(pacote, quadros) {
  return (quadros || []).map((q) => {
    const partes = [(Number(q.quantidade) > 1 ? q.quantidade + 'x ' : '') + rotuloQuadro(q)];
    const travas = travasDaTela(q);
    if (travas) partes.push(travas.quantidade ? 'chassi com ' + nomeDasTravas(travas.quantidade) : 'chassi sem trava');
    const moldura = q.moldura ? pacote.molduras.find((m) => m.codigo === q.moldura) : null;
    const fora = q.moldura_fora ? pacote.molduras.find((m) => m.codigo === q.moldura_fora) : null;
    if (moldura) partes.push((fora ? 'moldura por dentro ' : 'moldura ') + moldura.nome);
    if (moldura && fora) partes.push('moldura por fora ' + fora.nome);
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
