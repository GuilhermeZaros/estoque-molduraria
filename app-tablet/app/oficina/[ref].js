import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useEstado, central } from '../../src/estado';
import {
  PRAZOS, prazoDe, ordemVazia, deOrdem, validarOrdem, dadosDaOrdem, chaveDaOrdem, alvoDaOrdem, fotosDaOrdem, operacoesDasFotos
} from '../../src/oficina';
import { Cartao } from '../../src/componentes/Cartao';
import { CartaoFotos } from '../../src/componentes/FotosOrdem';
import { Campo } from '../../src/componentes/Campo';
import { Botao } from '../../src/componentes/Botao';
import { Pilula } from '../../src/componentes/Pilula';
import { cores, tamanho } from '../../src/tema';

export default function EditorOrdem() {
  const { ref } = useLocalSearchParams();
  const visivel = useEstado((s) => s.visivel);
  const nova = ref === 'nova';
  const ordem = !nova && visivel ? (visivel.oficina || []).find((o) => chaveDaOrdem(o) === String(ref)) : null;
  const [f, setF] = useState(() => (ordem ? deOrdem(ordem) : ordemVazia()));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  if (!visivel) return null;
  if (!nova && !ordem) {
    return (
      <View style={s.sumiu}>
        <Stack.Screen options={{ title: 'Ordem de serviço' }} />
        <Text style={s.texto}>Essa ordem não está mais na oficina.</Text>
        <Botao titulo="Voltar" onPress={() => router.back()} />
      </View>
    );
  }
  const mudar = (campos) => {
    setErro('');
    setF((a) => ({ ...a, ...campos }));
  };
  const mudarFotos = (mudarLista) => {
    setErro('');
    setF((a) => ({ ...a, fotos: mudarLista(a.fotos) }));
  };
  const salvar = async () => {
    if (salvando) return;
    const problema = validarOrdem(f);
    if (problema) {
      setErro(problema);
      return;
    }
    setSalvando(true);
    const alvo = nova ? { ref_app: Crypto.randomUUID() } : alvoDaOrdem(ordem);
    const dados = dadosDaOrdem(f, alvo);
    await central.registrar(nova ? 'criarOrdem' : 'editarOrdem', dados);
    for (const o of operacoesDasFotos(nova ? [] : fotosDaOrdem(ordem), f.fotos, alvo, dados.cliente)) {
      await central.registrar(o.acao, o.dados, o.extra);
    }
    router.back();
  };
  const titulo = nova ? 'Nova ordem de serviço' : 'Ordem ' + (ordem.id || 'nova');

  return (
    <ScrollView contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: titulo }} />
      <Cartao titulo="CLIENTE">
        <Campo rotulo="Nome" valor={f.cliente} aoMudar={(v) => mudar({ cliente: v })} autoCapitalize="words" />
        <Campo
          rotulo="WhatsApp com DDD"
          valor={f.telefone}
          aoMudar={(v) => mudar({ telefone: v })}
          teclado="phone-pad"
          placeholder="11 98888 7777"
          dica="A Julia usa esse número pra avisar quando ficar pronto."
        />
      </Cartao>
      <CartaoFotos fotos={f.fotos} aoMudar={mudarFotos} />
      <Cartao titulo="SERVIÇO">
        <Campo
          rotulo="O que é pra fazer"
          valor={f.descricao}
          aoMudar={(v) => mudar({ descricao: v })}
          autoCapitalize="sentences"
          multilinha
          placeholder="Ex.: 30 x 40, moldura preta, vidro simples"
        />
        <Text style={s.rotulo}>Prazo</Text>
        <View style={s.pilulas}>
          {PRAZOS.map((p) => {
            const data = prazoDe(p.dias);
            return (
              <Pilula
                key={p.dias}
                titulo={p.titulo}
                escolhida={f.prazo === data}
                rotulo={p.titulo + ', ' + data}
                onPress={() => mudar({ prazo: data })}
              />
            );
          })}
        </View>
        <Campo
          rotulo="Ou digite a data"
          valor={f.prazo}
          aoMudar={(v) => mudar({ prazo: v })}
          teclado="numbers-and-punctuation"
          placeholder="dia/mês/ano"
          dica="Deixe em branco se não tiver prazo."
        />
        <Campo
          rotulo="Valor (R$)"
          valor={f.valor}
          aoMudar={(v) => mudar({ valor: v })}
          teclado="decimal-pad"
          placeholder="0,00"
          dica="Quando o cliente buscar, esse valor entra como venda no financeiro."
        />
      </Cartao>
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      <Botao grande icone="content-save-outline" titulo={nova ? 'Criar ordem' : 'Salvar'} variante="ouro" onPress={salvar} desativado={salvando} />
      <Botao titulo="Voltar sem salvar" variante="contorno" onPress={() => router.back()} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 800, alignSelf: 'center' },
  rotulo: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' },
  sumiu: { flex: 1, padding: 24, gap: 16, alignItems: 'flex-start' },
  texto: { fontSize: tamanho.texto, color: cores.tinta }
});
