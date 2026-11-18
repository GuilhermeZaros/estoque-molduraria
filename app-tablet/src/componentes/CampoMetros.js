import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Botao } from './Botao';
import { GrupoPilulas } from './Pilula';
import { totalMetros, formatarMetros, varasTexto, pedacoVazio, lerPedaco, numeroDoPerfil, pedacosDoValor } from '../varas';
import { cores, tamanho } from '../tema';

const PONTAS = [
  { valor: true, titulo: 'Já desencabeçado' },
  { valor: false, titulo: 'Ainda não desencabeçado' }
];

function notaDoPedaco(p, lido, perfilCm) {
  if (!lido) return null;
  if (!lido.ok) return { erro: true, texto: 'Digite em metros, por exemplo 0,50. Pedaço não passa de 2,70 m.' };
  if (p.desencabecado !== false) return null;
  if (!numeroDoPerfil(perfilCm)) return { erro: true, texto: 'Preencha a largura do perfil pra descontar a ponta.' };
  const cm = String(Number((lido.ponta * 100).toFixed(1))).replace('.', ',');
  return { erro: false, texto: 'Desconta ' + cm + ' cm da ponta: fica ' + formatarMetros(lido.liquido) };
}

function Pedaco({ p, i, perfilCm, aoMudar, aoTirar }) {
  const nota = notaDoPedaco(p, lerPedaco(p, perfilCm), perfilCm);
  return (
    <View style={s.pedaco}>
      <View style={s.pedacoLinha}>
        <TextInput
          value={p.metros}
          onChangeText={(t) => aoMudar({ metros: t })}
          keyboardType="decimal-pad"
          placeholder="0,50"
          accessibilityLabel={'Tamanho do pedaço ' + (i + 1) + ', em metros'}
          style={[s.entrada, s.entradaPedaco]}
        />
        <Text style={s.unidade}>m</Text>
        <Botao titulo="Tirar" variante="contorno" rotulo={'Tirar o pedaço ' + (i + 1)} onPress={aoTirar} />
      </View>
      <GrupoPilulas opcoes={PONTAS} valor={p.desencabecado !== false} aoMudar={(d) => aoMudar({ desencabecado: d })} />
      {nota ? <Text style={[s.nota, nota.erro && s.notaErro]}>{nota.texto}</Text> : null}
    </View>
  );
}

export function CampoMetros({ valor, aoMudar, rotulo, pedacos: comPedacos = false, perfilCm }) {
  const v = valor || { varas: '', extra: '', pedacos: [] };
  const lista = Array.isArray(v.pedacos) ? v.pedacos : [];
  const varas = Number(v.varas) || 0;
  const total = totalMetros(v, perfilCm);
  const mudarVaras = (n) => aoMudar({ ...v, varas: n > 0 ? String(n) : '' });
  const mudarPedaco = (i, mudar) => aoMudar({ ...v, pedacos: lista.map((p, j) => (j === i ? { ...p, ...mudar } : p)) });
  const tirarPedaco = (i) => aoMudar({ ...v, pedacos: lista.filter((_, j) => j !== i) });
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
        {!comPedacos ? (
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
        ) : null}
      </View>
      {comPedacos ? (
        <View style={s.pedacos}>
          <Text style={s.legenda}>Pedaços soltos</Text>
          {lista.map((p, i) => (
            <Pedaco key={i} p={p} i={i} perfilCm={perfilCm} aoMudar={(mudar) => mudarPedaco(i, mudar)} aoTirar={() => tirarPedaco(i)} />
          ))}
          <Botao
            icone="plus"
            titulo={lista.length ? 'Adicionar outro pedaço' : 'Adicionar pedaço solto'}
            variante="contorno"
            onPress={() => aoMudar({ ...v, pedacos: [...lista, pedacoVazio()] })}
          />
        </View>
      ) : null}
      <Text style={[s.total, total == null && s.totalVazio]} accessibilityLiveRegion="polite">
        {total == null
          ? (comPedacos ? 'Digite as varas ou os pedaços' : 'Digite as varas ou os metros')
          : 'Total: ' + formatarMetros(total) + ' (' + varasTexto(total, comPedacos ? pedacosDoValor(v, perfilCm) : undefined) + ')'}
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
  pedacos: { gap: 10 },
  pedaco: { gap: 8, padding: 12, borderRadius: tamanho.raio, borderWidth: 1.5, borderColor: cores.linha, backgroundColor: cores.cartao },
  pedacoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entradaPedaco: { flex: 1, minWidth: 0 },
  unidade: { fontSize: tamanho.texto, fontWeight: '700', color: cores.apagado },
  nota: { fontSize: tamanho.pequeno, color: cores.marinho },
  notaErro: { color: cores.vermelho, fontWeight: '700' },
  total: { fontSize: tamanho.texto, fontWeight: '700', color: cores.marinho },
  totalVazio: { color: cores.apagado, fontWeight: '500' }
});
