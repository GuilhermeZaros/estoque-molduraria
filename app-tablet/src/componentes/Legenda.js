import { View, Text, StyleSheet } from 'react-native';
import { COR_ESTADO, cores, tamanho } from '../tema';

const ORDEM = ['verde', 'amarelo', 'vermelho', 'vazia'];

export function Legenda() {
  return (
    <View style={s.caixa}>
      {ORDEM.map((cor) => (
        <View key={cor} style={s.item}>
          <View style={[s.amostra, { backgroundColor: COR_ESTADO[cor].fundo }, cor === 'vazia' && s.borda]} />
          <Text style={s.texto}>{COR_ESTADO[cor].nome}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amostra: { width: 28, height: 28, borderRadius: 8 },
  borda: { borderWidth: 2, borderColor: '#d1d5db' },
  texto: { fontSize: tamanho.pequeno, color: cores.tinta }
});
