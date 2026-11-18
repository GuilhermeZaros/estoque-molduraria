import { useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { central } from '../../src/estado';
import { cofre } from '../../src/senhaFinanceiro';
import { vendaVazia, validarVenda, dadosDaVenda, vendaDoLancamento, lerLancamento } from '../../src/financeiro';
import { formatarReais, lerValor } from '../../src/formato';
import { Dialogo } from '../../src/componentes/Dialogo';
import { Cartao } from '../../src/componentes/Cartao';
import { Campo } from '../../src/componentes/Campo';
import { CampoData } from '../../src/componentes/CampoData';
import { Botao } from '../../src/componentes/Botao';
import { FormaRecebimento } from '../../src/componentes/FormaRecebimento';
import { SenhaExpirou } from '../../src/componentes/SenhaExpirou';
import { cores, tamanho } from '../../src/tema';

export default function LancarVenda() {
  const { editar } = useLocalSearchParams();
  const [original] = useState(() => lerLancamento(editar));
  const [liberado] = useState(() => !!cofre.ler());
  const [f, setF] = useState(() => (original ? vendaDoLancamento(original) : vendaVazia()));
  const [erro, setErro] = useState('');
  const [apagando, setApagando] = useState(false);
  const titulo = original ? 'Editar venda' : 'Lançar venda';
  if (!liberado) return <SenhaExpirou titulo={titulo} />;
  const mudar = (campos) => {
    setErro('');
    setF((a) => ({ ...a, ...campos }));
  };
  const salvar = () => {
    const problema = validarVenda(f);
    if (problema) {
      setErro(problema);
      return;
    }
    cofre.ler();
    if (original) central.registrar('editarLancamento', { lancamento: 'entrada', id: original.id, ...dadosDaVenda(f) });
    else central.registrar('lancarVenda', dadosDaVenda(f));
    router.back();
  };
  const apagar = () => {
    cofre.ler();
    central.registrar('apagarLancamento', { lancamento: 'entrada', id: original.id });
    setApagando(false);
    router.back();
  };
  return (
    <ScrollView contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: titulo }} />
      {original ? null : (
        <Text style={s.nota}>
          Use pra venda que não passou pelo orçamento do app. Venda paga no fechamento e ordem entregue na oficina já entram sozinhas.
        </Text>
      )}
      <Cartao titulo="VENDA">
        <Campo rotulo="Valor cobrado (R$)" valor={f.valor} aoMudar={(v) => mudar({ valor: v })} teclado="decimal-pad" placeholder="0,00" />
        <CampoData valor={f.data} aoMudar={(v) => mudar({ data: v })} />
        <Campo rotulo="Cliente" valor={f.cliente} aoMudar={(v) => mudar({ cliente: v })} autoCapitalize="words" />
      </Cartao>
      <Cartao titulo="COMO RECEBEU">
        <FormaRecebimento titulo="" valor={lerValor(f.valor)} forma={f.forma_pagamento} aoMudar={(v) => mudar({ forma_pagamento: v })} />
        <Campo rotulo="Observação" valor={f.obs} aoMudar={(v) => mudar({ obs: v })} autoCapitalize="sentences" multilinha />
      </Cartao>
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      <Botao grande icone="content-save-outline" titulo={original ? 'Salvar mudanças' : 'Lançar venda'} variante="ouro" onPress={salvar} />
      {original ? <Botao icone="trash-can-outline" titulo="Apagar esta venda" variante="perigo" onPress={() => setApagando(true)} /> : null}
      <Botao titulo={original ? 'Voltar sem mudar' : 'Voltar sem lançar'} variante="contorno" onPress={() => router.back()} />
      <Dialogo visivel={apagando} titulo="Apagar esta venda?" aoFechar={() => setApagando(false)}>
        {original ? (
          <Text style={s.dialogo}>
            {(original.cliente || 'Venda') + ', ' + formatarReais(original.valor) + ', de ' + original.data + '. Sai do financeiro e não dá pra desfazer.'}
          </Text>
        ) : null}
        <Botao grande icone="trash-can-outline" titulo="Sim, apagar" variante="perigo" onPress={apagar} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setApagando(false)} />
      </Dialogo>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 800, alignSelf: 'center' },
  nota: { fontSize: tamanho.pequeno, color: cores.apagado },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' },
  dialogo: { fontSize: tamanho.texto, color: cores.tinta }
});
