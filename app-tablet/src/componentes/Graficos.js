import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { formatarReais } from '../formato';
import { proporcao, tetoBonito, rotuloEixo } from '../financeiro';
import { cores, GRAFICO } from '../tema';

const ALTURA = 200;
const LARGURA_ESTREITA = 520;

function useLargura(inicial) {
  const [largura, setLargura] = useState(null);
  const medir = (e) => setLargura(e.nativeEvent.layout.width);
  return [largura == null ? inicial : largura, medir];
}

function larguraDaColuna(espaco, meses) {
  if (!espaco || !meses) return 22;
  return Math.max(8, Math.min(22, Math.floor((espaco / meses - 10) / 2)));
}

function Legenda() {
  return (
    <View style={s.legenda} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={s.itemLegenda}>
        <View style={[s.amostra, { backgroundColor: GRAFICO.entrou }]} />
        <Text style={s.textoLegenda}>Entrou</Text>
      </View>
      <View style={s.itemLegenda}>
        <View style={[s.amostra, { backgroundColor: GRAFICO.saiu }]} />
        <Text style={s.textoLegenda}>Saiu</Text>
      </View>
    </View>
  );
}

export function BarrasMes({ meses, escolhido, aoEscolher }) {
  const [espacoPlot, medirPlot] = useLargura(0);
  const lista = (meses || []).slice(-6);
  if (!lista.length) return <Text style={s.vazio}>Ainda não tem lançamentos.</Text>;
  const teto = tetoBonito(Math.max(...lista.map((m) => Math.max(m.entrada, m.saida))));
  const atual = lista.find((m) => m.mes === escolhido) || lista[lista.length - 1];
  const largura = larguraDaColuna(espacoPlot, lista.length);
  return (
    <View style={s.caixa}>
      <Legenda />
      <Text style={s.detalhe} accessibilityLiveRegion="polite">
        <Text style={s.detalheMes}>{atual.rotulo}: </Text>
        entrou {formatarReais(atual.entrada)}, saiu {formatarReais(atual.saida)}, sobrou {formatarReais(atual.saldo)}
      </Text>
      <View style={s.area}>
        <View style={s.eixo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={s.tick}>{rotuloEixo(teto)}</Text>
          <Text style={s.tick}>{rotuloEixo(teto / 2)}</Text>
          <Text style={s.tick}>0</Text>
        </View>
        <View style={s.plot} onLayout={medirPlot}>
          <View style={[s.grade, { top: 0 }]} />
          <View style={[s.grade, { top: ALTURA / 2 }]} />
          <View style={[s.base, { top: ALTURA }]} />
          <View style={s.colunas}>
            {lista.map((m) => {
              const ativo = m.mes === atual.mes;
              return (
                <Pressable
                  key={m.mes}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={m.rotulo + ': entrou ' + formatarReais(m.entrada) + ', saiu ' + formatarReais(m.saida) + ', sobrou ' + formatarReais(m.saldo)}
                  onPress={() => aoEscolher && aoEscolher(m.mes)}
                  style={[s.grupo, ativo && s.grupoAtivo]}>
                  <View style={s.par}>
                    <View style={[s.coluna, { width: largura, height: (ALTURA * proporcao(m.entrada, teto)) / 100, backgroundColor: GRAFICO.entrou }]} />
                    <View style={[s.coluna, { width: largura, height: (ALTURA * proporcao(m.saida, teto)) / 100, backgroundColor: GRAFICO.saiu }]} />
                  </View>
                  <Text style={[s.rotulo, ativo && s.rotuloAtivo]}>{m.rotulo}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <Text style={s.dica}>Toque num mês pra ver os valores.</Text>
    </View>
  );
}

export function BarrasCategoria({ itens }) {
  const janela = useWindowDimensions().width;
  const [largura, medir] = useLargura(janela - 80);
  const lista = itens || [];
  if (!lista.length) return <Text style={s.vazio}>Nenhum gasto nesse período.</Text>;
  const maior = Math.max(...lista.map((i) => i.valor));
  const estreito = largura < LARGURA_ESTREITA;
  return (
    <View style={s.linhas} onLayout={medir}>
      {lista.map((i) => {
        const valor = (
          <Text style={[s.valorBarra, estreito && s.valorEstreito]}>
            {formatarReais(i.valor)} <Text style={s.pct}>{String(i.pct).replace('.', ',')}%</Text>
          </Text>
        );
        const trilho = (
          <View style={[s.trilho, estreito && s.trilhoEstreito]}>
            <View style={[s.barra, { width: proporcao(i.valor, maior) + '%' }]} />
          </View>
        );
        return (
          <View
            key={i.categoria}
            style={estreito ? s.linhaEstreita : s.linha}
            accessible
            accessibilityLabel={i.categoria + ': ' + formatarReais(i.valor) + ', ' + String(i.pct).replace('.', ',') + '% dos gastos'}>
            {estreito ? (
              <>
                <View style={s.topoEstreito}>
                  <Text style={[s.categoria, s.categoriaEstreita]} numberOfLines={1}>{i.categoria}</Text>
                  {valor}
                </View>
                {trilho}
              </>
            ) : (
              <>
                <Text style={s.categoria} numberOfLines={1}>{i.categoria}</Text>
                {trilho}
                {valor}
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 12 },
  legenda: { flexDirection: 'row', gap: 20 },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amostra: { width: 14, height: 14, borderRadius: 4 },
  textoLegenda: { fontSize: 16, fontWeight: '700', color: cores.tinta },
  detalhe: { fontSize: 18, color: cores.tinta },
  detalheMes: { fontWeight: '800', color: cores.marinho },
  area: { flexDirection: 'row', gap: 8 },
  eixo: { width: 56, height: ALTURA, justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -8, marginBottom: 8 },
  tick: { fontSize: 13, color: cores.apagado },
  plot: { flex: 1 },
  grade: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: GRAFICO.grade },
  base: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: cores.linhaForte },
  colunas: { flexDirection: 'row', alignItems: 'flex-start' },
  grupo: { flex: 1, alignItems: 'center', borderRadius: 10, paddingBottom: 6 },
  grupoAtivo: { backgroundColor: 'rgba(19, 41, 75, 0.06)' },
  par: { height: ALTURA, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  coluna: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  rotulo: { marginTop: 8, fontSize: 15, color: cores.apagado },
  rotuloAtivo: { color: cores.marinho, fontWeight: '800' },
  dica: { fontSize: 14, color: cores.apagado },
  linhas: { gap: 12 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  categoria: { width: 140, fontSize: 17, color: cores.tinta },
  trilho: { flex: 1, height: 20, justifyContent: 'center' },
  barra: { height: 20, backgroundColor: GRAFICO.saiu, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  valorBarra: { width: 170, fontSize: 17, fontWeight: '700', color: cores.tinta, textAlign: 'right' },
  linhaEstreita: { gap: 6 },
  topoEstreito: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  categoriaEstreita: { width: 'auto', flex: 1, minWidth: 0 },
  valorEstreito: { width: 'auto' },
  trilhoEstreito: { flex: 0, alignSelf: 'stretch', justifyContent: 'flex-start' },
  pct: { fontWeight: '500', color: cores.apagado },
  vazio: { fontSize: 18, color: cores.apagado, paddingVertical: 12 }
});
