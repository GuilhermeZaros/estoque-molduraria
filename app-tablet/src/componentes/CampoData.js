import { View, Text, StyleSheet } from 'react-native';
import { DIAS, dataDe } from '../financeiro';
import { Pilula } from './Pilula';
import { Campo } from './Campo';
import { cores } from '../tema';

export function CampoData({ valor, aoMudar }) {
  return (
    <View style={s.caixa}>
      <Text style={s.rotulo}>Data</Text>
      <View style={s.pilulas}>
        {DIAS.map((d) => {
          const data = dataDe(d.valor);
          return (
            <Pilula key={d.valor} titulo={d.titulo} rotulo={d.titulo + ', ' + data} escolhida={valor === data} onPress={() => aoMudar(data)} />
          );
        })}
      </View>
      <Campo rotulo="Ou digite a data" valor={valor} aoMudar={aoMudar} teclado="numbers-and-punctuation" placeholder="dia/mês/ano" />
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 10 },
  rotulo: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }
});
