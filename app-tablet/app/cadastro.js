import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEstado, central } from '../src/estado';
import { nomeCasinha, normalizarCasinha, validarNovaMoldura } from '../src/gerado/nucleo';
import { prepararFoto, primeiraFoto } from '../src/foto';
import { totalMetros } from '../src/varas';
import { Botao } from '../src/componentes/Botao';
import { Campo } from '../src/componentes/Campo';
import { CampoMetros } from '../src/componentes/CampoMetros';
import { cores, tamanho } from '../src/tema';

const MARCAS = ['Moldurarte', 'Artmold', 'Molduras Aguiar', 'Ruberti'];
const VAZIO = { codigo: '', nome: '', marca: '', perfil_cm: '', preco_m: '', estilo: '', cor: '' };

export default function Cadastro() {
  const { casinha: param } = useLocalSearchParams();
  const casinha = normalizarCasinha(param);
  const visivel = useEstado((s) => s.visivel);
  const [campos, setCampos] = useState(VAZIO);
  const [metros, setMetros] = useState({ varas: '', extra: '' });
  const [foto, setFoto] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const mudar = (chave) => (texto) => setCampos((c) => ({ ...c, [chave]: texto }));

  const usarFoto = async (asset) => {
    if (!asset) return;
    setOcupado(true);
    try {
      setFoto(await prepararFoto(asset));
    } catch (e) {
      setErro('Não consegui preparar a foto. Tire de novo.');
    }
    setOcupado(false);
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    ImagePicker.getPendingResultAsync().then((r) => usarFoto(primeiraFoto(r))).catch(() => null);
  }, []);

  if (!visivel) return null;

  const tirarFoto = async () => {
    setErro('');
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      setErro('O app está sem permissão pra câmera. Libere nas configurações do tablet.');
      return;
    }
    usarFoto(primeiraFoto(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })));
  };

  const salvar = async () => {
    setErro('');
    const total = totalMetros(metros);
    if (total == null) {
      setErro('Informe quanto tem dessa moldura (0 se não tem).');
      return;
    }
    let m;
    try {
      m = validarNovaMoldura({ ...campos, metros: total, casinha });
    } catch (e) {
      setErro(e.message);
      return;
    }
    const usados = new Set([...visivel.molduras, ...visivel.materiais].map((p) => String(p.codigo)));
    if (usados.has(m.codigo)) {
      setErro('Já existe um produto com o código ' + m.codigo + '.');
      return;
    }
    const dados = {
      codigo: m.codigo, nome: m.nome, marca: m.marca, estilo: m.estilo, cor: m.cor,
      perfil_cm: m.perfil_cm, preco_m: m.preco_m, metros: m.metros, casinha: m.casinha
    };
    if (foto) {
      dados.foto_base64 = foto.base64;
      dados.foto_tipo = 'image/jpeg';
    }
    await central.registrar('cadastrarMoldura', dados, foto ? { foto_uri: foto.uri } : null);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={s.tela} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: casinha ? 'Moldura nova em ' + nomeCasinha(casinha) : 'Moldura nova' }} />
      <View style={s.fotoCaixa}>
        {foto ? (
          <Image source={{ uri: foto.uri }} style={s.foto} contentFit="cover" accessibilityLabel="Foto da moldura nova" />
        ) : (
          <View style={[s.foto, s.semFoto]}><Text style={s.semFotoTexto}>Sem foto ainda</Text></View>
        )}
        <View style={s.fotoAcoes}>
          <Botao titulo={foto ? 'Tirar outra foto' : 'Tirar foto'} variante="ouro" onPress={tirarFoto} desativado={ocupado} />
          <Text style={s.dica}>Sem foto a Julia não consegue mostrar a moldura pro cliente.</Text>
        </View>
      </View>
      <Campo rotulo="Código da etiqueta" valor={campos.codigo} aoMudar={mudar('codigo')} autoCapitalize="characters" />
      <Campo rotulo="Nome" valor={campos.nome} aoMudar={mudar('nome')} autoCapitalize="sentences" />
      <Text style={s.rotulo}>Fornecedor</Text>
      <View style={s.marcas}>
        {MARCAS.map((marca) => (
          <Botao key={marca} titulo={marca} variante={campos.marca === marca ? 'primario' : 'contorno'} onPress={() => setCampos((c) => ({ ...c, marca }))} />
        ))}
      </View>
      <Campo rotulo="Outro fornecedor" valor={MARCAS.includes(campos.marca) ? '' : campos.marca} aoMudar={mudar('marca')} autoCapitalize="words" />
      <Campo rotulo="Largura do perfil (cm)" valor={campos.perfil_cm} aoMudar={mudar('perfil_cm')} teclado="decimal-pad" />
      <Campo
        rotulo="Preço por metro (R$)"
        valor={campos.preco_m}
        aoMudar={mudar('preco_m')}
        teclado="decimal-pad"
        dica="Sem preço ela fica fora do catálogo: não aparece pra Julia nem no orçamento até alguém pôr o preço na planilha."
      />
      <CampoMetros valor={metros} aoMudar={setMetros} rotulo="Quanto tem" />
      <Campo rotulo="Estilo (se quiser)" valor={campos.estilo} aoMudar={mudar('estilo')} autoCapitalize="sentences" />
      <Campo rotulo="Cor (se quiser)" valor={campos.cor} aoMudar={mudar('cor')} autoCapitalize="sentences" />
      {erro ? <Text style={s.erro} accessibilityLiveRegion="assertive">{erro}</Text> : null}
      <Botao grande titulo="Salvar moldura" onPress={salvar} desativado={ocupado} />
      <Botao titulo="Cancelar" variante="contorno" onPress={() => router.back()} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: { padding: 20, gap: 16, paddingBottom: 48 },
  fotoCaixa: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' },
  foto: { width: 200, height: 200, borderRadius: 16, backgroundColor: '#ffffff' },
  semFoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: cores.apagado },
  semFotoTexto: { fontSize: tamanho.pequeno, color: cores.apagado },
  fotoAcoes: { flex: 1, minWidth: 220, gap: 8 },
  dica: { fontSize: tamanho.pequeno, color: cores.apagado },
  rotulo: { fontSize: tamanho.texto, fontWeight: '700', color: cores.tinta },
  marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' }
});
