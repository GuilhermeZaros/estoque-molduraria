import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useEstado, central } from '../src/estado';
import { Atalho } from '../src/componentes/Atalho';
import { BarraSync } from '../src/componentes/BarraSync';
import { AvisoAtualizacao, VersaoApp } from '../src/componentes/AvisoAtualizacao';
import { listaDeCompras } from '../src/compras';
import { resumoOficina } from '../src/oficina';
import { cores } from '../src/tema';

function plural(n, um, varios) {
  return n + ' ' + (n === 1 ? um : varios);
}

function textoOficina(r) {
  if (!r.producao && !r.acabamento && !r.prontos) return 'Nenhuma ordem aberta';
  const partes = [r.producao + ' em produção'];
  if (r.acabamento) partes.push(r.acabamento + ' no acabamento');
  partes.push(plural(r.prontos, 'pronto', 'prontos'));
  if (r.atrasadas) partes.push(plural(r.atrasadas, 'atrasada', 'atrasadas'));
  return partes.join(', ');
}

export default function Inicio() {
  const carregado = useEstado((s) => s.carregado);
  const visivel = useEstado((s) => s.visivel);
  if (!carregado) {
    return (
      <View style={s.centro}>
        <ActivityIndicator size="large" color={cores.marinho} />
      </View>
    );
  }
  const liberado = !!visivel;
  const oficina = resumoOficina(visivel ? visivel.oficina : []);
  const abertos = visivel ? (visivel.orcamentos_abertos || []).length : 0;
  const encomendas = visivel ? listaDeCompras(visivel).reduce((n, g) => n + g.encomendas.length, 0) : 0;
  return (
    <ScrollView contentContainerStyle={s.tela}>
      <AvisoAtualizacao />
      <View style={s.atalhos}>
        <Atalho
          destaque
          icone="calculator-variant-outline"
          titulo="Orçamento"
          detalhe={abertos ? plural(abertos, 'orçamento aberto', 'orçamentos abertos') : 'Fazer um orçamento'}
          desativado={!liberado}
          onPress={() => router.push('/orcamento')}
          estilo={s.atalho}
        />
        <Atalho
          icone="warehouse"
          titulo="Depósito"
          detalhe="Mapa das casinhas"
          desativado={!liberado}
          onPress={() => router.push('/deposito')}
          estilo={s.atalho}
        />
        <Atalho
          icone="hammer-wrench"
          titulo="Oficina"
          detalhe={textoOficina(oficina)}
          alerta={oficina.atrasadas > 0}
          desativado={!liberado}
          onPress={() => router.push('/oficina')}
          estilo={s.atalho}
        />
        <Atalho
          icone="lock-outline"
          titulo="Financeiro"
          detalhe="Caixa, gastos e vendas"
          onPress={() => router.push('/financeiro')}
          estilo={s.atalho}
        />
        {encomendas ? (
          <Atalho
            icone="cart-outline"
            titulo="Pra comprar"
            detalhe={plural(encomendas, 'moldura encomendada', 'molduras encomendadas')}
            desativado={!liberado}
            onPress={() => router.push('/compras')}
            estilo={s.atalho}
          />
        ) : null}
      </View>
      <BarraSync />
      <VersaoApp />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tela: { padding: 24, gap: 20, paddingBottom: 48, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  atalho: { flexGrow: 1, flexShrink: 1, flexBasis: 420, minWidth: 0 }
});
