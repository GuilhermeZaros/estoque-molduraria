import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useEstado, central, api } from '../../src/estado';
import { cofre } from '../../src/senhaFinanceiro';
import { formatarReais, formatarNumero, lerValor } from '../../src/formato';
import {
  TIPOS, PERIODOS_VENDA, opcoesDeMes, textoVariacao, tomDaVariacao, validarSaldos, lancamentosPendentes
} from '../../src/financeiro';
import { Cartao } from '../../src/componentes/Cartao';
import { Campo } from '../../src/componentes/Campo';
import { Botao } from '../../src/componentes/Botao';
import { Dialogo } from '../../src/componentes/Dialogo';
import { Icone } from '../../src/componentes/Icone';
import { GrupoPilulas } from '../../src/componentes/Pilula';
import { BarrasMes, BarrasCategoria } from '../../src/componentes/Graficos';
import { cores, tamanho } from '../../src/tema';

const TOM = { bom: '#065f46', ruim: cores.vermelho, neutro: cores.apagado };
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar'];
const POR_PAGINA = 20;

function TelaSenha({ aoEntrar }) {
  const [digitos, setDigitos] = useState('');
  const [erro, setErro] = useState('');
  const [conferindo, setConferindo] = useState(false);
  const atual = useRef('');
  const ocupado = useRef(false);
  const trocar = (novo) => {
    atual.current = novo;
    setDigitos(novo);
  };
  const apertar = async (tecla) => {
    if (ocupado.current) return;
    if (tecla === 'apagar') {
      trocar(atual.current.slice(0, -1));
      return;
    }
    const novo = (atual.current + tecla).slice(0, 6);
    setErro('');
    trocar(novo);
    if (novo.length < 6) return;
    ocupado.current = true;
    setConferindo(true);
    const r = await api.buscarFinanceiro({ pin: novo, periodo: 'mes' });
    ocupado.current = false;
    setConferindo(false);
    if (r.tipo === 'ok') {
      aoEntrar(novo, r.dados);
      return;
    }
    trocar('');
    setErro(/senha errada|tentativas|criada/i.test(r.erro) ? r.erro : r.erro + ' O financeiro precisa de internet.');
  };
  return (
    <ScrollView contentContainerStyle={s.senha}>
      <Stack.Screen options={{ title: 'Financeiro' }} />
      <Icone nome="lock-outline" tamanho={56} cor={cores.marinho} />
      <Text style={s.senhaTitulo} accessibilityRole="header">Senha do financeiro</Text>
      <View style={s.pontos} accessible accessibilityLabel={digitos.length + ' de 6 números digitados'}>
        {[0, 1, 2, 3, 4, 5].map((i) => <View key={i} style={[s.ponto, i < digitos.length && s.pontoCheio]} />)}
      </View>
      {conferindo ? <ActivityIndicator size="large" color={cores.marinho} /> : null}
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      {/criada/i.test(erro) ? (
        <Text style={s.dicaSenha}>Na planilha, abra o menu e escolha "Senha do financeiro (app)".</Text>
      ) : null}
      <View style={s.teclado}>
        {TECLAS.map((t, i) => (t ? (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityLabel={t === 'apagar' ? 'Apagar' : t}
            disabled={conferindo}
            onPress={() => apertar(t)}
            style={({ pressed }) => [s.tecla, pressed && s.teclaApertada]}>
            {t === 'apagar'
              ? <Icone nome="backspace-outline" tamanho={32} cor={cores.marinho} />
              : <Text style={s.teclaTexto}>{t}</Text>}
          </Pressable>
        ) : <View key={'vazio' + i} style={s.teclaVazia} />))}
      </View>
    </ScrollView>
  );
}

function Numero({ titulo, valor, detalhe, variacao, tom }) {
  return (
    <View style={s.numero}>
      <Text style={s.numeroTitulo}>{titulo}</Text>
      <Text style={s.numeroValor}>{formatarReais(valor)}</Text>
      {detalhe ? <Text style={s.numeroDetalhe}>{detalhe}</Text> : null}
      {variacao ? <Text style={[s.numeroDetalhe, { color: TOM[tom || 'neutro'] }]}>{variacao}</Text> : null}
    </View>
  );
}

function variacaoDe(variacao, campo) {
  if (!variacao || !variacao.tem || variacao[campo] == null) return '';
  return 'vs ' + variacao.mes_anterior + ': ' + textoVariacao(variacao[campo]);
}

function Painel({ inicial, aoSair }) {
  const fila = useEstado((st) => st.fila);
  const [dados, setDados] = useState(inicial);
  const [filtros, setFiltros] = useState({ mes: '', tipo: '', periodo: 'mes' });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mesGrafico, setMesGrafico] = useState('');
  const [quantos, setQuantos] = useState(POR_PAGINA);
  const [ajuste, setAjuste] = useState(null);
  const [erroAjuste, setErroAjuste] = useState('');
  const [aviso, setAviso] = useState('');
  const pendentes = lancamentosPendentes(fila);
  const antes = useRef(pendentes);
  const primeira = useRef(true);

  const carregar = useCallback(async (f) => {
    const pin = cofre.ler();
    if (!pin) {
      aoSair();
      return;
    }
    setCarregando(true);
    setErro('');
    const r = await api.buscarFinanceiro({ pin, ...f });
    setCarregando(false);
    if (r.tipo === 'ok') {
      setDados(r.dados);
      return;
    }
    if (/senha errada|tentativas|criada/i.test(r.erro)) {
      cofre.esquecer();
      aoSair();
      return;
    }
    setErro(r.erro);
  }, [aoSair]);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    carregar(filtros);
  }, [filtros, carregar]);

  useEffect(() => {
    if (antes.current > 0 && pendentes === 0) {
      setAviso('');
      carregar(filtros);
    }
    antes.current = pendentes;
  }, [pendentes, filtros, carregar]);

  useEffect(() => {
    const relogio = setInterval(() => { if (!cofre.ativo()) aoSair(); }, 15000);
    return () => clearInterval(relogio);
  }, [aoSair]);

  useFocusEffect(useCallback(() => { if (!cofre.ativo()) aoSair(); }, [aoSair]));

  const mudar = (campos) => {
    cofre.ler();
    setQuantos(POR_PAGINA);
    setMesGrafico('');
    setFiltros((f) => ({ ...f, ...campos }));
  };
  const ir = (rota) => {
    cofre.ler();
    router.push(rota);
  };
  const abrirAjuste = () => {
    cofre.ler();
    setErroAjuste('');
    setAjuste({ conta_empresa: formatarNumero(dados.saldos.conta_empresa), tesouro_direto: formatarNumero(dados.saldos.tesouro_direto) });
  };
  const salvarAjuste = () => {
    const problema = validarSaldos(ajuste);
    if (problema) {
      setErroAjuste(problema);
      return;
    }
    central.registrar('ajustarSaldos', { conta_empresa: lerValor(ajuste.conta_empresa), tesouro_direto: lerValor(ajuste.tesouro_direto) || 0 });
    setAjuste(null);
    setAviso('Saldos enviados. O painel atualiza quando chegarem na planilha.');
  };

  const { saldos, resumo, relatorio } = dados;
  const variacao = filtros.mes ? resumo.variacao : null;
  const lancamentos = resumo.lancamentos || [];
  const nomeDoPeriodo = filtros.mes ? (opcoesDeMes(resumo.meses).find((m) => m.valor === filtros.mes) || {}).titulo || filtros.mes : 'todos os meses';

  return (
    <ScrollView contentContainerStyle={s.tela}>
      <Stack.Screen options={{ title: 'Financeiro' }} />
      <View style={s.acoes}>
        <Botao grande icone="cart-arrow-down" titulo="Lançar gasto" variante="ouro" onPress={() => ir('/financeiro/gasto')} estilo={s.acao} />
        <Botao grande icone="cash-plus" titulo="Lançar venda" onPress={() => ir('/financeiro/venda')} estilo={s.acao} />
        <Botao icone="lock-outline" titulo="Trancar" variante="contorno" onPress={() => { cofre.esquecer(); aoSair(); }} estilo={s.trancar} />
      </View>
      {pendentes ? (
        <Text style={s.pendente} accessibilityLiveRegion="polite">
          {pendentes === 1 ? '1 lançamento esperando' : pendentes + ' lançamentos esperando'} pra ir pra planilha. O painel atualiza quando chegarem.
        </Text>
      ) : null}
      {aviso && !pendentes ? <Text style={s.ok}>{aviso}</Text> : null}
      {carregando ? (
        <View style={s.atualizando}>
          <ActivityIndicator color={cores.marinho} />
          <Text style={s.atualizandoTexto}>Atualizando...</Text>
        </View>
      ) : null}
      {erro ? (
        <View style={s.linhaErro}>
          <Text style={[s.erro, s.flex]} accessibilityLiveRegion="polite">{erro}</Text>
          <Botao titulo="Tentar de novo" variante="contorno" onPress={() => carregar(filtros)} />
        </View>
      ) : null}

      <Cartao titulo="SALDOS" direita={<Botao icone="pencil-outline" titulo="Ajustar" variante="contorno" onPress={abrirAjuste} />}>
        <View style={s.numeros}>
          <Numero titulo="Conta da loja" valor={saldos.conta_empresa} />
          <Numero titulo="Tesouro Direto" valor={saldos.tesouro_direto} />
          <Numero titulo="Total" valor={saldos.total} />
        </View>
        <Text style={s.nota}>
          {saldos.atualizado_em ? 'Conferido em ' + saldos.atualizado_em + '. ' : ''}A conta anda sozinha com as vendas e os gastos lançados.
        </Text>
      </Cartao>

      <Cartao titulo="PERÍODO">
        <GrupoPilulas opcoes={opcoesDeMes(resumo.meses)} valor={filtros.mes} aoMudar={(v) => mudar({ mes: v })} />
        <View style={s.filtroTipo}>
          <Text style={s.rotulo}>Gastos da</Text>
          <GrupoPilulas opcoes={TIPOS} valor={filtros.tipo} aoMudar={(v) => mudar({ tipo: v })} />
        </View>
        <View style={s.numeros}>
          <Numero
            titulo="Entrou"
            valor={resumo.periodo.entrada}
            variacao={variacaoDe(variacao, 'entrada')}
            tom={variacao ? tomDaVariacao('entrada', variacao.entrada) : null}
          />
          <Numero
            titulo="Saiu"
            valor={resumo.periodo.saida}
            variacao={variacaoDe(variacao, 'saida')}
            tom={variacao ? tomDaVariacao('saida', variacao.saida) : null}
          />
          <Numero
            titulo="Sobrou"
            valor={resumo.periodo.saldo}
            detalhe={resumo.periodo.entrada > 0 ? 'Margem ' + String(resumo.periodo.margem).replace('.', ',') + '%' : ''}
            variacao={variacaoDe(variacao, 'saldo')}
            tom={variacao ? tomDaVariacao('saldo', variacao.saldo) : null}
          />
        </View>
        <Text style={s.nota}>
          Gastos de todos os meses: loja {formatarReais(resumo.saidas_por_tipo.loja)}, pessoal {formatarReais(resumo.saidas_por_tipo.pessoal)}.
        </Text>
      </Cartao>

      <Cartao titulo="MÊS A MÊS">
        <BarrasMes meses={resumo.por_mes} escolhido={mesGrafico || filtros.mes} aoEscolher={setMesGrafico} />
      </Cartao>

      <Cartao titulo={'GASTOS POR CATEGORIA, ' + nomeDoPeriodo.toUpperCase()}>
        <BarrasCategoria itens={resumo.saidas_por_categoria} />
      </Cartao>

      <Cartao titulo={'EXTRATO, ' + nomeDoPeriodo.toUpperCase()}>
        {lancamentos.slice(0, quantos).map((l, i) => (
          <View key={i} style={s.lancamento}>
            <View style={s.lancTextos}>
              <Text style={s.lancDescricao} numberOfLines={2}>{l.descricao || l.categoria}</Text>
              <Text style={s.lancCategoria}>
                {l.data + ((l.descricao && l.descricao !== l.categoria) || l.escopo === 'pessoal'
                  ? '  ·  ' + l.categoria + (l.escopo === 'pessoal' ? ', pessoal' : '')
                  : '')}
              </Text>
            </View>
            <Text style={[s.lancValor, l.tipo === 'entrada' && s.entrada]}>
              {(l.tipo === 'entrada' ? '+ ' : '- ') + formatarReais(l.valor)}
            </Text>
          </View>
        ))}
        {!lancamentos.length ? <Text style={s.nota}>Nenhum lançamento nesse período.</Text> : null}
        {lancamentos.length > quantos ? (
          <Botao titulo={'Mostrar mais (' + (lancamentos.length - quantos) + ')'} variante="contorno" onPress={() => setQuantos((q) => q + POR_PAGINA)} />
        ) : null}
      </Cartao>

      <Cartao titulo="VENDAS PELO SISTEMA">
        <Text style={s.nota}>O que saiu do estoque como venda, pelo app e pela planilha.</Text>
        <GrupoPilulas opcoes={PERIODOS_VENDA} valor={filtros.periodo} aoMudar={(v) => mudar({ periodo: v })} />
        <View style={s.numeros}>
          <Numero titulo="Faturamento" valor={relatorio.faturamento} detalhe={relatorio.num_vendas === 1 ? '1 venda' : relatorio.num_vendas + ' vendas'} />
          <Numero titulo="Ticket médio" valor={relatorio.ticket_medio} />
          {relatorio.lucro.tem_custo ? (
            <Numero
              titulo="Lucro estimado"
              valor={relatorio.lucro.valor}
              detalhe={relatorio.lucro.itens_sem_custo ? relatorio.lucro.itens_sem_custo + ' itens sem custo cadastrado' : ''}
            />
          ) : null}
        </View>
        {relatorio.ranking_molduras.length ? (
          <>
            <Text style={s.subtitulo}>Molduras campeãs</Text>
            {relatorio.ranking_molduras.slice(0, 5).map((m, i) => (
              <View key={m.nome + i} style={s.lancamento}>
                <Text style={s.posicao}>{i + 1}º</Text>
                <View style={s.lancTextos}>
                  <Text style={s.lancDescricao} numberOfLines={2}>{m.nome}</Text>
                  <Text style={s.lancCategoria}>{formatarNumero(m.metros)} m</Text>
                </View>
                <Text style={s.lancValor}>{formatarReais(m.valor)}</Text>
              </View>
            ))}
          </>
        ) : <Text style={s.nota}>Nenhuma venda pelo sistema nesse período.</Text>}
      </Cartao>

      <Dialogo visivel={!!ajuste} titulo="Ajustar saldos" aoFechar={() => setAjuste(null)}>
        <Text style={s.dialogo}>Ponha quanto tem hoje em cada lugar. Daqui pra frente a conta anda sozinha com os lançamentos.</Text>
        {ajuste ? (
          <>
            <Campo rotulo="Conta da loja (R$)" valor={ajuste.conta_empresa} aoMudar={(v) => { setErroAjuste(''); setAjuste((a) => ({ ...a, conta_empresa: v })); }} teclado="decimal-pad" />
            <Campo rotulo="Tesouro Direto (R$)" valor={ajuste.tesouro_direto} aoMudar={(v) => { setErroAjuste(''); setAjuste((a) => ({ ...a, tesouro_direto: v })); }} teclado="decimal-pad" />
          </>
        ) : null}
        {erroAjuste ? <Text style={s.erro} accessibilityLiveRegion="polite">{erroAjuste}</Text> : null}
        <Botao grande icone="content-save-outline" titulo="Salvar saldos" variante="ouro" onPress={salvarAjuste} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setAjuste(null)} />
      </Dialogo>
    </ScrollView>
  );
}

export default function Financeiro() {
  const [sessao, setSessao] = useState(null);
  const [abrindo, setAbrindo] = useState(() => cofre.ativo());
  const sair = useCallback(() => {
    setAbrindo(false);
    setSessao(null);
  }, []);
  useEffect(() => {
    if (!abrindo) return undefined;
    let vivo = true;
    api.buscarFinanceiro({ pin: cofre.ler(), periodo: 'mes' }).then((r) => {
      if (!vivo) return;
      if (r.tipo === 'ok') setSessao({ dados: r.dados });
      else if (/senha errada|tentativas|criada/i.test(r.erro)) cofre.esquecer();
      setAbrindo(false);
    });
    return () => { vivo = false; };
  }, [abrindo]);
  if (abrindo) {
    return (
      <View style={s.abrindo}>
        <Stack.Screen options={{ title: 'Financeiro' }} />
        <ActivityIndicator size="large" color={cores.marinho} />
      </View>
    );
  }
  if (!sessao) return <TelaSenha aoEntrar={(pin, dados) => { cofre.guardar(pin); setSessao({ dados }); }} />;
  return <Painel inicial={sessao.dados} aoSair={sair} />;
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  flex: { flex: 1 },
  abrindo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  senha: { padding: 24, gap: 18, alignItems: 'center', paddingBottom: 48 },
  senhaTitulo: { fontSize: tamanho.titulo, fontWeight: '800', color: cores.marinho },
  pontos: { flexDirection: 'row', gap: 16, paddingVertical: 8 },
  ponto: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: cores.marinho },
  pontoCheio: { backgroundColor: cores.marinho },
  dicaSenha: { fontSize: tamanho.pequeno, color: cores.apagado, textAlign: 'center', maxWidth: 420 },
  teclado: { width: '100%', maxWidth: 336, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  tecla: {
    width: '30%', height: 80, borderRadius: 18, backgroundColor: cores.cartao, borderWidth: 1.5, borderColor: cores.linhaForte,
    alignItems: 'center', justifyContent: 'center'
  },
  teclaApertada: { backgroundColor: cores.marinhoClaro },
  teclaVazia: { width: '30%', height: 80 },
  teclaTexto: { fontSize: 32, fontWeight: '800', color: cores.marinho },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  acao: { flexGrow: 1, flexBasis: 260 },
  trancar: { flexGrow: 0 },
  pendente: { fontSize: tamanho.texto, color: cores.ouroTexto, fontWeight: '700' },
  ok: { fontSize: tamanho.texto, color: '#065f46', fontWeight: '700' },
  atualizando: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  atualizandoTexto: { fontSize: tamanho.pequeno, color: cores.apagado },
  linhaErro: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700', textAlign: 'center' },
  numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  numero: { flexGrow: 1, flexBasis: 220, padding: 14, gap: 2, borderRadius: tamanho.raio, backgroundColor: cores.fundo },
  numeroTitulo: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  numeroValor: { fontSize: 28, fontWeight: '800', color: cores.marinho },
  numeroDetalhe: { fontSize: 15, fontWeight: '600', color: cores.apagado },
  nota: { fontSize: tamanho.pequeno, color: cores.apagado },
  filtroTipo: { gap: 8 },
  rotulo: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  subtitulo: { fontSize: 18, fontWeight: '800', color: cores.marinho, marginTop: 4 },
  lancamento: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: cores.linha },
  lancTextos: { flex: 1, minWidth: 0, gap: 2 },
  lancDescricao: { fontSize: 18, fontWeight: '600', color: cores.tinta },
  lancCategoria: { fontSize: 15, color: cores.apagado },
  lancValor: { fontSize: 18, fontWeight: '800', color: cores.tinta, textAlign: 'right', flexShrink: 0 },
  entrada: { color: '#065f46' },
  posicao: { width: 36, fontSize: 18, fontWeight: '800', color: cores.ouroTexto },
  dialogo: { fontSize: tamanho.texto, color: cores.tinta }
});
