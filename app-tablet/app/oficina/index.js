import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { useEstado, central, api } from '../../src/estado';
import { formatarReais, dataCurta } from '../../src/formato';
import {
  resumoOficina, ordenarProducao, textoPrazo, prazoVencido, textoAviso, chaveDaOrdem, alvoDaOrdem, mesesRecentes,
  emAndamento, contarAtrasadas, fotosDaOrdem
} from '../../src/oficina';
import { Botao } from '../../src/componentes/Botao';
import { MiniaturasOrdem } from '../../src/componentes/FotosOrdem';
import { Dialogo } from '../../src/componentes/Dialogo';
import { GrupoPilulas } from '../../src/componentes/Pilula';
import { BarraSync } from '../../src/componentes/BarraSync';
import { cores, tamanho } from '../../src/tema';

const STATUS = { em_producao: 'Em produção', acabamento: 'Falta acabamento', pronto: 'Pronto', entregue: 'Entregue' };

function CartaoOrdem({ o, acoes, mostrarStatus }) {
  const atrasada = emAndamento(o) && prazoVencido(o.prazo);
  const aviso = o.status === 'pronto' ? textoAviso(o) : null;
  const cliente = String(o.cliente || '').trim() || 'Cliente sem nome';
  return (
    <View style={[s.cartao, o.status === 'acabamento' && s.cartaoAcabamento, atrasada && s.cartaoAtrasado, o.status === 'pronto' && s.cartaoPronto]}>
      <View style={s.topo}>
        <Text style={s.cliente} numberOfLines={1}>{cliente}</Text>
        {Number(o.valor) > 0 ? <Text style={s.valor}>{formatarReais(o.valor)}</Text> : null}
      </View>
      <Text style={[s.numero, !o.id && s.semNumero]}>
        {(o.id || 'Ainda não chegou na planilha') + (mostrarStatus ? ' · ' + (STATUS[o.status] || o.status) : '')}
      </Text>
      <MiniaturasOrdem fotos={fotosDaOrdem(o)} cliente={cliente} />
      {o.descricao ? <Text style={s.descricao}>{o.descricao}</Text> : null}
      {emAndamento(o) ? <Text style={[s.prazo, atrasada && s.atrasada]}>{textoPrazo(o.prazo)}</Text> : null}
      {o.status === 'pronto' ? <Text style={s.prazo}>Ficou pronto {dataCurta(o.data_pronto)}</Text> : null}
      {o.status === 'entregue' && o.data_entrega ? <Text style={s.prazo}>Entregue {dataCurta(o.data_entrega)}</Text> : null}
      {aviso ? <Text style={[s.aviso, aviso.alerta && s.atrasada]}>{aviso.texto}</Text> : null}
      {acoes ? <View style={s.acoes}>{acoes}</View> : null}
    </View>
  );
}

function Historico() {
  const meses = useMemo(() => mesesRecentes(new Date(), 6), []);
  const [mes, setMes] = useState(meses[0].valor);
  const [carga, setCarga] = useState({ carregando: true, erro: '', dados: null });
  const carregar = useCallback(async () => {
    setCarga({ carregando: true, erro: '', dados: null });
    const r = await api.buscarHistoricoOficina(mes);
    setCarga(r.tipo === 'ok' ? { carregando: false, erro: '', dados: r.dados } : { carregando: false, erro: r.erro, dados: null });
  }, [mes]);
  useEffect(() => { carregar(); }, [carregar]);
  const d = carga.dados;
  return (
    <View style={s.bloco}>
      <GrupoPilulas opcoes={meses} valor={mes} aoMudar={setMes} />
      {carga.carregando ? <ActivityIndicator size="large" color={cores.marinho} style={s.carregando} /> : null}
      {carga.erro ? (
        <View style={s.bloco}>
          <Text style={s.erro} accessibilityLiveRegion="polite">{carga.erro} O histórico precisa de internet.</Text>
          <Botao titulo="Tentar de novo" variante="contorno" onPress={carregar} />
        </View>
      ) : null}
      {d ? (
        <>
          <Text style={s.resumo}>
            {d.resumo.quantidade === 1 ? '1 ordem' : d.resumo.quantidade + ' ordens'} no mês, {formatarReais(d.resumo.total)},{' '}
            {d.resumo.entregues === 1 ? '1 entregue' : d.resumo.entregues + ' entregues'}
          </Text>
          <View style={s.lista}>
            {d.ordens.map((o) => <CartaoOrdem key={o.id || o.ref_app} o={o} mostrarStatus />)}
          </View>
          {!d.ordens.length ? <Text style={s.vazio}>Nenhuma ordem criada nesse mês.</Text> : null}
        </>
      ) : null}
    </View>
  );
}

export default function Oficina() {
  const visivel = useEstado((s) => s.visivel);
  const [aba, setAba] = useState('producao');
  const [pronto, setPronto] = useState(null);
  const [buscou, setBuscou] = useState(null);
  const [aviso, setAviso] = useState('');
  const lista = visivel ? visivel.oficina || [] : [];
  const resumo = resumoOficina(lista);
  const producao = useMemo(() => ordenarProducao(lista.filter((o) => o.status === 'em_producao')), [lista]);
  const acabamento = useMemo(() => ordenarProducao(lista.filter((o) => o.status === 'acabamento')), [lista]);
  const prontos = useMemo(
    () => lista.filter((o) => o.status === 'pronto').sort((a, b) => String(b.data_pronto).localeCompare(String(a.data_pronto))),
    [lista]
  );
  if (!visivel) return null;

  const editar = (o) => router.push('/oficina/' + encodeURIComponent(chaveDaOrdem(o)));
  const irProAcabamento = (o) => {
    central.registrar('marcarAcabamento', alvoDaOrdem(o));
    setAviso((o.cliente || 'A ordem') + ' foi pra Falta acabamento.');
  };
  const confirmarPronto = () => {
    central.registrar('marcarPronto', alvoDaOrdem(pronto));
    setAviso((pronto.cliente || 'A ordem') + ' foi pra Prontos.');
    setPronto(null);
  };
  const confirmarBuscou = () => {
    central.registrar('marcarEntregue', alvoDaOrdem(buscou));
    setAviso(Number(buscou.valor) > 0
      ? formatarReais(buscou.valor) + ' de ' + (buscou.cliente || 'cliente') + ' vai pro financeiro.'
      : (buscou.cliente || 'A ordem') + ' foi entregue.');
    setBuscou(null);
  };
  const abas = [
    { valor: 'producao', titulo: 'Em produção (' + resumo.producao + ')' },
    { valor: 'acabamento', titulo: 'Falta acabamento (' + resumo.acabamento + ')' },
    { valor: 'prontos', titulo: 'Prontos (' + resumo.prontos + ')' },
    { valor: 'historico', titulo: 'Histórico' }
  ];
  const atrasadas = aba === 'producao' ? contarAtrasadas(producao) : aba === 'acabamento' ? contarAtrasadas(acabamento) : 0;

  return (
    <ScrollView contentContainerStyle={s.tela}>
      <Stack.Screen options={{ title: 'Oficina' }} />
      <Botao grande icone="plus" titulo="Nova ordem de serviço" variante="ouro" onPress={() => router.push('/oficina/nova')} />
      <GrupoPilulas opcoes={abas} valor={aba} aoMudar={(v) => { setAviso(''); setAba(v); }} />
      {aviso ? <Text style={s.ok} accessibilityLiveRegion="polite">{aviso}</Text> : null}
      {atrasadas ? (
        <Text style={s.erro}>{atrasadas === 1 ? '1 ordem passou do prazo.' : atrasadas + ' ordens passaram do prazo.'}</Text>
      ) : null}

      {aba === 'producao' ? (
        <View style={s.lista}>
          {producao.map((o) => (
            <CartaoOrdem
              key={chaveDaOrdem(o)}
              o={o}
              acoes={(
                <>
                  <Botao icone="brush" titulo="Foi pro acabamento" onPress={() => irProAcabamento(o)} estilo={s.acao} />
                  <Botao icone="pencil-outline" titulo="Editar" variante="contorno" onPress={() => editar(o)} estilo={s.acao} />
                </>
              )}
            />
          ))}
          {!producao.length ? <Text style={s.vazio}>Nada em produção.</Text> : null}
        </View>
      ) : null}

      {aba === 'acabamento' ? (
        <View style={s.lista}>
          {acabamento.map((o) => (
            <CartaoOrdem
              key={chaveDaOrdem(o)}
              o={o}
              acoes={(
                <>
                  <Botao icone="check" titulo="Ficou pronto" onPress={() => setPronto(o)} estilo={s.acao} />
                  <Botao icone="pencil-outline" titulo="Editar" variante="contorno" onPress={() => editar(o)} estilo={s.acao} />
                </>
              )}
            />
          ))}
          {!acabamento.length ? <Text style={s.vazio}>Nada esperando acabamento.</Text> : null}
        </View>
      ) : null}

      {aba === 'prontos' ? (
        <View style={s.lista}>
          {prontos.map((o) => (
            <CartaoOrdem
              key={chaveDaOrdem(o)}
              o={o}
              acoes={(
                <>
                  <Botao icone="handshake-outline" titulo="Cliente buscou" variante="ouro" onPress={() => setBuscou(o)} estilo={s.acao} />
                  <Botao icone="pencil-outline" titulo="Editar" variante="contorno" onPress={() => editar(o)} estilo={s.acao} />
                </>
              )}
            />
          ))}
          {!prontos.length ? <Text style={s.vazio}>Nenhum quadro esperando o cliente.</Text> : null}
        </View>
      ) : null}

      {aba === 'historico' ? <Historico /> : null}

      <BarraSync />

      <Dialogo visivel={!!pronto} titulo="Ficou pronto?" aoFechar={() => setPronto(null)}>
        {pronto ? (
          <Text style={s.dialogo}>
            {(pronto.cliente || 'A ordem') + (pronto.id ? ' (' + pronto.id + ')' : '') + ' vai pra Prontos. '}
            {String(pronto.telefone || '').trim()
              ? 'A Julia avisa o cliente no WhatsApp.'
              : 'Essa ordem não tem WhatsApp: avise o cliente por telefone.'}
          </Text>
        ) : null}
        <Botao grande icone="check-circle-outline" titulo="Sim, ficou pronto" onPress={confirmarPronto} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setPronto(null)} />
      </Dialogo>

      <Dialogo visivel={!!buscou} titulo="Cliente buscou?" aoFechar={() => setBuscou(null)}>
        {buscou ? (
          <>
            {Number(buscou.valor) > 0 ? <Text style={s.dialogoValor}>{formatarReais(buscou.valor)}</Text> : null}
            <Text style={s.dialogo}>
              {Number(buscou.valor) > 0
                ? 'Esse valor entra como venda no financeiro e a ordem sai da lista.'
                : 'A ordem não tem valor, então nada vai pro financeiro. Ela só sai da lista.'}
            </Text>
          </>
        ) : null}
        <Botao grande icone="check-circle-outline" titulo="Sim, entreguei" variante="ouro" onPress={confirmarBuscou} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setBuscou(null)} />
      </Dialogo>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  bloco: { gap: 16 },
  lista: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cartao: {
    flexGrow: 1, flexShrink: 1, flexBasis: 420, minWidth: 0, padding: 16, gap: 6, backgroundColor: cores.cartao, borderRadius: tamanho.raioCartao,
    borderWidth: 1, borderColor: cores.linha, borderLeftWidth: 5, borderLeftColor: cores.marinho
  },
  cartaoAcabamento: { borderLeftColor: cores.ouro },
  cartaoAtrasado: { borderLeftColor: cores.vermelho },
  cartaoPronto: { borderLeftColor: '#047857' },
  topo: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  cliente: { flex: 1, fontSize: 22, fontWeight: '800', color: cores.marinho },
  valor: { fontSize: 22, fontWeight: '800', color: cores.tinta },
  numero: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.ouroTexto },
  semNumero: { color: cores.apagado, fontWeight: '600' },
  descricao: { fontSize: 18, color: cores.tinta },
  prazo: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  atrasada: { color: cores.vermelho },
  aviso: { fontSize: tamanho.pequeno, color: '#065f46', fontWeight: '600' },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  acao: { flexGrow: 1, flexBasis: 160 },
  resumo: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  carregando: { paddingVertical: 24 },
  vazio: { width: '100%', fontSize: tamanho.texto, color: cores.apagado, textAlign: 'center', paddingVertical: 24 },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' },
  ok: { fontSize: tamanho.texto, color: '#065f46', fontWeight: '700' },
  dialogo: { fontSize: tamanho.texto, color: cores.tinta },
  dialogoValor: { fontSize: 36, fontWeight: '800', color: cores.marinho }
});
