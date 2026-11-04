import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { corEstoque } from '../gerado/nucleo';
import { formatarMetros, varasTexto } from '../varas';
import { COR_ESTADO, cores, tamanho } from '../tema';

export function CartaoMoldura({ moldura, children, mostrarEstado = true }) {
  const c = COR_ESTADO[corEstoque(moldura.estoque_m)];
  const detalhes = ['Código ' + moldura.codigo];
  if (moldura.marca) detalhes.push(moldura.marca);
  if (moldura.perfil_cm) detalhes.push('perfil ' + String(moldura.perfil_cm).replace('.', ',') + ' cm');
  return (
    <View style={s.cartao}>
      <View style={s.topo}>
        {moldura.foto_url ? (
          <Image source={{ uri: moldura.foto_url }} style={s.foto} contentFit="cover" accessibilityLabel={'Foto da moldura ' + moldura.nome} />
        ) : (
          <View style={[s.foto, s.semFoto]}><Text style={s.semFotoTexto}>sem foto</Text></View>
        )}
        <View style={s.info}>
          <Text style={s.nome}>{moldura.nome}</Text>
          <Text style={s.detalhe}>{detalhes.join(' · ')}</Text>
          {mostrarEstado ? (
            <View style={s.estoque}>
              <Text style={s.metros}>{formatarMetros(moldura.estoque_m)}</Text>
              <Text style={s.varas}>{varasTexto(moldura.estoque_m)}</Text>
              <Text style={[s.estado, { backgroundColor: c.fundo, color: c.texto }]}>{c.nome}</Text>
            </View>
          ) : null}
          {!moldura.disponivel ? <Text style={s.fora}>Fora do catálogo (sem preço ou desligada)</Text> : null}
        </View>
      </View>
      {children ? <View style={s.acoes}>{children}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  cartao: { backgroundColor: cores.cartao, borderRadius: 18, padding: 16, gap: 16, borderWidth: 1, borderColor: cores.linha },
  topo: { flexDirection: 'row', gap: 16 },
  foto: { width: 120, height: 120, borderRadius: 12, backgroundColor: cores.fundo },
  semFoto: { alignItems: 'center', justifyContent: 'center' },
  semFotoTexto: { fontSize: tamanho.pequeno, color: cores.apagado },
  info: { flex: 1, gap: 6 },
  nome: { fontSize: 24, fontWeight: '800', color: cores.tinta },
  detalhe: { fontSize: tamanho.pequeno, color: cores.apagado },
  estoque: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  metros: { fontSize: 28, fontWeight: '800', color: cores.marinho },
  varas: { fontSize: tamanho.texto, color: cores.tinta },
  estado: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, fontSize: tamanho.pequeno, fontWeight: '700', overflow: 'hidden' },
  fora: { fontSize: tamanho.pequeno, color: cores.vermelho, fontWeight: '600' },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }
});
