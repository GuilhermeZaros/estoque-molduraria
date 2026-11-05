import { useState } from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import * as Print from 'expo-print';
import { Botao } from './Botao';
import { Dialogo } from './Dialogo';
import { FORMATOS } from '../impressao';
import { cores, tamanho } from '../tema';

const ICONES = { a4: 'file-document-outline', cupom80: 'receipt', cupom58: 'receipt' };

async function abrirImpressao(papel) {
  if (Platform.OS !== 'web') {
    await Print.printAsync(papel);
    return;
  }
  const janela = window.open('', '_blank');
  if (!janela) throw new Error('janela bloqueada');
  janela.document.write(papel.html);
  janela.document.close();
}

export function BotaoImprimir({ montar, desativado, rotulo, dica, estilo }) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const fechar = () => {
    if (!ocupado) setAberto(false);
  };
  const imprimir = async (formato) => {
    setOcupado(formato);
    setErro('');
    try {
      await abrirImpressao(await montar(formato));
      setAberto(false);
    } catch {
      setErro('Não deu pra abrir a impressão neste tablet. Tente de novo.');
    } finally {
      setOcupado('');
    }
  };
  return (
    <>
      <Botao
        icone="printer-outline"
        titulo="Imprimir"
        variante="contorno"
        desativado={desativado}
        rotulo={rotulo}
        onPress={() => {
          setErro('');
          setAberto(true);
        }}
        estilo={estilo}
      />
      <Dialogo visivel={aberto} titulo="Imprimir em qual papel?" aoFechar={fechar}>
        {FORMATOS.map((f) => (
          <Botao
            key={f.valor}
            grande
            icone={ICONES[f.valor]}
            titulo={ocupado === f.valor ? 'Preparando o papel...' : f.titulo}
            variante={f.valor === 'a4' ? 'primario' : 'contorno'}
            desativado={!!ocupado}
            onPress={() => imprimir(f.valor)}
          />
        ))}
        {dica ? <Text style={s.dica}>{dica}</Text> : null}
        {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
        <Botao titulo="Voltar" variante="contorno" desativado={!!ocupado} onPress={fechar} />
      </Dialogo>
    </>
  );
}

const s = StyleSheet.create({
  dica: { fontSize: tamanho.pequeno, color: cores.apagado },
  erro: { fontSize: tamanho.texto, fontWeight: '700', color: cores.vermelho }
});
