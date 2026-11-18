import { CATALOGO_FORNECEDORES } from '../gerado/catalogoFornecedores';
import { chaveCodigo, procurarNoCatalogo, camposDoCatalogo, resumoDoCatalogo } from '../catalogoFornecedores';

describe('catálogo dos fornecedores', () => {
  test('tem as 749 molduras do relatório, sem código repetido e sem custo', () => {
    expect(CATALOGO_FORNECEDORES).toHaveLength(749);
    const codigos = CATALOGO_FORNECEDORES.map((m) => chaveCodigo(m.codigo));
    expect(new Set(codigos).size).toBe(codigos.length);
    CATALOGO_FORNECEDORES.forEach((m) => {
      expect(m.custo_m).toBeUndefined();
      expect(m.preco_m).toBeGreaterThan(0);
      expect(m.marca).toBeTruthy();
    });
  });

  test('acha pelo código mesmo escrito com espaço ou sem traço', () => {
    expect(procurarNoCatalogo('060 RM 315')[0].codigo).toBe('060-RM-315');
    expect(procurarNoCatalogo('060116')[0].codigo).toBe('060-116');
    expect(procurarNoCatalogo('0473-2017')[0]).toMatchObject({ marca: 'Aguiar', perfil_cm: 5 });
  });

  test('12-1049 e 1210-49 são molduras diferentes; 066-R-390 e 066-R390 são a mesma', () => {
    expect(chaveCodigo('12-1049')).not.toBe(chaveCodigo('1210-49'));
    expect(chaveCodigo('066-R-390')).toBe(chaveCodigo('066-R390'));
    expect(procurarNoCatalogo('066-R390')).toHaveLength(1);
  });

  test('acha por cor e fornecedor', () => {
    const r = procurarNoCatalogo('ruberti bambu');
    expect(r.map((m) => m.codigo)).toContain('334-BBQ');
  });

  test('busca vazia não devolve nada', () => {
    expect(procurarNoCatalogo('  ')).toEqual([]);
  });

  test('preenche o formulário com vírgula e sem custo', () => {
    const m = { codigo: '060-116', marca: 'Art Mold', nome: 'Preto 2cm', perfil_cm: 2, preco_m: 18.9, cor: 'Preto' };
    expect(camposDoCatalogo(m)).toEqual({
      codigo: '060-116', nome: 'Preto 2cm', marca: 'Art Mold', perfil_cm: '2',
      preco_m: '18,90', custo_m: '', estilo: '', cor: 'Preto'
    });
    expect(resumoDoCatalogo(m)).toBe('060-116 · Art Mold · Preto 2cm · R$ 18,90/m');
  });
});
