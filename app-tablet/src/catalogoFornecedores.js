// Procura no catálogo dos fornecedores (as molduras do relatório da loja) pra preencher o cadastro.
import { CATALOGO_FORNECEDORES } from './gerado/catalogoFornecedores';
import { semAcento } from './busca';

// "060 RM 315" e "060-rm-315" viram "060-rm315": fica só o primeiro traço, porque ele separa
// o perfil do acabamento ("12-1049" e "1210-49" são molduras diferentes).
export function chaveCodigo(codigo) {
  return semAcento(codigo).replace(/\s+/g, '-').replace(/^([^-]*-)(.*)$/, (_, a, b) => a + b.replace(/-/g, ''));
}

const semTraco = (codigo) => semAcento(codigo).replace(/[\s-]/g, '');

// Código primeiro (exato, começa com, contém); depois texto livre (cor, fornecedor, nome).
export function procurarNoCatalogo(termo, catalogo = CATALOGO_FORNECEDORES, limite = 8) {
  const alvo = semAcento(termo);
  if (!alvo) return [];
  const chave = chaveCodigo(alvo);
  const corrido = semTraco(alvo);
  const partes = alvo.split(/\s+/);
  const pontos = (m) => {
    if (chaveCodigo(m.codigo) === chave) return 0;
    const k = semTraco(m.codigo);
    if (k === corrido) return 0.5;
    if (corrido && k.startsWith(corrido)) return 1;
    if (corrido.length >= 3 && k.includes(corrido)) return 2;
    const texto = [m.codigo, m.nome, m.marca, m.cor, m.linha].map(semAcento).join(' ');
    return partes.every((p) => texto.includes(p)) ? 3 : -1;
  };
  return catalogo
    .map((m) => ({ m, p: pontos(m) }))
    .filter((x) => x.p >= 0)
    .sort((a, b) => a.p - b.p || String(a.m.codigo).localeCompare(String(b.m.codigo), 'pt-BR'))
    .slice(0, limite)
    .map((x) => x.m);
}

const dinheiro = (n) => (Number(n) > 0 ? Number(n).toFixed(2).replace('.', ',') : '');
const medida = (n) => (Number(n) > 0 ? String(Number(n)).replace('.', ',') : '');

// Campos do formulário de cadastro. O custo fica em branco: ele não vem no catálogo.
export function camposDoCatalogo(m) {
  return {
    codigo: String(m.codigo || ''),
    nome: m.nome || '',
    marca: m.marca || '',
    perfil_cm: medida(m.perfil_cm),
    preco_m: dinheiro(m.preco_m),
    custo_m: '',
    estilo: m.estilo || '',
    cor: m.cor || ''
  };
}

// Uma linha curta pra mostrar no resultado da busca.
export function resumoDoCatalogo(m) {
  const partes = [m.codigo, m.marca, m.nome];
  if (Number(m.preco_m) > 0) partes.push('R$ ' + dinheiro(m.preco_m) + '/m');
  return partes.filter(Boolean).join(' · ');
}
