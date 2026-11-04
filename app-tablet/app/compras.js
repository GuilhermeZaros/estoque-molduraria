import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useEstado, central } from '../src/estado';
import { listaDeCompras, textoCompras } from '../src/compras';
import { linkWhatsApp } from '../src/whatsapp';
import { abaterFaltas, corEstoque, nomeCasinha } from '../src/gerado/nucleo';
import { formatarMetros, totalMetros } from '../src/varas';
import { Cartao } from '../src/componentes/Cartao';
import { Botao } from '../src/componentes/Botao';
import { BarraSync } from '../src/componentes/BarraSync';
import { Dialogo } from '../src/componentes/Dialogo';
import { CampoMetros } from '../src/componentes/CampoMetros';
import { COR_ESTADO, cores, tamanho } from '../src/tema';

const VAZIO = { varas: '', extra: '' };

function Chegou({ onPress, nome }) {
  return <Botao titulo="Chegou" rotulo={'Chegou ' + nome} variante="contorno" onPress={onPress} estilo={s.chegou} />;
}

function Grupo({ g, aoErro, aoChegar }) {
  const mandar = async () => {
    try {
      await Linking.openURL(linkWhatsApp('', textoCompras(g)));
    } catch {
      aoErro('O WhatsApp não abriu neste tablet.');
    }
  };
  return (
    <Cartao titulo={g.marca.toUpperCase()}>
      {g.encomendas.length ? (
        <View style={s.bloco}>
          <Text style={s.subtitulo}>Encomendas de clientes</Text>
          {g.encomendas.map((e) => (
            <View key={e.codigo} style={s.item}>
              <View style={s.itemTextos}>
                <Text style={s.nome}><Text style={s.codigo}>{e.codigo}</Text>  {e.nome}</Text>
                {e.clientes.length ? <Text style={s.detalhe}>Pra {e.clientes.join(', ')}</Text> : null}
              </View>
              <Text style={s.metros}>{formatarMetros(e.metros)}</Text>
              <Chegou nome={e.nome} onPress={() => aoChegar(e.codigo)} />
            </View>
          ))}
        </View>
      ) : null}
      {g.acabando.length ? (
        <View style={s.bloco}>
          <Text style={s.subtitulo}>Acabando no depósito</Text>
          {g.acabando.map((m) => {
            const c = COR_ESTADO[corEstoque(m.estoque_m)];
            return (
              <View key={m.codigo} style={s.item}>
                <View style={s.itemTextos}>
                  <Text style={s.nome}><Text style={s.codigo}>{m.codigo}</Text>  {m.nome}</Text>
                  <Text style={s.detalhe}>{nomeCasinha(m.local)}</Text>
                </View>
                <Text style={[s.selo, { backgroundColor: c.fundo, color: c.texto }]}>{formatarMetros(m.estoque_m)}</Text>
                <Chegou nome={m.nome} onPress={() => aoChegar(m.codigo)} />
              </View>
            );
          })}
        </View>
      ) : null}
      <Botao icone="whatsapp" titulo="Mandar no WhatsApp" variante="contorno" onPress={mandar} />
    </Cartao>
  );
}

export default function Compras() {
  const visivel = useEstado((s) => s.visivel);
  const [erro, setErro] = useState('');
  const [chegando, setChegando] = useState(null);
  const [valor, setValor] = useState(VAZIO);
  const [aviso, setAviso] = useState('');
  const grupos = useMemo(() => (visivel ? listaDeCompras(visivel) : []), [visivel]);
  if (!visivel) return null;
  const m = chegando ? visivel.molduras.find((x) => x.codigo === chegando) : null;
  const faltas = m ? (visivel.compras_pendentes || []).filter((c) => c.moldura === m.codigo) : [];
  const total = totalMetros(valor);
  const abrir = (codigo) => { setValor(VAZIO); setAviso(''); setChegando(codigo); };
  const somar = () => {
    central.registrar('entradaMoldura', { codigo: m.codigo, metros: total });
    setChegando(null);
    const ab = abaterFaltas(total, faltas.map((f) => ({ id: f.id, metros: f.metros_faltando })));
    setAviso(ab.abatido > 0
      ? 'Chegou ' + formatarMetros(total) + ' de ' + m.nome + ': ' + formatarMetros(ab.abatido) + ' separados pra encomenda e ' + formatarMetros(ab.vai_pro_estoque) + ' no estoque.'
      : formatarMetros(total) + ' de ' + m.nome + ' somados no estoque.');
  };
  return (
    <ScrollView contentContainerStyle={s.tela}>
      <Stack.Screen options={{ title: 'Pra comprar' }} />
      <Text style={s.explica}>
        Encomendas são o que faltou nas vendas. Acabando é o que tem menos de 3 varas e já está numa casinha.
      </Text>
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      {aviso ? <Text style={s.ok} accessibilityLiveRegion="polite">{aviso}</Text> : null}
      {grupos.map((g) => <Grupo key={g.marca} g={g} aoErro={setErro} aoChegar={abrir} />)}
      {!grupos.length ? <Text style={s.vazio}>Nada pra comprar agora.</Text> : null}
      <BarraSync />

      <Dialogo visivel={!!m} titulo="Chegou mercadoria" aoFechar={() => setChegando(null)}>
        {m ? <Text style={s.qual}>{m.codigo} · {m.nome}</Text> : null}
        {m ? <Text style={s.detalhe}>{m.local ? 'Guardar em: ' + nomeCasinha(m.local) : 'Ainda sem casinha: abra a casinha onde ela fica e toque em Adicionar moldura.'}</Text> : null}
        {faltas.length ? (
          <Text style={s.encomenda}>
            Tem encomenda esperando esta moldura: {faltas.map((f) => formatarMetros(f.metros_faltando) + (f.cliente ? ' (' + f.cliente + ')' : '')).join(', ')}. O que chegar cobre isso primeiro.
          </Text>
        ) : null}
        <CampoMetros valor={valor} aoMudar={setValor} rotulo="Quanto chegou" />
        <Botao titulo="Somar no estoque" desativado={!(total > 0)} onPress={somar} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setChegando(null)} />
      </Dialogo>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  explica: { fontSize: tamanho.pequeno, color: cores.apagado },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' },
  bloco: { gap: 4 },
  subtitulo: { fontSize: 18, fontWeight: '800', color: cores.marinho, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: cores.linha },
  itemTextos: { flex: 1, gap: 2 },
  codigo: { color: cores.ouroTexto, fontWeight: '800' },
  nome: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  detalhe: { fontSize: tamanho.pequeno, color: cores.apagado },
  metros: { fontSize: tamanho.texto, fontWeight: '800', color: cores.vermelho },
  selo: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, fontSize: tamanho.pequeno, fontWeight: '800', overflow: 'hidden' },
  vazio: { fontSize: tamanho.texto, color: cores.apagado, textAlign: 'center', paddingVertical: 24 },
  chegou: { minHeight: 52, paddingHorizontal: 16 },
  ok: { fontSize: tamanho.texto, color: '#065f46', fontWeight: '700' },
  qual: { fontSize: 22, fontWeight: '800', color: cores.marinho },
  encomenda: { fontSize: tamanho.pequeno, color: cores.ouroTexto, fontWeight: '700' }
});
