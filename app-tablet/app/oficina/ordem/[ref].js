import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEstado, central } from '../../../src/estado';
import { formatarReais, dataCurta } from '../../../src/formato';
import {
  STATUS_ORDEM, chaveDaOrdem, emAndamento, prazoVencido, textoPrazo, fotosDoQuadro, tituloDoQuadro, detalhesDoQuadro,
  dadosDaFoto, dadosDeTirarFoto
} from '../../../src/oficina';
import { ordemLembrada } from '../../../src/ordemAberta';
import { numeroWhatsApp, linkWhatsApp } from '../../../src/whatsapp';
import { BlocoFotos, useCameraDaOrdem } from '../../../src/componentes/FotosOrdem';
import { Cartao } from '../../../src/componentes/Cartao';
import { Botao } from '../../../src/componentes/Botao';
import { cores, tamanho } from '../../../src/tema';

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

function BlocoQuadro({ titulo, descricao, detalhes, fotos }) {
  return (
    <Cartao>
      <Text style={s.tituloQuadro} accessibilityRole="header">{titulo}</Text>
      {fotos}
      {descricao ? (
        <View style={s.descricao}>
          <Text style={s.descricaoRotulo}>Descrição</Text>
          <Text style={s.descricaoTexto}>{descricao}</Text>
        </View>
      ) : null}
      {detalhes ? <View style={s.detalhes}>{detalhes.map((d) => <Detalhe key={d.rotulo} d={d} />)}</View> : null}
    </Cartao>
  );
}

export default function OrdemAberta() {
  const { ref } = useLocalSearchParams();
  const chave = String(ref);
  const visivel = useEstado((s) => s.visivel);
  const ativa = visivel ? (visivel.oficina || []).find((o) => chaveDaOrdem(o) === chave) : null;
  const o = ativa || ordemLembrada(chave);
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
        aoApagar={ativa ? (f) => central.registrar('tirarFotoOrdem', dadosDeTirarFoto(o, f)) : null}
        ocupado={camera.ocupado === n}
        erro={camera.erro && camera.erro.quadro === n ? camera.erro.texto : ''}
      />
    );
  };
  const semQuadro = fotosDoQuadro(o, 0);

  return (
    <ScrollView contentContainerStyle={s.tela}>
      <Stack.Screen options={{ title: o.id ? 'Ordem ' + o.id : 'Ordem de serviço' }} />
      <View style={[s.cabeca, o.status === 'acabamento' && s.cabecaAcabamento, atrasada && s.cabecaAtrasada, o.status === 'pronto' && s.cabecaPronta]}>
        <View style={s.topo}>
          <Text style={s.cliente} accessibilityRole="header">{cliente}</Text>
          {Number(o.valor) > 0 ? <Text style={s.preco}>{formatarReais(o.valor)}</Text> : null}
        </View>
        <Text style={[s.numero, !o.id && s.semNumero]}>
          {(o.id || 'Ainda não chegou na planilha') + ' · ' + (STATUS_ORDEM[o.status] || o.status)}
        </Text>
        {emAndamento(o) ? <Text style={[s.prazo, atrasada && s.atrasada]}>{textoPrazo(o.prazo)}</Text> : null}
        {o.status === 'pronto' ? <Text style={s.prazo}>Ficou pronto {dataCurta(o.data_pronto)}</Text> : null}
        {o.status === 'entregue' && o.data_entrega ? <Text style={s.prazo}>Entregue {dataCurta(o.data_entrega)}</Text> : null}
        {quadros.length && o.descricao ? <Text style={s.resumo}>{o.descricao}</Text> : null}
        {numero || ativa ? (
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
          </View>
        ) : null}
      </View>

      {!ativa ? <Text style={s.aviso}>Essa ordem já saiu da oficina. Aqui é só pra ver.</Text> : null}

      {quadros.map((q, i) => {
        const titulo = tituloDoQuadro(q, i, quadros.length);
        return (
          <BlocoQuadro
            key={i}
            titulo={titulo}
            descricao={q.descricao}
            detalhes={detalhesDoQuadro(visivel, q)}
            fotos={blocoDeFotos(i + 1, titulo, true)}
          />
        );
      })}

      {!quadros.length ? (
        <BlocoQuadro titulo="Serviço" descricao={o.descricao || 'Sem descrição.'} fotos={blocoDeFotos(0, 'Serviço', true)} />
      ) : null}

      {quadros.length && semQuadro.length ? (
        <BlocoQuadro titulo="Fotos da ordem" fotos={blocoDeFotos(0, 'Fotos da ordem', false)} />
      ) : null}
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
  numero: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.ouroTexto },
  semNumero: { color: cores.apagado, fontWeight: '600' },
  prazo: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  atrasada: { color: cores.vermelho },
  resumo: { fontSize: 18, color: cores.tinta },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  acao: { flexGrow: 1, flexBasis: 180 },
  aviso: { fontSize: tamanho.texto, color: cores.apagado, fontWeight: '600' },
  tituloQuadro: { fontSize: 24, fontWeight: '800', color: cores.marinho },
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
  sumiu: { flex: 1, padding: 24, gap: 16, alignItems: 'flex-start' },
  texto: { fontSize: tamanho.texto, color: cores.tinta }
});
