import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useEstado } from '../../src/estado';
import { CORREDORES, grupoDe, nomeGrupo, moldurasPorCasinha, resumoGrupo } from '../../src/mapa';
import { casinhaValida, nomeCasinha, normalizarCasinha } from '../../src/gerado/nucleo';
import { BuscaMoldura } from '../../src/componentes/BuscaMoldura';
import { BarraSync } from '../../src/componentes/BarraSync';
import { Botao } from '../../src/componentes/Botao';
import { listaDeCompras } from '../../src/compras';
import { Legenda } from '../../src/componentes/Legenda';
import { cores, tamanho, COR_ESTADO } from '../../src/tema';

function CartaoGrupo({ grupo, porCasinha, estilo, compacto = false }) {
  const r = resumoGrupo(grupo, porCasinha);
  const molduras = (n) => (n === 1 ? '1 moldura' : n + ' molduras');
  const rotulo = nomeGrupo(grupo) + ': ' + molduras(r.molduras) + ', ' +
    molduras(r.vermelho) + ' com menos de 1 vara, ' + molduras(r.amarelo) + ' com menos de 3 varas';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={() => router.push('/deposito/' + grupo)}
      style={({ pressed }) => [s.grupo, compacto && s.grupoCompacto, estilo, pressed && s.apertado]}>
      {compacto ? (
        <View>
          <Text style={s.grupoTipo}>{grupo.startsWith('CR') ? 'Corr.' : 'Parede'}</Text>
          <Text style={s.grupoNumero}>{grupo.slice(2)}</Text>
        </View>
      ) : <Text style={s.grupoNome}>{nomeGrupo(grupo)}</Text>}
      <View style={s.selos}>
        {r.vermelho ? <Text style={[s.selo, { backgroundColor: COR_ESTADO.vermelho.fundo, color: COR_ESTADO.vermelho.texto }]}>{r.vermelho}</Text> : null}
        {r.amarelo ? <Text style={[s.selo, { backgroundColor: COR_ESTADO.amarelo.fundo, color: COR_ESTADO.amarelo.texto }]}>{r.amarelo}</Text> : null}
      </View>
      {compacto ? (
        <View>
          <Text style={[s.grupoConta, s.centro]}>{r.molduras}</Text>
          <Text style={[s.grupoConta, s.centro]}>mold.</Text>
        </View>
      ) : <Text style={s.grupoConta}>{molduras(r.molduras)}</Text>}
    </Pressable>
  );
}

export default function Deposito() {
  const visivel = useEstado((s) => s.visivel);
  const [aviso, setAviso] = useState('');
  const compacto = useWindowDimensions().width < 600;
  useFocusEffect(useCallback(() => () => setAviso(''), []));
  const porCasinha = useMemo(() => moldurasPorCasinha(visivel ? visivel.molduras : []), [visivel]);
  const praComprar = useMemo(
    () => (visivel ? listaDeCompras(visivel).reduce((n, g) => n + g.encomendas.length + g.acabando.length, 0) : 0),
    [visivel]
  );
  if (!visivel) return null;
  const escolher = (m) => {
    const local = normalizarCasinha(m.local);
    if (casinhaValida(local)) {
      setAviso('');
      router.push({ pathname: '/deposito/' + grupoDe(local), params: { piscar: local, moldura: m.codigo } });
      return;
    }
    setAviso(m.codigo + ' ainda não está em nenhuma casinha. Abra a casinha onde ela fica e toque em "Adicionar moldura".');
  };
  return (
    <ScrollView contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Depósito' }} />
      <BuscaMoldura
        molduras={visivel.molduras}
        rotulo="Achar moldura (código ou nome)"
        aoEscolher={escolher}
        aoDigitar={() => setAviso('')}
        detalhe={(m) => (casinhaValida(m.local) ? nomeCasinha(m.local) : 'Ainda sem casinha')}
      />
      {aviso ? <Text style={s.aviso} accessibilityLiveRegion="polite">{aviso}</Text> : null}
      <Text style={s.parede}>Parede do fundo</Text>
      <View style={s.fileira}>
        {CORREDORES.map((g) => <CartaoGrupo key={g} grupo={g} porCasinha={porCasinha} estilo={s.corredor} compacto={compacto} />)}
      </View>
      <View style={s.fileira}>
        <CartaoGrupo grupo="PR2" porCasinha={porCasinha} estilo={s.paredeCartao} />
        <View style={s.porta}><Text style={s.portaTexto}>Porta</Text></View>
        <CartaoGrupo grupo="PR1" porCasinha={porCasinha} estilo={s.paredeCartao} />
      </View>
      <Legenda />
      <View style={s.botoes}>
        <Botao icone="cart-outline" titulo={'Pra comprar (' + praComprar + ')'} variante="contorno" onPress={() => router.push('/compras')} estilo={s.botao} />
      </View>
      <BarraSync />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48 },
  aviso: { fontSize: tamanho.texto, color: cores.marinho, fontWeight: '600' },
  parede: { fontSize: tamanho.pequeno, color: cores.apagado, textAlign: 'center', fontWeight: '700' },
  fileira: { flexDirection: 'row', gap: 10 },
  grupo: {
    minHeight: 180, padding: 14, borderRadius: tamanho.raioCartao, backgroundColor: cores.cartao, borderWidth: 1.5,
    borderColor: cores.linhaForte, borderTopWidth: 5, borderTopColor: cores.marinho, justifyContent: 'space-between'
  },
  corredor: { flex: 1 },
  paredeCartao: { flex: 2, minHeight: 120 },
  porta: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: tamanho.raioCartao, borderWidth: 2, borderStyle: 'dashed', borderColor: cores.linhaForte },
  portaTexto: { fontSize: tamanho.texto, color: cores.apagado, fontWeight: '700' },
  grupoNome: { fontSize: 22, fontWeight: '800', color: cores.marinho },
  grupoCompacto: { paddingHorizontal: 6, paddingVertical: 10, alignItems: 'center' },
  grupoTipo: { fontSize: 13, fontWeight: '700', color: cores.apagado, textAlign: 'center' },
  grupoNumero: { fontSize: 30, fontWeight: '800', color: cores.marinho, textAlign: 'center' },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selo: { minWidth: 40, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 18, fontWeight: '800', textAlign: 'center', overflow: 'hidden' },
  grupoConta: { fontSize: tamanho.pequeno, color: cores.apagado, fontWeight: '600' },
  centro: { textAlign: 'center' },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  botao: { flexGrow: 1, flexShrink: 1, flexBasis: 260, minWidth: 0 },
  apertado: { backgroundColor: '#fbfaf6' }
});
