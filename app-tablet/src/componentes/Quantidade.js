import { View, Text, StyleSheet } from 'react-native';
import { Botao } from './Botao';
import { cores, tamanho } from '../tema';

export function Quantidade({ valor, aoMudar, rotulo = 'Quantidade' }) {
  const n = Math.max(1, Math.round(Number(valor) || 1));
  return (
    <View style={s.caixa}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <View style={s.linha}>
        <Botao titulo="−" rotulo="Um quadro a menos" variante="contorno" desativado={n <= 1} onPress={() => aoMudar(n - 1)} estilo={s.botao} />
        <Text style={s.numero} accessibilityLabel={rotulo + ': ' + n} accessibilityLiveRegion="polite">{n}</Text>
        <Botao titulo="+" rotulo="Um quadro a mais" variante="contorno" onPress={() => aoMudar(n + 1)} estilo={s.botao} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 6 },
  rotulo: { fontSize: tamanho.texto, fontWeight: '700', color: cores.tinta },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botao: { minWidth: tamanho.toque, paddingHorizontal: 0 },
  numero: { minWidth: 56, textAlign: 'center', fontSize: 28, fontWeight: '800', color: cores.marinho }
});
