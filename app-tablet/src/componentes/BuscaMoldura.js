import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { buscarMolduras } from '../busca';
import { Icone } from './Icone';
import { cores, tamanho } from '../tema';

export function BuscaMoldura({ molduras, aoEscolher, aoDigitar, detalhe, rotulo = 'Buscar moldura', limite = 12, comFoto = false }) {
  const [termo, setTermo] = useState('');
  const achadas = buscarMolduras(molduras, termo, limite);
  const digitar = (texto) => {
    setTermo(texto);
    if (aoDigitar) aoDigitar(texto);
  };
  return (
    <View style={s.caixa}>
      <View style={s.campo}>
        <Icone nome="magnify" tamanho={26} cor={cores.apagado} />
        <TextInput
          value={termo}
          onChangeText={digitar}
          placeholder={rotulo}
          placeholderTextColor="#8a8f98"
          accessibilityLabel={rotulo}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={s.entrada}
        />
      </View>
      {achadas.length ? (
        <View style={s.lista}>
          {achadas.map((m, i) => (
            <Pressable
              key={m.codigo}
              accessibilityRole="button"
              accessibilityLabel={m.codigo + ', ' + m.nome + (detalhe ? ', ' + detalhe(m) : '')}
              onPress={() => { setTermo(''); aoEscolher(m); }}
              style={({ pressed }) => [s.item, i > 0 && s.separado, pressed && s.apertado]}>
              {comFoto ? (
                m.foto_url
                  ? <Image source={{ uri: m.foto_url }} style={s.foto} contentFit="cover" />
                  : <View style={[s.foto, s.semFoto]}><Icone nome="image-off-outline" tamanho={22} cor={cores.apagado} /></View>
              ) : null}
              <View style={s.textos}>
                <Text style={s.nome}><Text style={s.codigo}>{m.codigo}</Text>  {m.nome}</Text>
                {detalhe ? <Text style={s.detalhe}>{detalhe(m)}</Text> : null}
              </View>
              <Icone nome="chevron-right" tamanho={26} cor={cores.linhaForte} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {termo.trim() && !achadas.length ? <Text style={s.nada}>Nenhuma moldura com "{termo.trim()}".</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 8 },
  campo: {
    minHeight: tamanho.toque, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: cores.linhaForte, borderRadius: tamanho.raio, backgroundColor: '#ffffff'
  },
  entrada: { flex: 1, minHeight: tamanho.toque - 4, fontSize: tamanho.texto, color: cores.tinta },
  lista: { borderRadius: tamanho.raio, borderWidth: 1, borderColor: cores.linha, backgroundColor: '#ffffff', overflow: 'hidden' },
  item: { minHeight: tamanho.toque, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 10 },
  separado: { borderTopWidth: 1, borderTopColor: cores.linha },
  foto: { width: 56, height: 56, borderRadius: 10, backgroundColor: cores.fundo },
  semFoto: { alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  codigo: { color: cores.ouroTexto, fontWeight: '800' },
  nome: { fontSize: tamanho.texto, fontWeight: '700', color: cores.tinta },
  detalhe: { fontSize: tamanho.pequeno, color: cores.apagado },
  nada: { fontSize: tamanho.pequeno, color: cores.apagado },
  apertado: { backgroundColor: cores.fundo }
});
