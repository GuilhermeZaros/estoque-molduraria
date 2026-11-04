import { View, Text, StyleSheet } from 'react-native';
import { Icone } from './Icone';
import { AVISO, tamanho } from '../tema';

const ICONE = { vermelho: 'alert-outline', amarelo: 'alert-outline', verde: 'check-circle-outline' };

export function AvisoMoldura({ aviso }) {
  if (!aviso) return null;
  const c = AVISO[aviso.cor];
  return (
    <View style={[s.caixa, { backgroundColor: c.fundo, borderColor: c.borda }]} accessibilityLiveRegion="polite">
      <Icone nome={ICONE[aviso.cor]} tamanho={30} cor={c.borda} />
      <View style={s.textos}>
        <Text style={[s.titulo, { color: c.texto }]}>{aviso.titulo}</Text>
        <Text style={[s.texto, { color: c.texto }]}>{aviso.texto}</Text>
        <Text style={[s.lugar, { color: c.texto }]}>
          {aviso.lugar}{aviso.naoConferida ? ': o estoque dessa moldura ainda não foi conferido' : ''}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: tamanho.raio, borderWidth: 1.5, borderLeftWidth: 6 },
  textos: { flex: 1, gap: 4 },
  titulo: { fontSize: tamanho.texto, fontWeight: '800' },
  texto: { fontSize: tamanho.pequeno, fontWeight: '600' },
  lugar: { fontSize: tamanho.pequeno }
});
