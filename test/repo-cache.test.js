import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps-script');
const js = (x) => JSON.parse(JSON.stringify(x));

function cacheFalso() {
  const m = new Map();
  return {
    m,
    get: (k) => (m.has(k) ? m.get(k) : null),
    getAll: (ks) => Object.fromEntries(ks.filter((k) => m.has(k)).map((k) => [k, m.get(k)])),
    put: (k, v) => { m.set(k, String(v)); },
    putAll: (o) => { Object.entries(o).forEach(([k, v]) => m.set(k, String(v))); },
    remove: (k) => { m.delete(k); }
  };
}

function montar(abas, { semCache = false } = {}) {
  const leituras = [];
  const flushes = [];
  const cache = cacheFalso();
  const aba = (nome) => ({
    getDataRange: () => ({ getValues: () => { leituras.push(nome); return abas[nome].map((l) => l.slice()); } }),
    getRange: (linha, coluna) => ({
      getValues: () => [abas[nome][0].slice()],
      setValue: (v) => { abas[nome][linha - 1][coluna - 1] = v; }
    }),
    getLastColumn: () => abas[nome][0].length,
    appendRow: (linha) => { abas[nome].push(linha); },
    deleteRow: (n) => { abas[nome].splice(n - 1, 1); }
  });
  const ctx = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: (nome) => (nome in abas ? aba(nome) : null) }),
      flush: () => { flushes.push(1); }
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    CacheService: {
      getScriptCache: () => {
        if (semCache) throw new Error('Serviço de cache fora do ar');
        return cache;
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(dir, 'Repo.gs'), 'utf8'), ctx, { filename: 'Repo.gs' });
  return { ctx, leituras, flushes, cache };
}

const planilha = () => ({
  Molduras: [['Codigo', 'Estoque'], ['M1', 3], ['M2', 0]],
  Vidros: [['Codigo', 'Valor'], ['V1', 180]]
});

test('lerAbas lê cada aba da planilha uma vez e depois serve do cache', () => {
  const { ctx, leituras } = montar(planilha());
  const primeira = js(ctx.lerAbas(['Molduras', 'Vidros']));
  const segunda = js(ctx.lerAbas(['Molduras', 'Vidros']));
  assert.deepEqual(primeira, {
    Molduras: [{ Codigo: 'M1', Estoque: 3, _linha: 2 }, { Codigo: 'M2', Estoque: 0, _linha: 3 }],
    Vidros: [{ Codigo: 'V1', Valor: 180, _linha: 2 }]
  });
  assert.deepEqual(segunda, primeira);
  assert.deepEqual(leituras, ['Molduras', 'Vidros']);
});

test('lerAbas devolve lista vazia pra aba que não existe', () => {
  const { ctx } = montar(planilha());
  assert.deepEqual(js(ctx.lerAbas(['Nada'])), { Nada: [] });
});

test('gravar numa aba pelo comLock faz a próxima leitura buscar só ela de novo', () => {
  const { ctx, leituras, flushes } = montar(planilha());
  ctx.lerAbas(['Molduras', 'Vidros']);
  ctx.comLock(() => { ctx.atualizarCampos('Molduras', 2, { Estoque: 9 }); ctx.anexarLinha('Molduras', { Codigo: 'M3', Estoque: 1 }); });
  const depois = js(ctx.lerAbas(['Molduras', 'Vidros']));
  assert.deepEqual(depois.Molduras.map((m) => [m.Codigo, m.Estoque]), [['M1', 9], ['M2', 0], ['M3', 1]]);
  assert.deepEqual(leituras, ['Molduras', 'Vidros', 'Molduras']);
  assert.equal(flushes.length, 1);
});

test('gravar fora do comLock também tira a aba do cache', () => {
  const { ctx, leituras } = montar(planilha());
  ctx.lerAbas(['Vidros']);
  ctx.atualizarCelula('Vidros', 2, 'Valor', 200);
  assert.equal(ctx.lerAbas(['Vidros']).Vidros[0].Valor, 200);
  assert.deepEqual(leituras, ['Vidros', 'Vidros']);
});

test('apagar linha tira a aba do cache', () => {
  const { ctx } = montar(planilha());
  ctx.lerAbas(['Molduras']);
  ctx.comLock(() => ctx.apagarLinhas('Molduras', [3]));
  assert.deepEqual(js(ctx.lerAbas(['Molduras'])).Molduras.map((m) => m.Codigo), ['M1']);
});

test('edição feita à mão na planilha (onEdit) tira a aba do cache', () => {
  const abas = planilha();
  const { ctx } = montar(abas);
  ctx.lerAbas(['Vidros']);
  abas.Vidros[1][1] = 250;
  ctx.onEdit({ range: { getSheet: () => ({ getName: () => 'Vidros' }) } });
  assert.equal(ctx.lerAbas(['Vidros']).Vidros[0].Valor, 250);
});

test('se o cache perder a versão da aba, não volta dado velho', () => {
  const { ctx, cache } = montar(planilha());
  ctx.lerAbas(['Molduras']);
  ctx.comLock(() => ctx.atualizarCampos('Molduras', 2, { Estoque: 7 }));
  ctx.lerAbas(['Molduras']);
  cache.remove('ver:Molduras');
  assert.equal(ctx.lerAbas(['Molduras']).Molduras[0].Estoque, 7);
});

test('data da planilha volta como data quando vem do cache', () => {
  const quando = new Date(2026, 10, 4, 15, 30);
  const { ctx, leituras } = montar({ Oficina: [['ID', 'Data_criacao'], ['OS-1', quando]] });
  ctx.lerAbas(['Oficina']);
  const v = ctx.lerAbas(['Oficina']).Oficina[0].Data_criacao;
  assert.equal(leituras.length, 1);
  assert.equal(typeof v.getMonth, 'function');
  assert.equal(v.getTime(), quando.getTime());
});

test('aba grande demais não vai pro cache', () => {
  const { ctx, leituras } = montar({ Grande: [['Texto'], ['x'.repeat(90000)]] });
  ctx.lerAbas(['Grande']);
  assert.equal(ctx.lerAbas(['Grande']).Grande[0].Texto.length, 90000);
  assert.equal(leituras.length, 2);
});

test('sem o serviço de cache, lerAbas lê direto da planilha', () => {
  const { ctx, leituras } = montar(planilha(), { semCache: true });
  assert.equal(ctx.lerAbas(['Vidros']).Vidros[0].Valor, 180);
  assert.equal(ctx.lerAbas(['Vidros']).Vidros[0].Valor, 180);
  assert.deepEqual(leituras, ['Vidros', 'Vidros']);
  ctx.comLock(() => ctx.atualizarCampos('Vidros', 2, { Valor: 1 }));
});
