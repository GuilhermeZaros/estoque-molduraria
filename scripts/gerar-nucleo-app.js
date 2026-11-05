import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DESTINO = path.join(raiz, 'app-tablet', 'src', 'gerado', 'nucleo.js');

const PECAS = {
  'Calculo.gs': ['KERF_M', 'VARA_PADRAO_M', 'perimetroM', 'areaM2', 'consumoMolduraM', 'TAXA_PINTURA_CHAPA',
    '_arredondarPraCima', 'calcularOrcamento'],
  'Catalogo.gs': ['_ehDisponivel'],
  'AppNucleo.gs': ['LADOS_CORREDOR', '_casinhasDoDeposito', '_normalizarCasinha', '_casinhaValida',
    '_nomeCasinha', '_corEstoque', '_metros', '_abaterFaltas', '_validarNovaMoldura', '_medidaExterna',
    '_servicosDoQuadro', '_totaisOrcamentoApp', '_ehObjeto', '_planejarBaixaMoldura', '_quadrosDoPedido', '_bordaDoQuadro', '_consumoPorMoldura',
    '_numeroCurto', '_resumoQuadros']
};

function extrair(src, nome, arquivo) {
  const linhas = src.split(/\r?\n/);
  const inicio = linhas.findIndex((l) => l.startsWith('function ' + nome + '(') || l.startsWith('var ' + nome + ' '));
  if (inicio < 0) throw new Error(nome + ' não está em ' + arquivo);
  const terminou = linhas[inicio].startsWith('function') ? (l) => l === '}' : (l) => /;\s*$/.test(l);
  let fim = inicio;
  while (fim < linhas.length && !terminou(linhas[fim])) fim++;
  return linhas.slice(inicio, fim + 1)
    .filter((l) => !/^\s*\/\//.test(l))
    .map((l) => l.replace(/\s+\/\/[^'"]*$/, ''))
    .join('\n');
}

export function gerarNucleo() {
  const blocos = [];
  const nomes = [];
  for (const [arquivo, lista] of Object.entries(PECAS)) {
    const src = readFileSync(path.join(raiz, 'apps-script', arquivo), 'utf8');
    for (const nome of lista) {
      blocos.push(extrair(src, nome, arquivo));
      nomes.push(nome.startsWith('_') ? nome + ' as ' + nome.slice(1) : nome);
    }
  }
  return blocos.join('\n\n') + '\n\nexport {\n  ' + nomes.join(',\n  ') + '\n};\n';
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  mkdirSync(path.dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, gerarNucleo());
  console.log('Gerado ' + path.relative(raiz, DESTINO));
}
