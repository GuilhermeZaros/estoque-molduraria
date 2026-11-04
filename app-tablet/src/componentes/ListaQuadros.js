import { View, Text, Pressable, StyleSheet } from 'react-native';
import { rotuloQuadro, nomeMaterial } from '../orcamento';
import { formatarReais, formatarNumero } from '../formato';
import { Botao } from './Botao';
import { AVISO, cores, tamanho } from '../tema';

function materiais(pacote, q, r) {
  const partes = [];
  const moldura = q.moldura ? pacote.molduras.find((m) => m.codigo === q.moldura) : null;
  if (moldura) partes.push(moldura.nome);
  if (r && r.ok && r.borda > 0) partes.push('paspatur ' + formatarNumero(r.borda) + ' cm');
  if (q.vidro) partes.push(nomeMaterial(pacote, q.vidro) + (q.vidro_duplo ? ' (2 vidros)' : ''));
  if (q.chapa && !q.vidro_duplo) partes.push(nomeMaterial(pacote, q.chapa));
  if (q.espelho) partes.push(nomeMaterial(pacote, q.espelho));
  const troca = (q.tipo === 'reforma' && partes.length ? 'troca: ' : '') + partes.join(' · ');
  const servicos = (r.calc.servicos || []).map((s) => s.descricao || 'serviço');
  return [troca, ...servicos].filter(Boolean).join(' · ');
}

function CartaoQuadro({ q, n, r, aviso, escolhido, pacote, onPress }) {
  const titulo = n + '. ' + rotuloQuadro(q) + (q.quantidade > 1 ? ' · ' + q.quantidade + ' iguais' : '');
  const valor = r && r.ok ? formatarReais(r.calc.valor_total) : '';
  const detalhe = r && r.ok ? materiais(pacote, q, r) : r ? r.erro : '';
  const cor = aviso ? AVISO[aviso.cor].borda : cores.linhaForte;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo + (valor ? ', ' + valor : '') + (detalhe ? ', ' + detalhe : '')}
      accessibilityState={{ selected: escolhido }}
      onPress={onPress}
      style={({ pressed }) => [s.cartao, escolhido && s.escolhido, { borderLeftColor: cor }, pressed && s.apertado]}>
      <View style={s.linha}>
        <Text style={s.titulo} numberOfLines={2}>{titulo}</Text>
        <Text style={s.valor}>{valor}</Text>
      </View>
      {detalhe ? <Text style={[s.detalhe, !(r && r.ok) && s.falta]} numberOfLines={2}>{detalhe}</Text> : null}
    </Pressable>
  );
}

export function ListaQuadros({ quadros, rr, avisos, sel, pacote, aoEscolher, aoAdicionar }) {
  return (
    <View style={s.caixa}>
      {quadros.map((q, i) => (
        <CartaoQuadro
          key={q.chave}
          q={q}
          n={i + 1}
          r={rr ? rr.quadros[i] : null}
          aviso={q.moldura ? avisos.get(q.moldura) : null}
          escolhido={i === sel}
          pacote={pacote}
          onPress={() => aoEscolher(i)}
        />
      ))}
      <View style={s.adicionar}>
        <Botao icone="plus" titulo="Quadro" rotulo="Adicionar quadro" variante="contorno" onPress={() => aoAdicionar('quadro')} estilo={s.mais} />
        <Botao icone="plus" titulo="Reforma" rotulo="Adicionar reforma" variante="contorno" onPress={() => aoAdicionar('reforma')} estilo={s.mais} />
        <Botao icone="plus" titulo="Objeto" rotulo="Adicionar objeto" variante="contorno" onPress={() => aoAdicionar('objeto')} estilo={s.mais} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 10 },
  cartao: {
    minHeight: tamanho.toque, paddingVertical: 12, paddingHorizontal: 14, gap: 4, borderRadius: tamanho.raio,
    borderWidth: 1.5, borderColor: cores.linha, borderLeftWidth: 6, backgroundColor: cores.cartao
  },
  escolhido: { borderColor: cores.ouro, borderWidth: 2.5, backgroundColor: '#fffaf0' },
  apertado: { backgroundColor: '#fbfaf6' },
  linha: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  titulo: { flex: 1, fontSize: 19, fontWeight: '800', color: cores.marinho },
  valor: { fontSize: 19, fontWeight: '800', color: cores.tinta },
  detalhe: { fontSize: tamanho.pequeno, color: cores.apagado },
  falta: { color: cores.vermelho, fontWeight: '700' },
  adicionar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  mais: { flexGrow: 1, flexBasis: 130, minHeight: 56, paddingHorizontal: 12 }
});
