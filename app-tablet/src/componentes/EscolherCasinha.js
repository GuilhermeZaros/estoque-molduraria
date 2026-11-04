import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Botao } from './Botao';
import { CORREDORES, PAREDES, linhasParaEscolher, nomeGrupo, rotuloCurto } from '../mapa';
import { nomeCasinha } from '../gerado/nucleo';
import { cores, tamanho } from '../tema';

export function EscolherCasinha({ atual, aoEscolher }) {
  const [grupo, setGrupo] = useState(null);
  return (
    <View style={s.caixa}>
      <View style={s.grade}>
        {[...CORREDORES, ...PAREDES].map((g) => (
          <Botao key={g} titulo={nomeGrupo(g)} variante={g === grupo ? 'primario' : 'contorno'} onPress={() => setGrupo(g)} />
        ))}
      </View>
      {grupo ? (
        linhasParaEscolher(grupo).map((linha) => (
          <View key={linha.titulo || grupo} style={s.linha}>
            {linha.titulo ? <Text style={s.titulo}>{linha.titulo}</Text> : null}
            <View style={s.grade}>
              {linha.casinhas.filter((c) => c !== atual).map((c) => (
                <Botao key={c} titulo={rotuloCurto(c)} rotulo={nomeCasinha(c)} variante="ouro" onPress={() => aoEscolher(c)} estilo={s.casinha} />
              ))}
            </View>
          </View>
        ))
      ) : (
        <Text style={s.dica}>Escolha o corredor ou a parede.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 12 },
  linha: { gap: 6 },
  titulo: { fontSize: tamanho.pequeno, color: cores.apagado, fontWeight: '700' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  casinha: { minWidth: 80 },
  dica: { fontSize: tamanho.pequeno, color: cores.apagado }
});
