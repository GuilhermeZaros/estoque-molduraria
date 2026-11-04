import { useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { central } from '../../src/estado';
import { cofre } from '../../src/senhaFinanceiro';
import { CATEGORIAS, FORMAS, gastoVazio, validarGasto, dadosDoGasto } from '../../src/financeiro';
import { Cartao } from '../../src/componentes/Cartao';
import { Campo } from '../../src/componentes/Campo';
import { CampoData } from '../../src/componentes/CampoData';
import { Botao } from '../../src/componentes/Botao';
import { GrupoPilulas } from '../../src/componentes/Pilula';
import { SenhaExpirou } from '../../src/componentes/SenhaExpirou';
import { cores, tamanho } from '../../src/tema';

const opcoes = (lista) => lista.map((x) => ({ valor: x, titulo: x }));

export default function LancarGasto() {
  const [liberado] = useState(() => !!cofre.ler());
  const [f, setF] = useState(() => gastoVazio());
  const [erro, setErro] = useState('');
  if (!liberado) return <SenhaExpirou titulo="Lançar gasto" />;
  const mudar = (campos) => {
    setErro('');
    setF((a) => ({ ...a, ...campos }));
  };
  const salvar = () => {
    const problema = validarGasto(f);
    if (problema) {
      setErro(problema);
      return;
    }
    cofre.ler();
    central.registrar('lancarGasto', dadosDoGasto(f));
    router.back();
  };
  return (
    <ScrollView contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Lançar gasto' }} />
      <Cartao titulo="GASTO">
        <Campo rotulo="O que foi" valor={f.descricao} aoMudar={(v) => mudar({ descricao: v })} autoCapitalize="sentences" placeholder="Ex.: conta de luz" />
        <Campo rotulo="Valor (R$)" valor={f.valor} aoMudar={(v) => mudar({ valor: v })} teclado="decimal-pad" placeholder="0,00" />
        <CampoData valor={f.data} aoMudar={(v) => mudar({ data: v })} />
        <Text style={s.rotulo}>De quem é o gasto</Text>
        <GrupoPilulas
          opcoes={[{ valor: 'loja', titulo: 'Da loja' }, { valor: 'pessoal', titulo: 'Pessoal' }]}
          valor={f.tipo}
          aoMudar={(v) => mudar({ tipo: v })}
        />
      </Cartao>
      <Cartao titulo="CATEGORIA">
        <GrupoPilulas opcoes={opcoes(CATEGORIAS)} valor={f.categoria} aoMudar={(v) => mudar({ categoria: v })} />
      </Cartao>
      <Cartao titulo="COMO PAGOU">
        <GrupoPilulas opcoes={opcoes(FORMAS)} valor={f.pagamento} aoMudar={(v) => mudar({ pagamento: v })} />
        <Campo rotulo="Observação" valor={f.obs} aoMudar={(v) => mudar({ obs: v })} autoCapitalize="sentences" multilinha />
      </Cartao>
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      <Botao grande icone="content-save-outline" titulo="Lançar gasto" variante="ouro" onPress={salvar} />
      <Botao titulo="Voltar sem lançar" variante="contorno" onPress={() => router.back()} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 800, alignSelf: 'center' },
  rotulo: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' }
});
