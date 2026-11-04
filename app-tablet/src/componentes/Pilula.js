import { View, Pressable, Text, StyleSheet } from 'react-native';
import { cores } from '../tema';

export function Pilula({ titulo, escolhida = false, onPress, rotulo }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo || titulo}
      accessibilityState={{ selected: escolhida }}
      onPress={onPress}
      style={({ pressed }) => [s.pilula, escolhida && s.escolhida, pressed && s.apertada]}>
      <Text style={[s.texto, escolhida && s.textoEscolhida]}>{titulo}</Text>
    </Pressable>
  );
}

export function GrupoPilulas({ opcoes, valor, aoMudar }) {
  return (
    <View style={s.grupo}>
      {opcoes.map((o) => (
        <Pilula key={String(o.valor)} titulo={o.titulo} escolhida={o.valor === valor} onPress={() => aoMudar(o.valor)} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pilula: {
    minHeight: 52, paddingHorizontal: 22, borderRadius: 26, borderWidth: 1.5, borderColor: cores.linhaForte,
    backgroundColor: cores.cartao, alignItems: 'center', justifyContent: 'center'
  },
  escolhida: { backgroundColor: cores.marinho, borderColor: cores.marinho },
  apertada: { opacity: 0.8 },
  texto: { fontSize: 18, fontWeight: '700', color: cores.marinho },
  textoEscolhida: { color: '#ffffff' }
});
