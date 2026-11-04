import { corEstoque } from './gerado/nucleo';
import { formatarMetros } from './varas';

const SEM_MARCA = 'Sem fornecedor';

export function listaDeCompras(pacote) {
  const grupos = new Map();
  const grupo = (marca) => {
    const nome = String(marca || '').trim() || SEM_MARCA;
    if (!grupos.has(nome)) grupos.set(nome, { marca: nome, encomendas: [], acabando: [] });
    return grupos.get(nome);
  };
  const encomendadas = new Map();
  for (const c of pacote.compras_pendentes || []) {
    let item = encomendadas.get(c.moldura);
    if (!item) {
      item = { codigo: c.moldura, nome: c.nome, metros: 0, clientes: [] };
      encomendadas.set(c.moldura, item);
      grupo(c.marca).encomendas.push(item);
    }
    item.metros = Number((item.metros + (Number(c.metros_faltando) || 0)).toFixed(3));
    if (c.cliente && !item.clientes.includes(c.cliente)) item.clientes.push(c.cliente);
  }
  for (const m of pacote.molduras || []) {
    if (!m.local || encomendadas.has(m.codigo)) continue;
    const cor = corEstoque(m.estoque_m);
    if (cor === 'amarelo' || cor === 'vermelho') grupo(m.marca).acabando.push(m);
  }
  const lista = [...grupos.values()];
  lista.forEach((g) => g.acabando.sort((a, b) => a.estoque_m - b.estoque_m));
  return lista.sort((a, b) => (a.marca === SEM_MARCA) - (b.marca === SEM_MARCA) || a.marca.localeCompare(b.marca, 'pt-BR'));
}

export function textoCompras(g) {
  const linhas = ['Lista de compras da Vera Molduras (' + g.marca + ')'];
  if (g.encomendas.length) {
    linhas.push('Encomendas de clientes:');
    g.encomendas.forEach((e) => linhas.push('• ' + e.codigo + ' ' + e.nome + ': ' + formatarMetros(e.metros)));
  }
  if (g.acabando.length) {
    linhas.push('Repor estoque:');
    g.acabando.forEach((m) => linhas.push('• ' + m.codigo + ' ' + m.nome));
  }
  return linhas.join('\n');
}
