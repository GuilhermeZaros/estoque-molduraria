import { useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEstado } from '../../src/estado';
import { casinhasDoGrupo, layoutCorredor, moldurasPorCasinha, nomeGrupo } from '../../src/mapa';
import { nomeCasinha, normalizarCasinha } from '../../src/gerado/nucleo';
import { Casinha } from '../../src/componentes/Casinha';
import { Legenda } from '../../src/componentes/Legenda';
import { cores, tamanho } from '../../src/tema';

export default function Grupo() {
  const { grupo, piscar, moldura } = useLocalSearchParams();
  const g = String(grupo || '').toUpperCase();
  const visivel = useEstado((s) => s.visivel);
  const porCasinha = useMemo(() => moldurasPorCasinha(visivel ? visivel.molduras : []), [visivel]);
  const compacto = useWindowDimensions().width < 600;
  const rolagem = useRef(null);
  const medidas = useRef({});
  const rolou = useRef(false);
  if (!visivel || !/^(CR[1-5]|PR[12])$/.test(g)) return null;

  const todas = casinhasDoGrupo(g);
  const alvo = todas.includes(normalizarCasinha(piscar)) ? normalizarCasinha(piscar) : '';
  const achada = alvo ? visivel.molduras.find((x) => String(x.codigo) === String(moldura || '')) : null;

  const tentarRolar = () => {
    const m = medidas.current;
    if (rolou.current || !m.casinha || m.bloco == null || m.tela == null) return;
    rolou.current = true;
    const y = m.bloco + m.casinha.y;
    if (y + m.casinha.altura > m.tela - 16 && rolagem.current) rolagem.current.scrollTo({ y: Math.max(0, y - 120), animated: true });
  };
  const medirTela = (e) => { medidas.current.tela = e.nativeEvent.layout.height; tentarRolar(); };
  const medirBloco = (e) => { medidas.current.bloco = e.nativeEvent.layout.y; tentarRolar(); };
  const medirCasinha = (e) => {
    const l = e.nativeEvent.layout;
    medidas.current.casinha = { y: l.y, altura: l.height };
    tentarRolar();
  };
  const blocoDe = (lista) => (alvo && lista.includes(alvo) ? medirBloco : undefined);

  const casinha = (codigo, estilo) => (
    <Casinha
      key={codigo}
      codigo={codigo}
      molduras={porCasinha[codigo]}
      aoTocar={() => router.push('/casinha/' + codigo)}
      estilo={estilo}
      compacto={compacto}
      piscar={codigo === alvo}
      aoMedir={codigo === alvo ? medirCasinha : undefined}
    />
  );
  const aviso = alvo ? (
    <Text style={s.achou} accessibilityLiveRegion="polite">
      {(achada ? achada.codigo + ' ' + achada.nome : 'A moldura') + ' está em ' + nomeCasinha(alvo) + ', a casinha com borda dourada.'}
    </Text>
  ) : null;

  const tela = (conteudo) => (
    <View style={s.raiz}>
      <Stack.Screen options={{ title: nomeGrupo(g) }} />
      {aviso}
      <ScrollView ref={rolagem} onLayout={medirTela} contentContainerStyle={s.tela}>{conteudo}</ScrollView>
    </View>
  );
  if (g.startsWith('PR')) {
    return tela(
      <>
        <View style={s.fileira} onLayout={blocoDe(todas)}>{todas.map((c) => casinha(c, s.naFileira))}</View>
        <Legenda />
      </>
    );
  }
  const l = layoutCorredor(g);
  return tela(
    <>
      <Text style={s.marca}>Fundo</Text>
      <View style={s.fileira} onLayout={blocoDe(l.fundo)}>{l.fundo.map((c) => casinha(c, s.naFileira))}</View>
      <View style={s.lados} onLayout={blocoDe([...l.esquerda, ...l.direita])}>
        <View style={[s.lado, compacto && s.ladoCompacto]}>
          <Text style={s.marca}>Esquerda</Text>
          {l.esquerda.map((c) => casinha(c))}
        </View>
        <View style={[s.lado, compacto && s.ladoCompacto]}>
          <Text style={s.marca}>Direita</Text>
          {l.direita.map((c) => casinha(c))}
        </View>
      </View>
      <Text style={s.marca}>Entrada do corredor</Text>
      <Legenda />
    </>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1 },
  tela: { padding: 20, gap: 12, paddingBottom: 48 },
  achou: {
    marginHorizontal: 20, marginTop: 12,
    fontSize: tamanho.texto, fontWeight: '700', color: cores.marinho, backgroundColor: cores.ouroClaro,
    borderLeftWidth: 6, borderLeftColor: cores.ouroTexto, padding: 12, borderRadius: tamanho.raio
  },
  fileira: { flexDirection: 'row' },
  naFileira: { flex: 1 },
  lados: { flexDirection: 'row', justifyContent: 'space-between' },
  lado: { width: '20%' },
  ladoCompacto: { width: '25%' },
  marca: { fontSize: tamanho.pequeno, color: cores.apagado, fontWeight: '700', textAlign: 'center' }
});
