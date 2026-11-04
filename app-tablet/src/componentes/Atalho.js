import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icone } from './Icone';
import { cores, tamanho } from '../tema';

export function Atalho({ icone, titulo, detalhe, onPress, desativado = false, destaque = false, alerta = false, estilo }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo + (detalhe ? ', ' + detalhe : '')}
      accessibilityState={{ disabled: desativado }}
      disabled={desativado}
      onPress={onPress}
      style={({ pressed }) => [s.cartao, destaque && s.destaque, desativado && s.desativado, pressed && !desativado && s.apertado, estilo]}>
      <View style={[s.selo, destaque && s.seloDestaque]}>
        <Icone nome={icone} tamanho={40} cor={destaque ? cores.marinho : cores.ouro} />
      </View>
      <View style={s.textos}>
        <Text style={s.titulo}>{titulo}</Text>
        {detalhe ? <Text style={[s.detalhe, alerta && s.alerta]}>{detalhe}</Text> : null}
      </View>
      <Icone nome="chevron-right" tamanho={32} cor={cores.linhaForte} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  cartao: {
    minHeight: 120, flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20,
    backgroundColor: cores.cartao, borderRadius: tamanho.raioCartao, borderWidth: 1, borderColor: cores.linha
  },
  destaque: { borderColor: cores.ouro, borderWidth: 2 },
  selo: { width: 72, height: 72, borderRadius: 18, backgroundColor: cores.marinho, alignItems: 'center', justifyContent: 'center' },
  seloDestaque: { backgroundColor: cores.ouro },
  textos: { flex: 1, gap: 4 },
  titulo: { fontSize: 26, fontWeight: '800', color: cores.marinho },
  detalhe: { fontSize: 18, color: cores.apagado },
  alerta: { color: cores.vermelho, fontWeight: '700' },
  desativado: { opacity: 0.5 },
  apertado: { transform: [{ scale: 0.99 }], backgroundColor: '#fbfaf6' }
});
