import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Botao } from './Botao';
import { totalMetros, formatarMetros, varasTexto } from '../varas';
import { cores, tamanho } from '../tema';

export function CampoMetros({ valor, aoMudar, rotulo }) {
  const v = valor || { varas: '', extra: '' };
  const varas = Number(v.varas) || 0;
  const total = totalMetros(v);
  const mudarVaras = (n) => aoMudar({ ...v, varas: n > 0 ? String(n) : '' });
  return (
    <View style={s.caixa}>
      {rotulo ? <Text style={s.rotulo}>{rotulo}</Text> : null}
      <View style={s.linha}>
        <View style={s.bloco}>
          <Text style={s.legenda}>Varas de 2,70 m</Text>
          <View style={s.passo}>
            <Botao titulo="−" rotulo="Uma vara a menos" variante="contorno" onPress={() => mudarVaras(varas - 1)} estilo={s.botaoPasso} />
            <TextInput
              value={v.varas}
              onChangeText={(t) => aoMudar({ ...v, varas: t.replace(/\D/g, '') })}
              keyboardType="number-pad"
              placeholder="0"
              accessibilityLabel="Varas inteiras"
              style={[s.entrada, s.entradaVaras]}
            />
            <Botao titulo="+" rotulo="Uma vara a mais" variante="contorno" onPress={() => mudarVaras(varas + 1)} estilo={s.botaoPasso} />
          </View>
        </View>
        <View style={s.bloco}>
          <Text style={s.legenda}>Mais metros (pedaços)</Text>
          <TextInput
            value={v.extra}
            onChangeText={(t) => aoMudar({ ...v, extra: t })}
            keyboardType="decimal-pad"
            placeholder="0,00"
            accessibilityLabel="Metros a mais, em pedaços"
            style={s.entrada}
          />
        </View>
      </View>
      <Text style={[s.total, total == null && s.totalVazio]} accessibilityLiveRegion="polite">
        {total == null ? 'Digite as varas ou os metros' : 'Total: ' + formatarMetros(total) + ' (' + varasTexto(total) + ')'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 10, width: '100%' },
  rotulo: { fontSize: tamanho.texto, fontWeight: '700', color: cores.tinta },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  bloco: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, gap: 6 },
  legenda: { fontSize: tamanho.pequeno, color: cores.apagado, fontWeight: '600' },
  passo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botaoPasso: { minWidth: tamanho.toque, paddingHorizontal: 0 },
  entrada: {
    minHeight: tamanho.toque, borderWidth: 2, borderColor: cores.linha, borderRadius: tamanho.raio,
    paddingHorizontal: 16, fontSize: 24, color: cores.tinta, backgroundColor: '#ffffff'
  },
  entradaVaras: { flex: 1, minWidth: 0, textAlign: 'center' },
  total: { fontSize: tamanho.texto, fontWeight: '700', color: cores.marinho },
  totalVazio: { color: cores.apagado, fontWeight: '500' }
});
