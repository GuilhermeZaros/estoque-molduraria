import { View, Text, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { Botao } from './Botao';
import { cores, tamanho } from '../tema';

export function SenhaExpirou({ titulo }) {
  return (
    <View style={s.caixa}>
      <Stack.Screen options={{ title: titulo }} />
      <Text style={s.texto}>A senha do financeiro expirou. Digite de novo pra continuar.</Text>
      <Botao titulo="Voltar pro financeiro" onPress={() => router.back()} />
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { flex: 1, padding: 24, gap: 16, alignItems: 'flex-start' },
  texto: { fontSize: tamanho.texto, color: cores.tinta }
});
