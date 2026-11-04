import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { cores, tamanho } from '../tema';

export function Campo({ rotulo, valor, aoMudar, teclado = 'default', dica, autoCapitalize = 'none', placeholder, multilinha = false }) {
  const [focado, setFocado] = useState(false);
  return (
    <View style={s.caixa}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        keyboardType={teclado}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor="#8a8f98"
        multiline={multilinha}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        accessibilityLabel={rotulo}
        accessibilityHint={dica}
        style={[s.entrada, multilinha && s.multilinha, focado && s.focado]}
      />
      {dica ? <Text style={s.dica}>{dica}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 6 },
  rotulo: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  entrada: {
    minHeight: tamanho.toque, borderWidth: 1.5, borderColor: cores.linhaForte, borderRadius: tamanho.raio,
    paddingHorizontal: 16, fontSize: 22, color: cores.tinta, backgroundColor: '#ffffff'
  },
  multilinha: { minHeight: 96, paddingVertical: 12, textAlignVertical: 'top' },
  focado: { borderColor: cores.marinho, borderWidth: 2 },
  dica: { fontSize: tamanho.pequeno, color: cores.apagado }
});
