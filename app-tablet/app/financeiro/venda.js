import { useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { central } from '../../src/estado';
import { cofre } from '../../src/senhaFinanceiro';
import { FORMAS, vendaVazia, validarVenda, dadosDaVenda } from '../../src/financeiro';
import { Cartao } from '../../src/componentes/Cartao';
import { Campo } from '../../src/componentes/Campo';
import { CampoData } from '../../src/componentes/CampoData';
import { Botao } from '../../src/componentes/Botao';
import { GrupoPilulas } from '../../src/componentes/Pilula';
import { SenhaExpirou } from '../../src/componentes/SenhaExpirou';
import { cores, tamanho } from '../../src/tema';

export default function LancarVenda() {
  const [liberado] = useState(() => !!cofre.ler());
  const [f, setF] = useState(() => vendaVazia());
  const [erro, setErro] = useState('');
  if (!liberado) return <SenhaExpirou titulo="Lançar venda" />;
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
    central.registrar('lancarVenda', dadosDaVenda(f));
    router.back();
  };
  return (
    <ScrollView contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Lançar venda' }} />
      <Text style={s.nota}>
        Use pra venda que não passou pelo orçamento do app. Venda fechada no orçamento e ordem entregue na oficina já entram sozinhas.
      </Text>
      <Cartao titulo="VENDA">
        <Campo rotulo="Valor (R$)" valor={f.valor} aoMudar={(v) => mudar({ valor: v })} teclado="decimal-pad" placeholder="0,00" />
        <CampoData valor={f.data} aoMudar={(v) => mudar({ data: v })} />
        <Campo rotulo="Cliente" valor={f.cliente} aoMudar={(v) => mudar({ cliente: v })} autoCapitalize="words" />
      </Cartao>
      <Cartao titulo="COMO RECEBEU">
        <GrupoPilulas opcoes={FORMAS.map((x) => ({ valor: x, titulo: x }))} valor={f.forma_pagamento} aoMudar={(v) => mudar({ forma_pagamento: v })} />
        <Campo rotulo="Observação" valor={f.obs} aoMudar={(v) => mudar({ obs: v })} autoCapitalize="sentences" multilinha />
      </Cartao>
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      <Botao grande icone="content-save-outline" titulo="Lançar venda" variante="ouro" onPress={salvar} />
      <Botao titulo="Voltar sem lançar" variante="contorno" onPress={() => router.back()} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 800, alignSelf: 'center' },
  nota: { fontSize: tamanho.pequeno, color: cores.apagado },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' }
});
