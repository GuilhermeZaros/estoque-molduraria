import { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { useEstado } from '../../src/estado';
import { filtrarAbertos } from '../../src/orcamento';
import { formatarReais, dataCurta } from '../../src/formato';
import { quadrosDoPedido, resumoQuadros } from '../../src/gerado/nucleo';
import { Botao } from '../../src/componentes/Botao';
import { Icone } from '../../src/componentes/Icone';
import { BarraSync } from '../../src/componentes/BarraSync';
import { cores, tamanho } from '../../src/tema';

function CartaoAberto({ o, nomes }) {
  const quadros = o.quadros && o.quadros.length ? o.quadros : quadrosDoPedido(o);
  const resumo = o.resumo || resumoQuadros(quadros);
  const nomeMoldura = quadros.length === 1 ? nomes.get(String(quadros[0].moldura)) : '';
  const medida = quadros.length === 1
    ? resumo + (/\d$/.test(resumo) ? ' cm' : '') + (nomeMoldura ? ' · ' + nomeMoldura : '')
    : quadros.length + ' quadros: ' + resumo;
  const cliente = String(o.cliente || '').trim() || 'Cliente sem nome';
  const quando = [o.atendente, dataCurta(o.data_criacao)].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cliente + ', ' + (o.id || 'sem número') + ', ' + medida + ', ' + formatarReais(o.valor_final)}
      onPress={() => router.push('/orcamento/' + encodeURIComponent(o.ref_app))}
      style={({ pressed }) => [s.cartao, pressed && s.apertado]}>
      <View style={s.cartaoTopo}>
        <Text style={s.cliente} numberOfLines={1}>{cliente}</Text>
        <Text style={s.valor}>{formatarReais(o.valor_final)}</Text>
      </View>
      <Text style={[s.numero, !o.id && s.semNumero]}>{o.id || 'Ainda não chegou na planilha'}</Text>
      <Text style={s.detalhe} numberOfLines={2}>{medida}</Text>
      {quando ? <Text style={s.quando}>{quando}</Text> : null}
    </Pressable>
  );
}

export default function Orcamentos() {
  const visivel = useEstado((s) => s.visivel);
  const [termo, setTermo] = useState('');
  const abertos = useMemo(() => filtrarAbertos(visivel ? visivel.orcamentos_abertos : [], termo), [visivel, termo]);
  const nomes = useMemo(() => new Map((visivel ? visivel.molduras : []).map((m) => [m.codigo, m.nome])), [visivel]);
  if (!visivel) return null;
  const total = (visivel.orcamentos_abertos || []).length;
  return (
    <ScrollView contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Orçamentos' }} />
      <Botao grande icone="plus" titulo="Novo orçamento" variante="ouro" onPress={() => router.push('/orcamento/novo')} />
      <Text style={s.secao} accessibilityRole="header">
        {total ? (total === 1 ? '1 orçamento aberto' : total + ' orçamentos abertos') : 'Orçamentos abertos'}
      </Text>
      {total ? (
        <View style={s.busca}>
          <Icone nome="magnify" tamanho={26} cor={cores.apagado} />
          <TextInput
            value={termo}
            onChangeText={setTermo}
            placeholder="Buscar por nome, telefone ou número"
            placeholderTextColor="#8a8f98"
            accessibilityLabel="Buscar orçamento por nome, telefone ou número"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={s.buscaEntrada}
          />
        </View>
      ) : null}
      <View style={s.lista}>
        {abertos.map((o) => <CartaoAberto key={o.ref_app} o={o} nomes={nomes} />)}
      </View>
      {!total ? <Text style={s.vazio}>Nenhum orçamento aberto.</Text> : null}
      {total && !abertos.length ? <Text style={s.vazio}>Nenhum orçamento com "{termo.trim()}".</Text> : null}
      <BarraSync />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  aviso: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' },
  secao: { fontSize: tamanho.pequeno, fontWeight: '800', color: cores.apagado, letterSpacing: 0.3, marginTop: 8 },
  busca: {
    minHeight: tamanho.toque, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: cores.linhaForte, borderRadius: tamanho.raio, backgroundColor: '#ffffff'
  },
  buscaEntrada: { flex: 1, minHeight: tamanho.toque - 4, fontSize: tamanho.texto, color: cores.tinta },
  lista: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cartao: {
    flexGrow: 1, flexShrink: 1, flexBasis: 420, minWidth: 0, minHeight: 120, padding: 16, gap: 4, backgroundColor: cores.cartao,
    borderRadius: tamanho.raioCartao, borderWidth: 1, borderColor: cores.linha, borderLeftWidth: 5, borderLeftColor: cores.ouro
  },
  cartaoTopo: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  cliente: { flex: 1, fontSize: 22, fontWeight: '800', color: cores.marinho },
  valor: { fontSize: 22, fontWeight: '800', color: cores.tinta },
  numero: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.ouroTexto },
  semNumero: { color: cores.apagado, fontWeight: '600' },
  detalhe: { fontSize: 18, color: cores.tinta },
  quando: { fontSize: tamanho.pequeno, color: cores.apagado },
  vazio: { fontSize: tamanho.texto, color: cores.apagado, textAlign: 'center', paddingVertical: 24 },
  apertado: { backgroundColor: '#fbfaf6' }
});
