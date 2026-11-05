import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { prepararFoto, primeiraFoto } from '../foto';
import { LIMITE_FOTOS } from '../oficina';
import { Cartao } from './Cartao';
import { Botao } from './Botao';
import { cores, tamanho } from '../tema';

const chave = (f) => f.ref || f.url;

export function CartaoFotos({ fotos, aoMudar }) {
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [vendo, setVendo] = useState(null);

  const usarFoto = async (asset) => {
    if (!asset) return;
    setOcupado(true);
    try {
      const foto = await prepararFoto(asset);
      aoMudar((atuais) => (atuais.length >= LIMITE_FOTOS ? atuais : [...atuais, { ref: Crypto.randomUUID(), url: foto.uri, nova: true }]));
    } catch (e) {
      setErro('Não consegui preparar a foto. Tire de novo.');
    }
    setOcupado(false);
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    ImagePicker.getPendingResultAsync().then((r) => usarFoto(primeiraFoto(r))).catch(() => null);
  }, []);

  const tirarFoto = async () => {
    setErro('');
    if (fotos.length >= LIMITE_FOTOS) {
      setErro('Chegou no limite de ' + LIMITE_FOTOS + ' fotos. Tire uma pra pôr outra.');
      return;
    }
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      setErro('O app está sem permissão pra câmera. Libere nas configurações do tablet.');
      return;
    }
    usarFoto(primeiraFoto(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })));
  };

  const tirar = (f) => {
    setErro('');
    aoMudar((atuais) => atuais.filter((x) => chave(x) !== chave(f)));
  };

  return (
    <Cartao titulo="FOTOS DE COMO VAI FICAR" direita={<Text style={s.contador}>{fotos.length + ' de ' + LIMITE_FOTOS}</Text>}>
      {fotos.length ? (
        <View style={s.grade}>
          {fotos.map((f, i) => (
            <View key={chave(f)} style={s.item}>
              <Pressable
                onPress={() => setVendo(i)}
                accessibilityRole="imagebutton"
                accessibilityLabel={'Abrir a foto ' + (i + 1)}
                style={({ pressed }) => pressed && s.apertada}>
                <Image source={{ uri: f.url }} style={s.foto} contentFit="cover" />
              </Pressable>
              <Botao titulo="Tirar" variante="perigo" rotulo={'Tirar a foto ' + (i + 1)} onPress={() => tirar(f)} estilo={s.tirar} />
            </View>
          ))}
        </View>
      ) : (
        <Text style={s.dica}>Tire uma foto de cada peça com o canto da moldura em cima, pra oficina ver como vai ficar.</Text>
      )}
      {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
      <Botao
        icone="camera-outline"
        titulo={ocupado ? 'Preparando a foto…' : 'Tirar foto'}
        variante="ouro"
        onPress={tirarFoto}
        desativado={ocupado}
      />
      <VerFotos fotos={fotos} inicio={vendo} aoFechar={() => setVendo(null)} />
    </Cartao>
  );
}

export function MiniaturasOrdem({ fotos, cliente }) {
  const [vendo, setVendo] = useState(null);
  if (!fotos.length) return null;
  return (
    <>
      <View style={s.fileira}>
        {fotos.map((f, i) => (
          <Pressable
            key={chave(f)}
            onPress={() => setVendo(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={'Abrir a foto ' + (i + 1) + ' de ' + fotos.length + ', ' + cliente}
            style={({ pressed }) => pressed && s.apertada}>
            <Image source={{ uri: f.url }} style={s.miniatura} contentFit="cover" />
          </Pressable>
        ))}
      </View>
      <VerFotos fotos={fotos} inicio={vendo} aoFechar={() => setVendo(null)} />
    </>
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
  contador: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  item: { width: 150, gap: 8 },
  foto: { width: 150, height: 150, borderRadius: 12, backgroundColor: cores.marinhoClaro },
  tirar: { minHeight: 48 },
  dica: { fontSize: tamanho.pequeno, color: cores.apagado },
  erro: { fontSize: tamanho.pequeno, color: cores.vermelho, fontWeight: '700' },
  fileira: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 4 },
  miniatura: { width: 96, height: 96, borderRadius: 10, backgroundColor: cores.marinhoClaro },
  apertada: { opacity: 0.75 },
  fundo: { flex: 1, backgroundColor: 'rgba(10, 18, 32, 0.94)', padding: 20, gap: 16, alignItems: 'center', justifyContent: 'center' },
  grande: { flex: 1, width: '100%' },
  posicao: { fontSize: tamanho.texto, fontWeight: '700', color: '#ffffff' },
  controles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%', maxWidth: 720 },
  controle: { flexGrow: 1, flexBasis: 180 }
});
