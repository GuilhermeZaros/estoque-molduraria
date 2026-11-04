import { useEffect } from 'react';
import { AppState, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { central } from '../src/estado';
import { cores } from '../src/tema';

const CINCO_MINUTOS = 5 * 60 * 1000;

export default function Layout() {
  useEffect(() => {
    central.iniciar();
    const relogio = setInterval(() => central.sincronizar(), CINCO_MINUTOS);
    const assinatura = AppState.addEventListener('change', (situacao) => {
      if (situacao === 'active') central.sincronizar();
    });
    return () => {
      clearInterval(relogio);
      assinatura.remove();
      central.parar();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerBackground: () => <View style={s.cabecalho} />,
          headerShadowVisible: false,
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontSize: 22, fontWeight: '700' },
          contentStyle: { backgroundColor: cores.fundo }
        }}>
        <Stack.Screen name="index" options={{ title: 'Vera Molduras' }} />
        <Stack.Screen name="cadastro" options={{ title: 'Moldura nova', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

const s = StyleSheet.create({
  cabecalho: { flex: 1, backgroundColor: cores.marinho, borderBottomWidth: 3, borderBottomColor: cores.ouro }
});
