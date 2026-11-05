import { formatarNumero, formatarReais } from './formato';

export function numeroWhatsApp(telefone) {
  const d = String(telefone == null ? '' : telefone).replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return '55' + d;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}

export function linkWhatsApp(numero, texto) {
  return 'https://wa.me/' + (numero || '') + '?text=' + encodeURIComponent(texto);
}

const medida = (l, a) => formatarNumero(l) + ' x ' + formatarNumero(a) + ' cm';

function tituloQuadro(q, varios) {
  const n = varios ? q.quantidade : 1;
  const fica = ' (o quadro fica ' + medida(q.externa.largura, q.externa.altura) + ')';
  if (q.tipo === 'objeto') {
    return (n > 1 ? n + ' objetos de ' : 'Objeto de ') + medida(q.largura, q.altura) + (q.margem > 0 ? fica : '');
  }
  if (q.tipo === 'reforma') {
    const de = q.largura > 0 && q.altura > 0 ? ' de ' + medida(q.largura, q.altura) : '';
    return (n > 1 ? n + ' reformas de quadro' : 'Reforma do seu quadro') + de;
  }
  let t = (n > 1 ? n + ' quadros de ' : 'Quadro de ') + medida(q.largura, q.altura);
  if (q.borda > 0) t += ', com paspatur de ' + formatarNumero(q.borda) + ' cm (fica ' + medida(q.externa.largura, q.externa.altura) + ')';
  else if (q.vidro_duplo && q.margem > 0) t += ', com borda de ' + formatarNumero(q.margem) + ' cm (fica ' + medida(q.externa.largura, q.externa.altura) + ')';
  return t;
}

function linhasDoQuadro(q, varios, ajustado) {
  const novo = q.tipo === 'reforma' ? ' novo' : '';
  const linhas = [tituloQuadro(q, varios)];
  if (q.moldura) linhas.push((novo ? 'Moldura nova' : 'Moldura') + ': ' + q.moldura);
  if (q.vidro) linhas.push('Vidro' + novo + ': ' + q.vidro + (q.vidro_duplo ? ' (2 vidros)' : ''));
  if (q.fundo) linhas.push('Fundo' + novo + ': ' + q.fundo);
  if (q.espelho) linhas.push('Espelho' + novo + ': ' + q.espelho);
  (q.servicos || []).forEach((s) => linhas.push((s.descricao || 'Serviço') + (ajustado ? '' : ': ' + formatarReais(s.valor))));
  if (!varios && q.quantidade > 1) linhas.push('Quantidade: ' + q.quantidade);
  return linhas;
}

export function textoOrcamento(d) {
  const nome = String(d.cliente || '').trim().split(/\s+/)[0];
  const linhas = [(nome ? 'Olá, ' + nome + '!' : 'Olá!') + ' Segue o orçamento da Vera Molduras:'];
  const quadros = d.quadros || [];
  if (quadros.length === 1) {
    linhas.push(...linhasDoQuadro(quadros[0], false, d.ajustado));
  } else {
    quadros.forEach((q, i) => {
      const bloco = linhasDoQuadro(q, true, d.ajustado);
      bloco[0] = i + 1 + ') ' + bloco[0];
      linhas.push('', ...bloco);
      if (!d.ajustado) {
        linhas.push('Valor: ' + formatarReais(q.valor_total) + (q.quantidade > 1 ? ' (' + formatarReais(q.valor_unitario) + ' cada)' : ''));
      }
    });
    linhas.push('');
  }
  linhas.push('Total: ' + formatarReais(d.total));
  return linhas.join('\n');
}
