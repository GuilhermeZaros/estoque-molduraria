import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Icone } from './Icone';
import { cores, tamanho } from '../tema';

const VARIANTES = {
  primario: { fundo: cores.marinho, texto: '#ffffff', borda: cores.marinho },
  ouro: { fundo: cores.ouro, texto: cores.marinho, borda: cores.ouro },
  contorno: { fundo: '#ffffff', texto: cores.marinho, borda: cores.marinho },
  perigo: { fundo: '#ffffff', texto: cores.vermelho, borda: cores.vermelho }
};

export function Botao({ titulo, onPress, variante = 'primario', desativado = false, grande = false, estilo, rotulo, icone }) {
  const v = VARIANTES[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo || titulo}
      accessibilityState={{ disabled: desativado }}
      disabled={desativado}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        grande && s.grande,
        { backgroundColor: v.fundo, borderColor: v.borda },
        desativado && s.desativado,
        pressed && !desativado && s.apertado,
        estilo
      ]}>
      <View style={s.conteudo}>
        {icone ? <Icone nome={icone} tamanho={grande ? 32 : 24} cor={v.texto} /> : null}
        <Text style={[s.texto, grande && s.textoGrande, { color: v.texto }]}>{titulo}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: tamanho.toque, paddingHorizontal: 20, borderRadius: tamanho.raio, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center'
  },
  grande: { minHeight: 88, paddingHorizontal: 28, borderRadius: 18 },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  texto: { fontSize: tamanho.texto, fontWeight: '700', textAlign: 'center' },
  textoGrande: { fontSize: 26 },
  desativado: { opacity: 0.45 },
  apertado: { opacity: 0.85, transform: [{ scale: 0.98 }] }
});
