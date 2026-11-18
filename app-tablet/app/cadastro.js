import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEstado, central } from '../src/estado';
import { nomeCasinha, normalizarCasinha, validarNovaMoldura } from '../src/gerado/nucleo';
import { prepararFoto, primeiraFoto } from '../src/foto';
import { totalMetros, numeroDoPerfil } from '../src/varas';
import { camposDaMoldura } from '../src/edicao';
import { procurarNoCatalogo, camposDoCatalogo, resumoDoCatalogo, chaveCodigo } from '../src/catalogoFornecedores';
import { Botao } from '../src/componentes/Botao';
import { Campo } from '../src/componentes/Campo';
import { CampoMetros } from '../src/componentes/CampoMetros';
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
  const [procura, setProcura] = useState('');
  const [doCatalogo, setDoCatalogo] = useState(null);
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

  if (!visivel) return null;
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
  const jaCadastradas = new Set(visivel.molduras.map((p) => chaveCodigo(p.codigo)));
  const achadas = editar ? [] : procurarNoCatalogo(procura);
  const usarDoCatalogo = (m) => {
    setCampos(camposDoCatalogo(m));
    setDoCatalogo(m);
    setProcura('');
    setErro('');
  };

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
      m = validarNovaMoldura({ ...campos, codigo: original.codigo, metros: 0, casinha: '' });
    } catch (e) {
      setErro(e.message);
      return;
    }
    const dados = {
      codigo: original.codigo, nome: m.nome, marca: m.marca, estilo: m.estilo, cor: m.cor,
      perfil_cm: m.perfil_cm, preco_m: m.preco_m, custo_m: m.custo_m
    };
    if (foto) {
      dados.foto_base64 = foto.base64;
      dados.foto_tipo = 'image/jpeg';
    }
    await central.registrar('editarMoldura', dados, foto ? { foto_uri: foto.uri } : null);
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
      perfil_cm: m.perfil_cm, preco_m: m.preco_m, custo_m: m.custo_m, metros: m.metros, casinha: m.casinha
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
      {editar ? (
        <View style={s.codigoTravado}>
          <Text style={s.rotulo}>Código da etiqueta</Text>
          <Text style={s.codigoTexto}>{original.codigo}</Text>
          <Text style={s.dica}>O código não muda. A quantidade em estoque se acerta no botão Corrigir da casinha.</Text>
        </View>
      ) : (
        <View style={s.procura}>
          <Campo
            rotulo="Procurar no relatório da loja"
            valor={procura}
            aoMudar={setProcura}
            autoCapitalize="characters"
            dica="Digite o código (ou cor, fornecedor) e toque na moldura pra preencher tudo de uma vez."
          />
          {achadas.map((m) => {
            const ja = jaCadastradas.has(chaveCodigo(m.codigo));
            return (
              <Botao
                key={m.codigo}
                titulo={resumoDoCatalogo(m) + (ja ? ' (já cadastrada)' : '')}
                variante="contorno"
                desativado={ja}
                onPress={() => usarDoCatalogo(m)}
              />
            );
          })}
          {procura.trim() && achadas.length === 0 ? <Text style={s.dica}>Não achei no relatório. Preencha à mão.</Text> : null}
          {doCatalogo && doCatalogo.obs ? <Text style={s.dica}>Obs. do catálogo: {doCatalogo.obs}</Text> : null}
          {doCatalogo && doCatalogo.altura_cm ? (
            <Text style={s.dica}>Altura do perfil: {String(doCatalogo.altura_cm).replace('.', ',')} cm{doCatalogo.rebaixo_mm ? ' · rebaixo ' + doCatalogo.rebaixo_mm + ' mm' : ''}</Text>
          ) : null}
          <Campo rotulo="Código da etiqueta" valor={campos.codigo} aoMudar={mudar('codigo')} autoCapitalize="characters" />
        </View>
      )}
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
  codigoTravado: { gap: 4 },
  procura: { gap: 8 },
  codigoTexto: { fontSize: 24, fontWeight: '800', color: cores.marinho },
  erro: { fontSize: tamanho.texto, color: cores.vermelho, fontWeight: '700' }
});
