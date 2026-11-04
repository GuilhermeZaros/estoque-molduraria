import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEstado, central } from '../../src/estado';
import { moldurasPorCasinha, operacoesPraColocar } from '../../src/mapa';
import { casinhaValida, nomeCasinha, normalizarCasinha } from '../../src/gerado/nucleo';
import { totalMetros, formatarMetros, varasTexto } from '../../src/varas';
import { CartaoMoldura } from '../../src/componentes/CartaoMoldura';
import { Botao } from '../../src/componentes/Botao';
import { Dialogo } from '../../src/componentes/Dialogo';
import { CampoMetros } from '../../src/componentes/CampoMetros';
import { EscolherCasinha } from '../../src/componentes/EscolherCasinha';
import { BuscaMoldura } from '../../src/componentes/BuscaMoldura';
import { BarraSync } from '../../src/componentes/BarraSync';
import { cores, tamanho } from '../../src/tema';

const VAZIO = { varas: '', extra: '' };

export default function TelaCasinha() {
  const { codigo } = useLocalSearchParams();
  const casinha = normalizarCasinha(codigo);
  const visivel = useEstado((s) => s.visivel);
  const [aberto, setAberto] = useState(null);
  const [valor, setValor] = useState(VAZIO);
  const [buscando, setBuscando] = useState(false);
  const lista = useMemo(() => (visivel ? moldurasPorCasinha(visivel.molduras)[casinha] || [] : []), [visivel, casinha]);
  if (!visivel || !casinhaValida(casinha)) return null;

  const total = totalMetros(valor);
  const abrir = (tipo, moldura) => { setValor(VAZIO); setAberto({ tipo, moldura }); };
  const fechar = () => setAberto(null);
  const gravar = (acao, dados) => { central.registrar(acao, dados); fechar(); };
  const colocar = async () => {
    for (const op of operacoesPraColocar(m.codigo, casinha, total)) await central.registrar(op.acao, op.dados);
    fechar();
  };
  const cadastrarNova = () => { setBuscando(false); router.push({ pathname: '/cadastro', params: { casinha } }); };
  const m = aberto ? aberto.moldura : null;
  const faltas = m ? visivel.compras_pendentes.filter((c) => c.moldura === m.codigo) : [];

  return (
    <ScrollView contentContainerStyle={s.tela}>
      <Stack.Screen options={{ title: nomeCasinha(casinha) }} />
      {lista.length ? lista.map((moldura) => (
        <CartaoMoldura key={moldura.codigo} moldura={moldura}>
          <Botao titulo="Chegou mercadoria" onPress={() => abrir('entrada', moldura)} />
          <Botao titulo="Corrigir" variante="contorno" onPress={() => abrir('corrigir', moldura)} />
          <Botao titulo="Mover" variante="contorno" onPress={() => abrir('mover', moldura)} />
        </CartaoMoldura>
      )) : <Text style={s.vazio}>Nenhuma moldura nesta casinha ainda.</Text>}
      {buscando ? (
        <View style={s.adicionar}>
          <Text style={s.titulo}>Adicionar moldura</Text>
          <BuscaMoldura
            molduras={visivel.molduras.filter((x) => normalizarCasinha(x.local) !== casinha)}
            aoEscolher={(x) => { setBuscando(false); abrir('colocar', x); }}
            rotulo="Código ou nome da moldura"
            detalhe={(x) => (casinhaValida(x.local) ? 'Hoje em ' + nomeCasinha(x.local) : 'Ainda sem casinha')}
            comFoto
          />
          <Botao icone="plus" titulo="Cadastrar moldura nova" variante="contorno" onPress={cadastrarNova} />
          <Botao titulo="Cancelar" variante="contorno" onPress={() => setBuscando(false)} />
        </View>
      ) : (
        <Botao grande icone="plus" titulo="Adicionar moldura" variante="ouro" onPress={() => setBuscando(true)} />
      )}
      <BarraSync />

      <Dialogo visivel={!!aberto && aberto.tipo === 'entrada'} titulo="Chegou mercadoria" aoFechar={fechar}>
        {m ? <Text style={s.qual}>{m.codigo} · {m.nome}</Text> : null}
        {faltas.length ? (
          <Text style={s.encomenda}>
            Tem encomenda esperando esta moldura: {faltas.map((f) => formatarMetros(f.metros_faltando) + (f.cliente ? ' (' + f.cliente + ')' : '')).join(', ')}. O que chegar cobre isso primeiro.
          </Text>
        ) : null}
        <CampoMetros valor={valor} aoMudar={setValor} rotulo="Quanto chegou" />
        <Botao titulo="Somar no estoque" desativado={!(total > 0)} onPress={() => gravar('entradaMoldura', { codigo: m.codigo, metros: total })} />
        <Botao titulo="Cancelar" variante="contorno" onPress={fechar} />
      </Dialogo>

      <Dialogo visivel={!!aberto && aberto.tipo === 'corrigir'} titulo="Corrigir a quantidade" aoFechar={fechar}>
        {m ? <Text style={s.qual}>{m.codigo} · {m.nome}: no sistema {formatarMetros(m.estoque_m)} ({varasTexto(m.estoque_m)})</Text> : null}
        <CampoMetros valor={valor} aoMudar={setValor} rotulo="Quanto tem de verdade" />
        <Botao titulo="Gravar o número contado" desativado={total == null} onPress={() => gravar('ajustarMoldura', { codigo: m.codigo, metros: total })} />
        <Botao titulo="Cancelar" variante="contorno" onPress={fechar} />
      </Dialogo>

      <Dialogo visivel={!!aberto && aberto.tipo === 'colocar'} titulo="Colocar nesta casinha" aoFechar={fechar}>
        {m ? <Text style={s.qual}>{m.codigo} · {m.nome}</Text> : null}
        {m && casinhaValida(m.local) ? <Text style={s.encomenda}>Hoje ela está em {nomeCasinha(m.local)}. Vai mudar pra cá.</Text> : null}
        <CampoMetros valor={valor} aoMudar={setValor} rotulo="Quanto tem aqui (se não souber, deixe em branco)" />
        <Botao titulo="Colocar nesta casinha" onPress={colocar} />
        <Botao titulo="Cancelar" variante="contorno" onPress={fechar} />
      </Dialogo>

      <Dialogo visivel={!!aberto && aberto.tipo === 'mover'} titulo="Mover pra outra casinha" aoFechar={fechar}>
        {m ? <Text style={s.qual}>{m.codigo} · {m.nome}</Text> : null}
        <EscolherCasinha atual={casinha} aoEscolher={(c) => gravar('moverMoldura', { codigo: m.codigo, casinha: c })} />
        <Botao titulo="Cancelar" variante="contorno" onPress={fechar} />
      </Dialogo>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48 },
  adicionar: { gap: 12, padding: 16, borderRadius: tamanho.raioCartao, borderWidth: 1.5, borderColor: cores.linhaForte, backgroundColor: cores.cartao },
  titulo: { fontSize: tamanho.texto, fontWeight: '800', color: cores.marinho },
  vazio: { fontSize: tamanho.texto, color: cores.apagado },
  qual: { fontSize: tamanho.texto, fontWeight: '700', color: cores.tinta },
  encomenda: { fontSize: tamanho.texto, color: cores.marinho, backgroundColor: '#fff8e1', padding: 12, borderRadius: tamanho.raio }
});
