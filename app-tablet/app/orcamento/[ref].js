import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, useWindowDimensions, BackHandler } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useEstado, central } from '../../src/estado';
import {
  orcamentoVazio, quadroVazio, duplicarQuadro, trocarTipo, deAberto, calcularPedido, avisosDoPedido, dadosParaApi,
  dadosDoTexto, rotuloQuadro
} from '../../src/orcamento';
import { numeroWhatsApp, linkWhatsApp, textoOrcamento } from '../../src/whatsapp';
import { formatarReais } from '../../src/formato';
import { PRAZOS, prazoDe, descricaoDosQuadros } from '../../src/oficina';
import { formatarMetros } from '../../src/varas';
import { Cartao } from '../../src/componentes/Cartao';
import { Campo } from '../../src/componentes/Campo';
import { EditorQuadro } from '../../src/componentes/EditorQuadro';
import { ListaQuadros } from '../../src/componentes/ListaQuadros';
import { ResumoOrcamento } from '../../src/componentes/ResumoOrcamento';
import { Botao } from '../../src/componentes/Botao';
import { Dialogo } from '../../src/componentes/Dialogo';
import { Interruptor } from '../../src/componentes/Interruptor';
import { GrupoPilulas } from '../../src/componentes/Pilula';
import { BarraSync } from '../../src/componentes/BarraSync';
import { cores, tamanho } from '../../src/tema';

function efeitoNaMoldura(a) {
  const nome = a.moldura.nome;
  if (!(a.falta > 0)) return 'Desconta ' + formatarMetros(a.baixa) + ' de ' + nome + ' do estoque.';
  const inicio = a.baixa > 0 ? 'Desconta ' + formatarMetros(a.baixa) + ' de ' + nome + '. ' : 'Não tem ' + nome + ' no estoque. ';
  return inicio + 'Faltam ' + formatarMetros(a.falta) + ': vai pra lista de compras.';
}

export default function EditorOrcamento() {
  const { ref } = useLocalSearchParams();
  const visivel = useEstado((s) => s.visivel);
  const { width } = useWindowDimensions();
  const largo = width >= 900;
  const estreito = width < 600;
  const novo = ref === 'novo';
  const [f, setF] = useState(() => {
    if (novo) return orcamentoVazio(Crypto.randomUUID());
    const o = visivel ? (visivel.orcamentos_abertos || []).find((x) => String(x.ref_app) === String(ref)) : null;
    return o ? deAberto(o) : null;
  });
  const [sel, setSel] = useState(0);
  const [modo, setModo] = useState(novo ? 'quadro' : 'lista');
  const [tirando, setTirando] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const [fechada, setFechada] = useState(false);
  const [oficina, setOficina] = useState(true);
  const [prazo, setPrazo] = useState(7);
  const [desistir, setDesistir] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const rr = useMemo(() => (visivel && f ? calcularPedido(visivel, f) : null), [visivel, f]);
  const avisos = useMemo(() => (visivel && f && rr ? avisosDoPedido(visivel, f, rr) : new Map()), [visivel, f, rr]);
  const rolagem = useRef(null);
  const rolagemQuadro = useRef(null);
  const editando = !largo && modo === 'quadro';

  useEffect(() => {
    if (!editando) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setModo('lista');
      return true;
    });
    return () => sub.remove();
  }, [editando]);

  if (!visivel) return null;
  if (!f) {
    return (
      <View style={s.sumiu}>
        <Stack.Screen options={{ title: 'Orçamento' }} />
        <Text style={s.sumiuTexto}>Esse orçamento não está mais aberto.</Text>
        <Botao titulo="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  const aberto = (visivel.orcamentos_abertos || []).find((x) => String(x.ref_app) === String(f.ref_app));
  const titulo = aberto && aberto.id ? 'Orçamento ' + aberto.id : novo ? 'Novo orçamento' : 'Orçamento';
  const i = Math.min(sel, f.quadros.length - 1);
  const atual = f.quadros[i];
  const r = rr ? rr.quadros[i] : null;
  const cliente = String(f.cliente || '').trim() || 'cliente sem nome';

  const limpar = () => {
    setErro('');
    setMensagem('');
  };
  const mudar = (campos) => {
    limpar();
    setF((a) => ({ ...a, ...campos }));
  };
  const mudarQuadros = (fazer) => {
    limpar();
    setF((a) => ({ ...a, quadros: fazer(a.quadros) }));
  };
  const abrirQuadro = (n) => {
    setSel(n);
    setModo('quadro');
    if (rolagemQuadro.current) rolagemQuadro.current.scrollTo({ y: 0, animated: false });
  };
  const adicionar = (tipo) => {
    mudarQuadros((qs) => [...qs, quadroVazio(tipo, visivel)]);
    abrirQuadro(f.quadros.length);
  };
  const duplicar = () => {
    mudarQuadros((qs) => [...qs.slice(0, i + 1), duplicarQuadro(qs[i]), ...qs.slice(i + 1)]);
    abrirQuadro(i + 1);
  };
  const tirar = () => {
    const alvo = tirando;
    setTirando(null);
    mudarQuadros((qs) => qs.filter((_, j) => j !== alvo));
    setSel(Math.max(0, alvo < i ? i - 1 : Math.min(i, f.quadros.length - 2)));
    if (!largo) setModo('lista');
  };

  const dados = () => dadosParaApi(f, rr);
  const salvar = () => {
    if (!rr || !rr.ok) return;
    central.registrar('salvarOrcamento', dados());
    router.back();
  };
  const mandar = async () => {
    if (!rr || !rr.ok) return;
    const numero = numeroWhatsApp(f.telefone);
    if (!numero) {
      setErro('Coloque o WhatsApp do cliente com DDD.');
      return;
    }
    central.registrar('salvarOrcamento', dados());
    try {
      await Linking.openURL(linkWhatsApp(numero, textoOrcamento(dadosDoTexto(visivel, f, rr))));
      setMensagem('Orçamento salvo. O WhatsApp abriu com a mensagem pronta.');
    } catch {
      setErro('O orçamento foi salvo, mas o WhatsApp não abriu neste tablet.');
    }
  };
  const descartar = () => {
    central.registrar('descartarOrcamento', { ref_app: f.ref_app, cliente: String(f.cliente || '').trim() });
    setDesistir(false);
    router.back();
  };
  const fecharVenda = () => {
    const ordem = oficina ? { oficina: { prazo: prazoDe(prazo), descricao: descricaoDosQuadros(visivel, f.quadros) } } : {};
    central.registrar('fecharVenda', { ...dados(), encomendar: true, ...ordem });
    setConfirmar(false);
    setFechada(oficina ? 'oficina' : 'sem');
  };

  const editor = (
    <EditorQuadro
      key={atual.chave}
      q={atual}
      n={i + 1}
      total={f.quadros.length}
      pacote={visivel}
      r={r}
      aviso={atual.moldura ? avisos.get(atual.moldura) : null}
      aoMudar={(campos) => mudarQuadros((qs) => qs.map((q, j) => (j === i ? { ...q, ...campos } : q)))}
      aoTrocarTipo={(tipo) => mudarQuadros((qs) => qs.map((q, j) => (j === i ? trocarTipo(q, tipo, visivel) : q)))}
      aoDuplicar={duplicar}
      aoTirar={f.quadros.length > 1 ? () => setTirando(i) : null}
    />
  );

  const painel = (
    <>
      <Cartao titulo={f.quadros.length > 1 ? 'QUADROS (' + f.quadros.length + ')' : 'QUADROS'}>
        <ListaQuadros
          quadros={f.quadros}
          rr={rr}
          avisos={avisos}
          sel={largo ? i : -1}
          pacote={visivel}
          aoEscolher={abrirQuadro}
          aoAdicionar={adicionar}
        />
      </Cartao>

      <Cartao titulo="CLIENTE">
        <Campo rotulo="Nome" valor={f.cliente} aoMudar={(v) => mudar({ cliente: v })} autoCapitalize="words" />
        <Campo rotulo="WhatsApp com DDD" valor={f.telefone} aoMudar={(v) => mudar({ telefone: v })} teclado="phone-pad" placeholder="11 98888 7777" />
      </Cartao>

      <Cartao titulo="VALOR E OBSERVAÇÃO">
        <Campo
          rotulo="Valor passado pro cliente (R$)"
          valor={f.valor_final}
          aoMudar={(v) => mudar({ valor_final: v })}
          teclado="decimal-pad"
          placeholder={rr && rr.ok ? formatarReais(rr.valor_total).replace('R$ ', '') : ''}
          dica="Deixe em branco pra usar o total calculado."
        />
        <Campo rotulo="Observação" valor={f.obs} aoMudar={(v) => mudar({ obs: v })} autoCapitalize="sentences" multilinha />
      </Cartao>

      <Cartao titulo="RESUMO">
        <ResumoOrcamento rr={rr} aoFechar={() => { setOficina(true); setPrazo(7); setConfirmar(true); }} aoSalvar={salvar} aoWhatsApp={mandar} />
        {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
        {mensagem ? <Text style={s.ok} accessibilityLiveRegion="polite">{mensagem}</Text> : null}
        {aberto ? (
          <Botao icone="close" titulo="Cliente desistiu" variante="perigo" onPress={() => setDesistir(true)} estilo={s.desistir} />
        ) : null}
      </Cartao>
    </>
  );

  const dialogos = (
    <>
      <Dialogo visivel={confirmar} titulo="Fechar a venda?" aoFechar={() => setConfirmar(false)}>
        {rr && rr.ok ? (
          <>
            <Text style={s.dialogoValor}>{formatarReais(rr.valor_final)}</Text>
            <Text style={s.dialogoTexto}>
              {String(f.cliente || '').trim() || 'Cliente sem nome'}{f.quadros.length > 1 ? ', ' + f.quadros.length + ' quadros' : ''}
            </Text>
            {[...avisos.values()].map((a) => (
              <Text key={a.moldura.codigo} style={[s.dialogoTexto, a.falta > 0 && s.dialogoFalta]}>{efeitoNaMoldura(a)}</Text>
            ))}
          </>
        ) : null}
        <View style={s.oficina}>
          <Interruptor
            titulo="Mandar pra oficina"
            dica={oficina ? 'Entra na fila de produção com prazo de ' + prazoDe(prazo) + '.' : 'Não cria ordem de serviço.'}
            valor={oficina}
            aoMudar={setOficina}
          />
          {oficina ? <GrupoPilulas opcoes={PRAZOS.map((p) => ({ valor: p.dias, titulo: p.titulo }))} valor={prazo} aoMudar={setPrazo} /> : null}
        </View>
        <Botao grande icone="check-circle-outline" titulo="Confirmar venda" variante="ouro" onPress={fecharVenda} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setConfirmar(false)} />
      </Dialogo>
      <Dialogo visivel={tirando != null} titulo="Tirar este quadro?" aoFechar={() => setTirando(null)}>
        <Text style={s.dialogoTexto}>
          {tirando != null && f.quadros[tirando] ? 'O quadro ' + (tirando + 1) + ' (' + rotuloQuadro(f.quadros[tirando]) + ') sai do orçamento.' : ''}
        </Text>
        <Botao titulo="Tirar" variante="perigo" onPress={tirar} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setTirando(null)} />
      </Dialogo>
      <Dialogo visivel={desistir} titulo="Tirar da lista?" aoFechar={() => setDesistir(false)}>
        <Text style={s.dialogoTexto}>
          O orçamento {aberto && aberto.id ? aberto.id + ' ' : ''}de {cliente} sai dos abertos e fica guardado na planilha como descartado. Não mexe no estoque.
        </Text>
        <Botao titulo="Tirar da lista" variante="perigo" onPress={descartar} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setDesistir(false)} />
      </Dialogo>
      <Dialogo visivel={!!fechada} titulo="Venda fechada" aoFechar={() => router.back()}>
        <Text style={s.dialogoTexto}>
          {fechada === 'oficina'
            ? 'A venda e a ordem da oficina vão pra planilha assim que o tablet falar com ela.'
            : 'A venda vai pra planilha assim que o tablet falar com ela.'}
        </Text>
        <Botao titulo="Ok" onPress={() => router.back()} />
      </Dialogo>
    </>
  );

  if (largo) {
    return (
      <View style={s.colunas}>
        <Stack.Screen options={{ title: titulo }} />
        <ScrollView ref={rolagemQuadro} style={s.colunaForm} contentContainerStyle={s.coluna} keyboardShouldPersistTaps="handled">
          {editor}
        </ScrollView>
        <ScrollView style={s.colunaResumo} contentContainerStyle={s.coluna} keyboardShouldPersistTaps="handled">
          {painel}
          <BarraSync />
        </ScrollView>
        {dialogos}
      </View>
    );
  }
  return (
    <View style={s.uma}>
      <Stack.Screen options={{ title: titulo }} />
      {editando ? (
        <ScrollView key="quadro" ref={rolagemQuadro} contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
          {editor}
        </ScrollView>
      ) : (
        <ScrollView key="lista" ref={rolagem} contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
          {painel}
          <BarraSync />
        </ScrollView>
      )}
      <View style={s.rodape}>
        {editando ? (
          <>
            <Text style={[s.rodapeTotal, estreito && s.rodapeTotalEstreito]} accessibilityLiveRegion="polite" numberOfLines={1}>
              {(f.quadros.length > 1 ? 'Quadro ' + (i + 1) + ': ' : '') + (r && r.ok ? formatarReais(r.calc.valor_total) : 'sem valor ainda')}
            </Text>
            <Botao icone="check" titulo="Pronto" variante="ouro" onPress={() => setModo('lista')} />
          </>
        ) : (
          <>
            <Text style={[s.rodapeTotal, estreito && s.rodapeTotalEstreito]} accessibilityLiveRegion="polite">
              {rr && rr.ok ? formatarReais(rr.valor_final) : 'Sem total ainda'}
            </Text>
            <Botao titulo="Ver resumo" variante="ouro" onPress={() => rolagem.current && rolagem.current.scrollToEnd({ animated: true })} />
          </>
        )}
      </View>
      {dialogos}
    </View>
  );
}

const s = StyleSheet.create({
  uma: { flex: 1 },
  tela: { padding: 16, gap: 14, paddingBottom: 48 },
  rodape: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16,
    paddingVertical: 10, backgroundColor: cores.marinho, borderTopWidth: 3, borderTopColor: cores.ouro
  },
  rodapeTotal: { flex: 1, fontSize: 26, fontWeight: '800', color: '#ffffff' },
  rodapeTotalEstreito: { fontSize: 19 },
  colunas: { flex: 1, flexDirection: 'row' },
  colunaForm: { flex: 3 },
  colunaResumo: { flex: 2, borderLeftWidth: 1, borderLeftColor: cores.linha },
  coluna: { padding: 16, gap: 14, paddingBottom: 48 },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' },
  ok: { fontSize: tamanho.texto, color: '#065f46', fontWeight: '700' },
  sumiu: { flex: 1, padding: 24, gap: 16, alignItems: 'flex-start' },
  sumiuTexto: { fontSize: tamanho.texto, color: cores.tinta },
  dialogoValor: { fontSize: 36, fontWeight: '800', color: cores.marinho },
  dialogoTexto: { fontSize: tamanho.texto, color: cores.tinta },
  dialogoFalta: { color: cores.vermelho, fontWeight: '700' },
  desistir: { marginTop: 8 },
  oficina: { gap: 10, paddingVertical: 4, borderTopWidth: 1, borderTopColor: cores.linha }
});
