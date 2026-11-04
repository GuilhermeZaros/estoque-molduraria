import { View, Text, StyleSheet } from 'react-native';
import { useEstado, central } from '../estado';
import { descreverOperacao } from '../fila';
import { Botao } from './Botao';
import { cores, tamanho } from '../tema';

function hora(iso) {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function BarraSync() {
  const fila = useEstado((s) => s.fila);
  const falhas = useEstado((s) => s.falhas);
  const sync = useEstado((s) => s.sync);
  let texto = sync.ultimo_ok ? 'Planilha em dia às ' + hora(sync.ultimo_ok) : 'Ainda não falou com a planilha';
  if (sync.erro) texto = sync.erro;
  if (sync.trabalhando) texto = 'Conversando com a planilha...';
  const pendentes = fila.length
    ? ' · ' + fila.length + (fila.length === 1 ? ' gravação esperando' : ' gravações esperando')
    : '';
  return (
    <View style={s.caixa}>
      <View style={[s.barra, sync.erro && !sync.trabalhando && s.barraErro]}>
        <Text style={s.texto} accessibilityLiveRegion="polite">{texto}{pendentes}</Text>
        <Botao titulo="Atualizar" variante="contorno" onPress={() => central.sincronizar()} />
      </View>
      {falhas.map((f) => (
        <View key={f.id_op} style={s.falha}>
          <Text style={s.falhaTexto}>Não gravou ({descreverOperacao(f)}): {f.erro}</Text>
          <Botao titulo="Ok" variante="perigo" onPress={() => central.descartarFalha(f.id_op)} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 8 },
  barra: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: tamanho.raio,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: cores.linha
  },
  barraErro: { borderColor: cores.ouroEscuro, backgroundColor: '#fff8e1' },
  texto: { flex: 1, fontSize: tamanho.pequeno, color: cores.tinta },
  falha: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: tamanho.raio,
    backgroundColor: '#fdecec', borderWidth: 1, borderColor: cores.vermelho
  },
  falhaTexto: { flex: 1, fontSize: tamanho.pequeno, color: cores.vermelho, fontWeight: '600' }
});
