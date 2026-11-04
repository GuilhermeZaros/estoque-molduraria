import { View, Text, StyleSheet } from 'react-native';
import { cores, tamanho } from '../tema';

export function Cartao({ titulo, direita, children, estilo }) {
  return (
    <View style={[s.cartao, estilo]}>
      {titulo ? (
        <View style={s.topo}>
          <Text style={s.titulo} accessibilityRole="header">{titulo}</Text>
          {direita || null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao, borderRadius: tamanho.raioCartao, borderWidth: 1, borderColor: cores.linha,
    padding: 18, gap: 14
  },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titulo: { flexShrink: 1, fontSize: tamanho.pequeno, fontWeight: '800', color: cores.apagado, letterSpacing: 0.3 }
});
