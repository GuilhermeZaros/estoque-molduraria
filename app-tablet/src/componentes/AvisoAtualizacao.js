import { useEffect } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Botao } from './Botao';
import { cores, tamanho } from '../tema';

function procurar() {
  return Updates.checkForUpdateAsync()
    .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : null))
    .catch(() => null);
}

function Aviso() {
  const { isUpdatePending } = Updates.useUpdates();
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (situacao) => {
      if (situacao === 'active') procurar();
    });
    return () => assinatura.remove();
  }, []);
  if (!isUpdatePending) return null;
  return (
    <View style={s.caixa} accessibilityLiveRegion="polite">
      <Text style={s.texto}>Tem versão nova do app pronta.</Text>
      <Botao titulo="Usar agora" variante="ouro" onPress={() => Updates.reloadAsync()} />
    </View>
  );
}

export function AvisoAtualizacao() {
  return Updates.isEnabled ? <Aviso /> : null;
}

function dataHora(d) {
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

export function VersaoApp() {
  const versao = (Constants.expoConfig && Constants.expoConfig.version) || '';
  const atualizacao = Updates.isEnabled && !Updates.isEmbeddedLaunch && Updates.createdAt
    ? ' · atualização de ' + dataHora(new Date(Updates.createdAt))
    : '';
  return <Text style={s.versao}>App {versao}{atualizacao}</Text>;
}

const s = StyleSheet.create({
  caixa: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: tamanho.raio,
    backgroundColor: cores.marinho
  },
  texto: { flex: 1, fontSize: tamanho.texto, color: '#ffffff', fontWeight: '700' },
  versao: { fontSize: tamanho.pequeno, color: cores.apagado, textAlign: 'center' }
});
