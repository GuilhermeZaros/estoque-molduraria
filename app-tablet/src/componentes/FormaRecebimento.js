import { View, Text, StyleSheet } from 'react-native';
import { GrupoPilulas } from './Pilula';
import { TIPOS_RECEBIMENTO, PARCELAS, formaDe, partesDaForma, textoRecebimento } from '../financeiro';
import { cores, tamanho } from '../tema';

export function FormaRecebimento({ valor, forma, aoMudar, titulo = 'Como o cliente pagou' }) {
  const { tipo, parcelas } = partesDaForma(forma);
  return (
    <View style={s.caixa}>
      {titulo ? <Text style={s.titulo}>{titulo}</Text> : null}
      <GrupoPilulas
        opcoes={TIPOS_RECEBIMENTO.map((t) => ({ valor: t, titulo: t }))}
        valor={tipo}
        aoMudar={(t) => aoMudar(formaDe(t, parcelas))}
      />
      {tipo === 'Crédito' ? (
        <>
          <Text style={s.sub}>Em quantas vezes</Text>
          <GrupoPilulas
            opcoes={PARCELAS.map((n) => ({ valor: n, titulo: n + 'x' }))}
            valor={parcelas}
            aoMudar={(n) => aoMudar(formaDe('Crédito', n))}
          />
        </>
      ) : null}
      <Text style={[s.dica, !tipo && s.falta]}>
        {tipo ? textoRecebimento(valor, forma) : 'Escolha como pagou pra lançar no financeiro.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 10 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  sub: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  dica: { fontSize: tamanho.pequeno, color: cores.apagado },
  falta: { color: cores.ouroTexto, fontWeight: '700' }
});
