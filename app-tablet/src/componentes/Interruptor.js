import { View, Pressable, Switch, Text, StyleSheet } from 'react-native';
import { cores, tamanho } from '../tema';

export function Interruptor({ titulo, dica, valor, aoMudar }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={titulo}
      accessibilityState={{ checked: !!valor }}
      onPress={() => aoMudar(!valor)}
      style={s.linha}>
      <View style={s.textos}>
        <Text style={s.titulo}>{titulo}</Text>
        {dica ? <Text style={s.dica}>{dica}</Text> : null}
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Switch value={!!valor} trackColor={{ false: cores.linhaForte, true: cores.ouro }} thumbColor="#ffffff" />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  linha: { minHeight: tamanho.toque, flexDirection: 'row', alignItems: 'center', gap: 16 },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  dica: { fontSize: tamanho.pequeno, color: cores.apagado }
});
