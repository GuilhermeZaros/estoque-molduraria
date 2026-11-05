import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { prepararFoto, primeiraFoto } from '../foto';
import { LIMITE_FOTOS } from '../oficina';
import { criarArmazenamento } from '../armazenamento';
import { Botao } from './Botao';
import { Dialogo } from './Dialogo';
import { cores, tamanho } from '../tema';

const chave = (f) => f.ref || f.url;
const guardado = criarArmazenamento('camera:');

export function useCameraDaOrdem(ordem, aoFoto) {
  const [ocupado, setOcupado] = useState(null);
  const [erro, setErro] = useState(null);
  const aoFotoRef = useRef(aoFoto);
  aoFotoRef.current = aoFoto;

  const usar = useCallback(async (asset, quadro) => {
    if (!asset) return;
    setOcupado(quadro);
    try {
      const foto = await prepararFoto(asset);
      await aoFotoRef.current(quadro, Crypto.randomUUID(), foto.uri);
    } catch (e) {
      setErro({ quadro, texto: 'Não consegui preparar a foto. Tire de novo.' });
    }
    setOcupado(null);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !ordem) return;
    (async () => {
      const pendente = await guardado.ler('pendente', null);
      if (!pendente || pendente.ordem !== ordem) return;
      await guardado.apagar('pendente');
      usar(primeiraFoto(await ImagePicker.getPendingResultAsync()), pendente.quadro);
    })().catch(() => null);
  }, [ordem, usar]);

  const tirar = async (quadro, quantas) => {
    setErro(null);
    if (quantas >= LIMITE_FOTOS) {
      setErro({ quadro, texto: 'Chegou no limite de ' + LIMITE_FOTOS + ' fotos. Apague uma pra pôr outra.' });
      return;
    }
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      setErro({ quadro, texto: 'O app está sem permissão pra câmera. Libere nas configurações do tablet.' });
      return;
    }
    await guardado.gravar('pendente', { ordem, quadro }).catch(() => null);
    const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    await guardado.apagar('pendente').catch(() => null);
    usar(primeiraFoto(resultado), quadro);
  };

  return { tirar, ocupado, erro };
}

export function BlocoFotos({ fotos, nome, aoTirar, aoApagar, ocupado = false, erro = '' }) {
  const [vendo, setVendo] = useState(null);
  const [apagando, setApagando] = useState(null);
  const confirmar = () => {
    aoApagar(apagando);
    setApagando(null);
  };
  return (
    <View style={s.bloco}>
      {aoTirar ? <Text style={s.contador}>{'Fotos: ' + fotos.length + ' de ' + LIMITE_FOTOS}</Text> : null}
      {fotos.length ? (
        <View style={s.grade}>
          {fotos.map((f, i) => (
            <View key={chave(f)} style={s.item}>
              <Pressable
                onPress={() => setVendo(i)}
                accessibilityRole="imagebutton"
                accessibilityLabel={'Abrir a foto ' + (i + 1) + ' de ' + fotos.length + ', ' + nome}
                style={({ pressed }) => pressed && s.apertada}>
                <Image source={{ uri: f.url }} style={s.foto} contentFit="cover" />
              </Pressable>
              {aoApagar ? (
                <Botao
                  icone="trash-can-outline"
                  titulo="Apagar"
                  variante="perigo"
                  rotulo={'Apagar a foto ' + (i + 1) + ', ' + nome}
                  onPress={() => setApagando(f)}
                  estilo={s.apagar}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : aoTirar ? (
        <Text style={s.dica}>Tire uma foto com o canto da moldura em cima, pra oficina ver como vai ficar.</Text>
      ) : null}
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      {aoTirar ? (
        <Botao
          icone="camera-outline"
          titulo={ocupado ? 'Preparando a foto…' : 'Tirar foto'}
          rotulo={'Tirar foto, ' + nome}
          variante="ouro"
          onPress={aoTirar}
          desativado={ocupado}
          estilo={s.camera}
        />
      ) : null}
      <VerFotos fotos={fotos} inicio={vendo} aoFechar={() => setVendo(null)} />
      <Dialogo visivel={!!apagando} titulo="Apagar esta foto?" aoFechar={() => setApagando(null)}>
        {apagando ? <Image source={{ uri: apagando.url }} style={s.previa} contentFit="cover" /> : null}
        <Text style={s.dialogo}>A foto sai da ordem e não dá pra desfazer.</Text>
        <Botao grande icone="trash-can-outline" titulo="Sim, apagar" variante="perigo" onPress={confirmar} />
        <Botao titulo="Voltar" variante="contorno" onPress={() => setApagando(null)} />
      </Dialogo>
    </View>
  );
}

const MOSTRAR = 4;

export function MiniaturasOrdem({ fotos }) {
  if (!fotos.length) return null;
  const sobra = fotos.length - MOSTRAR;
  return (
    <View style={s.fileira} accessible={false} importantForAccessibility="no-hide-descendants">
      {fotos.slice(0, sobra > 0 ? MOSTRAR - 1 : MOSTRAR).map((f) => (
        <Image key={chave(f)} source={{ uri: f.url }} style={s.miniatura} contentFit="cover" />
      ))}
      {sobra > 0 ? (
        <View style={[s.miniatura, s.mais]}>
          <Text style={s.maisTexto}>{'+' + (sobra + 1)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function VerFotos({ fotos, inicio, aoFechar }) {
  const aberto = inicio != null && fotos.length > 0;
  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={aoFechar}>
      {aberto ? <Visor key={inicio} fotos={fotos} inicio={inicio} aoFechar={aoFechar} /> : null}
    </Modal>
  );
}

function Visor({ fotos, inicio, aoFechar }) {
  const [posicao, setPosicao] = useState(inicio);
  const i = Math.min(posicao, fotos.length - 1);
  const varias = fotos.length > 1;
  const andar = (passo) => setPosicao((n) => (Math.min(n, fotos.length - 1) + passo + fotos.length) % fotos.length);
  return (
    <View style={s.fundo} accessibilityViewIsModal>
      <Image
        source={{ uri: fotos[i].url }}
        style={s.grande}
        contentFit="contain"
        accessibilityLabel={'Foto ' + (i + 1) + ' de ' + fotos.length}
      />
      {varias ? <Text style={s.posicao}>{(i + 1) + ' de ' + fotos.length}</Text> : null}
      <View style={s.controles}>
        {varias ? <Botao icone="chevron-left" titulo="Anterior" variante="contorno" onPress={() => andar(-1)} estilo={s.controle} /> : null}
        {varias ? <Botao icone="chevron-right" titulo="Próxima" variante="contorno" onPress={() => andar(1)} estilo={s.controle} /> : null}
        <Botao icone="close" titulo="Fechar" variante="ouro" onPress={aoFechar} estilo={s.controle} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bloco: { gap: 12 },
  contador: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  item: { width: 160, gap: 8 },
  foto: { width: 160, height: 160, borderRadius: 12, backgroundColor: cores.marinhoClaro },
  apagar: { minHeight: 48, paddingHorizontal: 10 },
  camera: { alignSelf: 'flex-start', minWidth: 240 },
  dica: { fontSize: tamanho.pequeno, color: cores.apagado },
  erro: { fontSize: tamanho.pequeno, color: cores.vermelho, fontWeight: '700' },
  previa: { width: 200, height: 200, borderRadius: 12, alignSelf: 'center', backgroundColor: cores.marinhoClaro },
  dialogo: { fontSize: tamanho.texto, color: cores.tinta },
  fileira: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 4 },
  miniatura: { width: 96, height: 96, borderRadius: 10, backgroundColor: cores.marinhoClaro },
  mais: { alignItems: 'center', justifyContent: 'center' },
  maisTexto: { fontSize: 22, fontWeight: '800', color: cores.marinho },
  apertada: { opacity: 0.75 },
  fundo: { flex: 1, backgroundColor: 'rgba(10, 18, 32, 0.94)', padding: 20, gap: 16, alignItems: 'center', justifyContent: 'center' },
  grande: { flex: 1, width: '100%' },
  posicao: { fontSize: tamanho.texto, fontWeight: '700', color: '#ffffff' },
  controles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%', maxWidth: 720 },
  controle: { flexGrow: 1, flexBasis: 180 }
});
