import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEstado, central } from '../../../src/estado';
import { formatarReais, dataCurta, formatarNumero } from '../../../src/formato';
import { formatarMetros } from '../../../src/varas';
import {
  STATUS_ORDEM, chaveDaOrdem, emAndamento, prazoVencido, textoPrazo, fotosDoQuadro, tituloDoQuadro, detalhesDoQuadro,
  dadosDaFoto, dadosDeTirarFoto, acrescimoDoQuadro, opcoesDoLadoAMais, metrosDoLadoAMais, novoIdQuebra,
  dadosDoLadoAMais, dadosDeTirarLadoAMais, quebrasDoQuadro, textoDaQuebra, cortesDaOrdem, pedacoDoLadoAMais
} from '../../../src/oficina';
import { ordemLembrada } from '../../../src/ordemAberta';
import { numeroWhatsApp, linkWhatsApp } from '../../../src/whatsapp';
import { papelOrdem, fotosParaOPapel } from '../../../src/impressao';
import { fotoParaPapel } from '../../../src/foto';
import { BlocoFotos, useCameraDaOrdem } from '../../../src/componentes/FotosOrdem';
import { Cartao } from '../../../src/componentes/Cartao';
import { Botao } from '../../../src/componentes/Botao';
import { Dialogo } from '../../../src/componentes/Dialogo';
import { GrupoPilulas } from '../../../src/componentes/Pilula';
import { BotaoImprimir } from '../../../src/componentes/Imprimir';
import { Icone } from '../../../src/componentes/Icone';
import { AVISO, cores, tamanho } from '../../../src/tema';

function Detalhe({ d }) {
  return (
    <View style={s.linha}>
      <Text style={s.rotulo}>{d.rotulo}</Text>
      <View style={s.valorCaixa}>
        <Text style={[s.valor, d.nao && s.naoVai]}>{d.valor}</Text>
        {d.detalhe ? <Text style={s.detalhe}>{d.detalhe}</Text> : null}
      </View>
    </View>
  );
}

function QuadroCresce({ a }) {
  return (
    <View style={s.cresce}>
      <Icone nome="arrow-expand-all" tamanho={34} cor={AVISO.vermelho.borda} />
      <View style={s.cresceTextos}>
        <Text style={s.cresceRotulo}>O QUADRO CRESCE</Text>
        <Text style={s.cresceCortar}>{a.cortar}</Text>
        <Text style={s.cresceConta}>{a.conta}</Text>
      </View>
    </View>
  );
}

const ESTILO_CORTE = {
  pedaco: { aviso: AVISO.verde, icone: 'recycle' },
  vara: { aviso: { fundo: cores.cartao, borda: cores.marinho, texto: cores.marinho }, icone: 'content-cut' },
  falta: { aviso: AVISO.vermelho, icone: 'alert-circle-outline' }
};

function BlocoCortes({ cortes }) {
  return (
    <Cartao>
      <Text style={s.tituloQuadro} accessibilityRole="header">Cortes da moldura</Text>
      {cortes.map((c) => (
        <View key={c.codigo} style={s.corteMoldura}>
          <Text style={s.corteNome}>{c.titulo}</Text>
          {c.lugar ? <Text style={s.detalhe}>{c.lugar}</Text> : null}
          {c.linhas.map((l, i) => {
            const e = ESTILO_CORTE[l.tipo];
            return (
              <View key={i} style={[s.corte, { backgroundColor: e.aviso.fundo, borderLeftColor: e.aviso.borda }]}>
                <Icone nome={e.icone} tamanho={28} cor={e.aviso.borda} />
                <View style={s.corteTextos}>
                  <Text style={[s.corteTitulo, { color: e.aviso.texto }]}>{l.titulo}</Text>
                  <Text style={s.corteDetalhe}>{l.detalhe}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </Cartao>
  );
}

function BlocoQuadro({ titulo, acrescimo, descricao, detalhes, fotos, extra }) {
  return (
    <Cartao>
      <Text style={s.tituloQuadro} accessibilityRole="header">{titulo}</Text>
      {acrescimo ? <QuadroCresce a={acrescimo} /> : null}
      {fotos}
      {descricao ? (
        <View style={s.descricao}>
          <Text style={s.descricaoRotulo}>Descrição</Text>
          <Text style={s.descricaoTexto}>{descricao}</Text>
        </View>
      ) : null}
      {detalhes ? <View style={s.detalhes}>{detalhes.map((d) => <Detalhe key={d.rotulo} d={d} />)}</View> : null}
      {extra}
    </Cartao>
  );
}

export default function OrdemAberta() {
  const { ref } = useLocalSearchParams();
  const chave = String(ref);
  const visivel = useEstado((s) => s.visivel);
  const ativa = visivel ? (visivel.oficina || []).find((o) => chaveDaOrdem(o) === chave) : null;
  const o = ativa || ordemLembrada(chave);
  const [lado, setLado] = useState(null);
  const camera = useCameraDaOrdem(ativa ? chave : null, (quadro, foto, uri) => (
    central.registrar('fotoOrdem', dadosDaFoto(o, quadro, foto), { foto_uri: uri })
  ));
  if (!visivel) return null;
  if (!o) {
    return (
      <View style={s.sumiu}>
        <Stack.Screen options={{ title: 'Ordem de serviço' }} />
        <Text style={s.texto}>Essa ordem não está mais na oficina.</Text>
        <Botao titulo="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  const cliente = String(o.cliente || '').trim() || 'Cliente sem nome';
  const quadros = o.quadros || [];
  const atrasada = emAndamento(o) && prazoVencido(o.prazo);
  const numero = numeroWhatsApp(o.telefone);
  const blocoDeFotos = (n, nome, podeTirar) => {
    const fotos = fotosDoQuadro(o, n);
    return (
      <BlocoFotos
        fotos={fotos}
        nome={nome}
        aoTirar={ativa && podeTirar ? () => camera.tirar(n, fotos.length) : null}
        aoEscolher={ativa && podeTirar ? () => camera.escolher(n, fotos.length) : null}
        aoApagar={ativa ? (f) => central.registrar('tirarFotoOrdem', dadosDeTirarFoto(o, f)) : null}
        ocupado={camera.ocupado === n}
        erro={camera.erro && camera.erro.quadro === n ? camera.erro.texto : ''}
      />
    );
  };
  const semQuadro = fotosDoQuadro(o, 0);
  const cortes = cortesDaOrdem(visivel, o);
  const escolhida = lado ? lado.opcoes[lado.qual] : null;
  const pedacoLado = escolhida ? pedacoDoLadoAMais(visivel, escolhida.codigo, lado.lado_cm, lado.quantidade) : null;
  const abrirLado = (quadro, opcoes) => setLado({ quadro, opcoes, qual: 0, lado_cm: opcoes[0].lados[0] || 0, quantidade: 1 });
  const registrarLado = () => {
    central.registrar('ladoAMais', dadosDoLadoAMais(visivel, o, lado.quadro, {
      fora: escolhida.fora, codigo: escolhida.codigo, lado_cm: lado.lado_cm, quantidade: lado.quantidade
    }, novoIdQuebra()));
    setLado(null);
  };
  const blocoDeQuebras = (n, q) => {
    const opcoes = ativa ? opcoesDoLadoAMais(visivel, q).filter((x) => x.lados.length) : [];
    const quebras = quebrasDoQuadro(o, n);
    if (!opcoes.length && !quebras.length) return null;
    return (
      <View style={s.quebras}>
        {quebras.map((x) => (
          <View key={x.id} style={s.quebra}>
            <Text style={s.quebraTexto}>{textoDaQuebra(visivel, x)}</Text>
            {ativa ? (
              <Botao
                titulo="Tirar"
                variante="contorno"
                rotulo={'Tirar: ' + textoDaQuebra(visivel, x)}
                onPress={() => central.registrar('tirarLadoAMais', dadosDeTirarLadoAMais(o, x))}
              />
            ) : null}
          </View>
        ))}
        {opcoes.length ? <Botao icone="plus" titulo="Lado a mais (quebrou)" variante="contorno" onPress={() => abrirLado(n, opcoes)} /> : null}
      </View>
    );
  };
  const papel = async (formato) => papelOrdem(visivel, o, formato, visivel.loja, await fotosParaOPapel(o, formato, fotoParaPapel));

  return (
    <ScrollView contentContainerStyle={s.tela}>
      <Stack.Screen options={{ title: o.id ? 'Ordem ' + o.id : 'Ordem de serviço' }} />
      <View style={[s.cabeca, o.status === 'acabamento' && s.cabecaAcabamento, atrasada && s.cabecaAtrasada, o.status === 'pronto' && s.cabecaPronta]}>
        <View style={s.topo}>
          <Text style={s.cliente} accessibilityRole="header">{cliente}</Text>
          {o.pago ? <Text style={s.pago}>PAGO</Text> : null}
          {Number(o.valor) > 0 ? <Text style={s.preco}>{formatarReais(o.valor)}</Text> : null}
        </View>
        <Text style={[s.numero, !o.id && s.semNumero]}>
          {(o.id || 'Ainda não chegou na planilha') + ' · ' + (STATUS_ORDEM[o.status] || o.status)}
        </Text>
        {emAndamento(o) ? <Text style={[s.prazo, atrasada && s.atrasada]}>{textoPrazo(o.prazo)}</Text> : null}
        {o.status === 'pronto' ? <Text style={s.prazo}>Ficou pronto {dataCurta(o.data_pronto)}</Text> : null}
        {o.status === 'entregue' && o.data_entrega ? <Text style={s.prazo}>Entregue {dataCurta(o.data_entrega)}</Text> : null}
        {quadros.length && o.descricao ? <Text style={s.resumo}>{o.descricao}</Text> : null}
        <View style={s.acoes}>
          {numero ? (
            <Botao
              icone="whatsapp"
              titulo="WhatsApp"
              variante="contorno"
              rotulo={'Abrir o WhatsApp de ' + cliente}
              onPress={() => Linking.openURL(linkWhatsApp(numero, '')).catch(() => null)}
              estilo={s.acao}
            />
          ) : null}
          {ativa ? (
            <Botao
              icone="pencil-outline"
              titulo="Editar"
              variante="contorno"
              onPress={() => router.push('/oficina/' + encodeURIComponent(chave))}
              estilo={s.acao}
            />
          ) : null}
          <BotaoImprimir
            montar={papel}
            rotulo={'Imprimir a ordem de ' + cliente}
            dica="Na folha A4 vai a primeira foto de cada quadro. Depois escolha a impressora ou Salvar como PDF."
            estilo={s.acao}
          />
        </View>
      </View>

      {!ativa ? <Text style={s.aviso}>Essa ordem já saiu da oficina. Aqui é só pra ver.</Text> : null}

      {cortes.length ? <BlocoCortes cortes={cortes} /> : null}

      {quadros.map((q, i) => {
        const titulo = tituloDoQuadro(q, i, quadros.length);
        return (
          <BlocoQuadro
            key={i}
            titulo={titulo}
            acrescimo={acrescimoDoQuadro(q)}
            descricao={q.descricao}
            detalhes={detalhesDoQuadro(visivel, q)}
            fotos={blocoDeFotos(i + 1, titulo, true)}
            extra={blocoDeQuebras(i + 1, q)}
          />
        );
      })}

      {!quadros.length ? (
        <BlocoQuadro titulo="Serviço" descricao={o.descricao || 'Sem descrição.'} fotos={blocoDeFotos(0, 'Serviço', true)} />
      ) : null}

      {quadros.length && semQuadro.length ? (
        <BlocoQuadro titulo="Fotos da ordem" fotos={blocoDeFotos(0, 'Fotos da ordem', false)} />
      ) : null}

      <Dialogo visivel={!!escolhida} titulo="Lado a mais (quebrou)" aoFechar={() => setLado(null)}>
        {escolhida ? (
          <>
            {lado.opcoes.length > 1 ? (
              <GrupoPilulas
                opcoes={lado.opcoes.map((x, i) => ({ valor: i, titulo: x.titulo }))}
                valor={lado.qual}
                aoMudar={(i) => setLado({ ...lado, qual: i, lado_cm: lado.opcoes[i].lados[0] || 0 })}
              />
            ) : null}
            <Text style={s.ladoQual}>{escolhida.codigo} · {escolhida.nome}</Text>
            <Text style={s.ladoRotulo}>Qual lado quebrou</Text>
            <GrupoPilulas
              opcoes={escolhida.lados.map((c) => ({ valor: c, titulo: 'Lado de ' + formatarNumero(c) + ' cm' }))}
              valor={lado.lado_cm}
              aoMudar={(c) => setLado({ ...lado, lado_cm: c })}
            />
            <Text style={s.ladoRotulo}>Quantos lados</Text>
            <View style={s.ladoPasso}>
              <Botao
                titulo="−"
                rotulo="Um lado a menos"
                variante="contorno"
                onPress={() => setLado({ ...lado, quantidade: Math.max(1, lado.quantidade - 1) })}
                estilo={s.ladoBotaoPasso}
              />
              <Text style={s.ladoQuantidade} accessibilityLiveRegion="polite">{lado.quantidade}</Text>
              <Botao
                titulo="+"
                rotulo="Um lado a mais"
                variante="contorno"
                onPress={() => setLado({ ...lado, quantidade: Math.min(20, lado.quantidade + 1) })}
                estilo={s.ladoBotaoPasso}
              />
            </View>
            <Text style={s.ladoNota}>
              Sai do estoque {formatarMetros(metrosDoLadoAMais(visivel, escolhida.codigo, lado.lado_cm, lado.quantidade))}, já com a perda do corte. O cliente não paga a mais.
            </Text>
            {pedacoLado ? <Text style={[s.ladoNota, pedacoLado.falta && s.ladoFalta]}>{pedacoLado.texto}</Text> : null}
            <Botao titulo="Registrar" onPress={registrarLado} />
            <Botao titulo="Cancelar" variante="contorno" onPress={() => setLado(null)} />
          </>
        ) : null}
      </Dialogo>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 900, alignSelf: 'center' },
  cabeca: {
    padding: 18, gap: 8, backgroundColor: cores.cartao, borderRadius: tamanho.raioCartao,
    borderWidth: 1, borderColor: cores.linha, borderLeftWidth: 6, borderLeftColor: cores.marinho
  },
  cabecaAcabamento: { borderLeftColor: cores.ouro },
  cabecaAtrasada: { borderLeftColor: cores.vermelho },
  cabecaPronta: { borderLeftColor: '#047857' },
  topo: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  cliente: { flex: 1, fontSize: tamanho.titulo, fontWeight: '800', color: cores.marinho },
  preco: { fontSize: 24, fontWeight: '800', color: cores.tinta },
  pago: {
    fontSize: tamanho.pequeno, fontWeight: '800', letterSpacing: 1, color: AVISO.verde.texto, backgroundColor: AVISO.verde.fundo,
    borderWidth: 1.5, borderColor: AVISO.verde.borda, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden'
  },
  numero: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.ouroTexto },
  semNumero: { color: cores.apagado, fontWeight: '600' },
  prazo: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  atrasada: { color: cores.vermelho },
  resumo: { fontSize: 18, color: cores.tinta },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  acao: { flexGrow: 1, flexBasis: 180 },
  aviso: { fontSize: tamanho.texto, color: cores.apagado, fontWeight: '600' },
  tituloQuadro: { fontSize: 24, fontWeight: '800', color: cores.marinho },
  cresce: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: tamanho.raio,
    backgroundColor: AVISO.vermelho.fundo, borderWidth: 2, borderColor: AVISO.vermelho.borda, borderLeftWidth: 8
  },
  cresceTextos: { flex: 1, gap: 2 },
  cresceRotulo: { fontSize: tamanho.pequeno, fontWeight: '800', letterSpacing: 1, color: AVISO.vermelho.texto },
  cresceCortar: { fontSize: 22, fontWeight: '800', color: cores.tinta },
  cresceConta: { fontSize: tamanho.pequeno, fontWeight: '600', color: AVISO.vermelho.texto },
  descricao: {
    gap: 4, padding: 14, borderRadius: tamanho.raio, backgroundColor: cores.ouroClaro,
    borderLeftWidth: 5, borderLeftColor: cores.ouro
  },
  descricaoRotulo: { fontSize: tamanho.pequeno, fontWeight: '800', color: cores.ouroTexto },
  descricaoTexto: { fontSize: tamanho.texto, fontWeight: '600', color: cores.tinta },
  detalhes: { borderTopWidth: 1, borderTopColor: cores.linha },
  linha: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: cores.linha
  },
  rotulo: { width: 220, fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado, paddingTop: 3 },
  valorCaixa: { flex: 1, minWidth: 220, gap: 2 },
  valor: { fontSize: tamanho.texto, fontWeight: '700', color: cores.tinta },
  naoVai: { color: cores.apagado, fontWeight: '600' },
  detalhe: { fontSize: tamanho.pequeno, fontWeight: '600', color: cores.marinho },
  quebras: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.linha },
  quebra: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 12, borderRadius: tamanho.raio,
    backgroundColor: AVISO.vermelho.fundo, borderLeftWidth: 5, borderLeftColor: AVISO.vermelho.borda
  },
  quebraTexto: { flex: 1, minWidth: 220, fontSize: tamanho.texto, fontWeight: '700', color: AVISO.vermelho.texto },
  ladoQual: { fontSize: tamanho.texto, fontWeight: '700', color: cores.tinta },
  ladoRotulo: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  ladoPasso: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ladoBotaoPasso: { minWidth: tamanho.toque, paddingHorizontal: 0 },
  ladoQuantidade: { minWidth: 48, textAlign: 'center', fontSize: 28, fontWeight: '800', color: cores.marinho },
  ladoNota: { fontSize: tamanho.pequeno, fontWeight: '600', color: cores.marinho },
  ladoFalta: { color: AVISO.vermelho.texto, fontWeight: '800' },
  corteMoldura: { gap: 8 },
  corteNome: { fontSize: tamanho.texto, fontWeight: '800', color: cores.tinta },
  corte: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: tamanho.raio, borderLeftWidth: 6 },
  corteTextos: { flex: 1, gap: 2 },
  corteTitulo: { fontSize: tamanho.texto, fontWeight: '800' },
  corteDetalhe: { fontSize: tamanho.pequeno, fontWeight: '600', color: cores.tinta },
  sumiu: { flex: 1, padding: 24, gap: 16, alignItems: 'flex-start' },
  texto: { fontSize: tamanho.texto, color: cores.tinta }
});
