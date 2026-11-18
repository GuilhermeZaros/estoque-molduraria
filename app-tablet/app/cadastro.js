import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEstado, central } from '../src/estado';
import { nomeCasinha, normalizarCasinha, validarNovaMoldura } from '../src/gerado/nucleo';
import { prepararFoto, primeiraFoto } from '../src/foto';
import { totalMetros, numeroDoPerfil, pedacosDoValor, formatarMetros } from '../src/varas';
import { camposDaMoldura, ondeAMolduraEsta, codigoRepetido, juntarComE } from '../src/edicao';
import { Botao } from '../src/componentes/Botao';
import { Campo } from '../src/componentes/Campo';
import { CampoMetros } from '../src/componentes/CampoMetros';
import { Dialogo } from '../src/componentes/Dialogo';
import { cores, tamanho } from '../src/tema';

const MARCAS = ['Art Mold', 'Moldurarte', 'Aguiar', 'Moldunobre', 'Sul América', 'Ruberti', 'Santa Luzia'];
const VAZIO = { codigo: '', nome: '', marca: '', perfil_cm: '', preco_m: '', custo_m: '', estilo: '', cor: '' };

export default function Cadastro() {
  const { casinha: param, codigo: editando } = useLocalSearchParams();
  const casinha = normalizarCasinha(param);
  const visivel = useEstado((s) => s.visivel);
  const original = useMemo(
    () => (editando && visivel ? visivel.molduras.find((x) => x.codigo === String(editando)) || null : null),
    [editando, visivel]
  );
  const [campos, setCampos] = useState(() => (original ? camposDaMoldura(original) : VAZIO));
  const [carregou, setCarregou] = useState(!!original);
  const [metros, setMetros] = useState({ varas: '', extra: '', pedacos: [] });
  const [foto, setFoto] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const mudar = (chave) => (texto) => setCampos((c) => ({ ...c, [chave]: texto }));

  const usarFoto = async (asset) => {
    if (!asset) return;
    setOcupado(true);
    try {
      setFoto(await prepararFoto(asset));
    } catch (e) {
      setErro('Não consegui preparar a foto. Tente de novo.');
    }
    setOcupado(false);
  };

  useEffect(() => {
    if (carregou || !original) return;
    setCampos(camposDaMoldura(original));
    setCarregou(true);
  }, [original, carregou]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    ImagePicker.getPendingResultAsync().then((r) => usarFoto(primeiraFoto(r))).catch(() => null);
  }, []);

  if (!visivel || saindo) return null;
  const editar = !!editando;
  if (editar && !original) {
    return (
      <View style={s.tela}>
        <Stack.Screen options={{ title: 'Editar moldura' }} />
        <Text style={s.erro}>Não achei a moldura {String(editando)}.</Text>
        <Botao titulo="Voltar" variante="contorno" onPress={() => router.back()} />
      </View>
    );
  }
  const fotoAtual = foto ? foto.uri : (original && original.foto_url) || '';

  const tirarFoto = async () => {
    setErro('');
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      setErro('O app está sem permissão pra câmera. Libere nas configurações do tablet.');
      return;
    }
    usarFoto(primeiraFoto(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })));
  };

  const escolherFoto = async () => {
    setErro('');
    try {
      usarFoto(primeiraFoto(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })));
    } catch (e) {
      setErro('Não consegui abrir a galeria. Tente de novo.');
    }
  };

  const salvarEdicao = async () => {
    setErro('');
    let m;
    try {
      m = validarNovaMoldura({ ...campos, metros: 0, casinha: '' });
    } catch (e) {
      setErro(e.message);
      return;
    }
    if (codigoRepetido(visivel, original.codigo, m.codigo)) {
      setErro('Já existe um produto com o código ' + m.codigo + '.');
      return;
    }
    const dados = {
      codigo: original.codigo, codigo_novo: m.codigo, nome: m.nome, marca: m.marca, estilo: m.estilo, cor: m.cor,
      perfil_cm: m.perfil_cm, preco_m: m.preco_m, custo_m: m.custo_m
    };
    if (foto) {
      dados.foto_base64 = foto.base64;
      dados.foto_tipo = 'image/jpeg';
    }
    setSaindo(true);
    await central.registrar('editarMoldura', dados, foto ? { foto_uri: foto.uri } : null);
    router.back();
  };

  const lugares = editar ? ondeAMolduraEsta(visivel, original.codigo) : [];
  const excluir = async () => {
    setConfirmar(false);
    setSaindo(true);
    await central.registrar('excluirMoldura', { codigo: original.codigo });
    router.back();
  };

  const salvar = async () => {
    setErro('');
    const total = totalMetros(metros, numeroDoPerfil(campos.perfil_cm));
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
      perfil_cm: m.perfil_cm, preco_m: m.preco_m, custo_m: m.custo_m, metros: m.metros, casinha: m.casinha,
      pedacos: pedacosDoValor(metros, numeroDoPerfil(campos.perfil_cm)) || []
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
      <Stack.Screen options={{ title: editar ? 'Editar ' + original.codigo : casinha ? 'Moldura nova em ' + nomeCasinha(casinha) : 'Moldura nova' }} />
      <View style={s.fotoCaixa}>
        {fotoAtual ? (
          <Image source={{ uri: fotoAtual }} style={s.foto} contentFit="cover" accessibilityLabel={editar ? 'Foto da moldura ' + original.codigo : 'Foto da moldura nova'} />
        ) : (
          <View style={[s.foto, s.semFoto]}><Text style={s.semFotoTexto}>Sem foto ainda</Text></View>
        )}
        <View style={s.fotoAcoes}>
          <Botao icone="camera-outline" titulo={fotoAtual ? 'Tirar outra foto' : 'Tirar foto'} variante="ouro" onPress={tirarFoto} desativado={ocupado} />
          <Botao icone="image-multiple-outline" titulo="Escolher da galeria" variante="contorno" onPress={escolherFoto} desativado={ocupado} />
          <Text style={s.dica}>Sem foto a Julia não consegue mostrar a moldura pro cliente.</Text>
        </View>
      </View>
      <Campo
        rotulo="Código da etiqueta"
        valor={campos.codigo}
        aoMudar={mudar('codigo')}
        autoCapitalize="characters"
        dica={editar ? 'Se trocar o código, ele muda junto nos orçamentos, na oficina e na lista de compras. A quantidade em estoque se acerta no botão Corrigir da casinha.' : undefined}
      />
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
        rotulo="Preço de venda por metro (R$)"
        valor={campos.preco_m}
        aoMudar={mudar('preco_m')}
        teclado="decimal-pad"
        dica="Sem preço ela fica fora do catálogo: não aparece pra Julia nem no orçamento até alguém pôr o preço."
      />
      <Campo
        rotulo="Preço de custo por metro (R$)"
        valor={campos.custo_m}
        aoMudar={mudar('custo_m')}
        teclado="decimal-pad"
        dica="Quanto a loja paga no fornecedor. Se não souber, deixe em branco."
      />
      {editar ? null : (
        <CampoMetros valor={metros} aoMudar={setMetros} rotulo="Quanto tem" pedacos perfilCm={numeroDoPerfil(campos.perfil_cm)} />
      )}
      <Campo rotulo="Estilo (se quiser)" valor={campos.estilo} aoMudar={mudar('estilo')} autoCapitalize="sentences" />
      <Campo rotulo="Cor (se quiser)" valor={campos.cor} aoMudar={mudar('cor')} autoCapitalize="sentences" />
      {erro ? <Text style={s.erro} accessibilityLiveRegion="assertive">{erro}</Text> : null}
      <Botao grande titulo={editar ? 'Salvar mudanças' : 'Salvar moldura'} onPress={editar ? salvarEdicao : salvar} desativado={ocupado} />
      <Botao titulo="Cancelar" variante="contorno" onPress={() => router.back()} />
      {editar ? (
        <View style={s.excluir}>
          <Botao icone="trash-can-outline" titulo="Excluir moldura" variante="perigo" onPress={() => setConfirmar(true)} desativado={ocupado} />
        </View>
      ) : null}
      {editar ? (
        <Dialogo visivel={confirmar} titulo={'Excluir ' + original.codigo + '?'} aoFechar={() => setConfirmar(false)}>
          {lugares.length ? (
            <>
              <Text style={s.aviso}>Não dá pra excluir agora: ela ainda está {juntarComE(lugares)}. Tire ela de lá primeiro.</Text>
              <Botao titulo="Entendi" onPress={() => setConfirmar(false)} />
            </>
          ) : (
            <>
              <Text style={s.aviso}>
                A moldura {original.codigo} ({original.nome}) sai do sistema, da Julia e do orçamento. Não dá pra desfazer.
                {Number(original.estoque_m) > 0 ? ' Ela ainda tem ' + formatarMetros(Number(original.estoque_m)) + ' no estoque, que somem junto.' : ''}
              </Text>
              <Botao titulo="Excluir de vez" variante="perigo" onPress={excluir} />
              <Botao titulo="Cancelar" variante="contorno" onPress={() => setConfirmar(false)} />
            </>
          )}
        </Dialogo>
      ) : null}
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
  excluir: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: cores.linha },
  aviso: { fontSize: tamanho.texto, color: cores.tinta },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' }
});
