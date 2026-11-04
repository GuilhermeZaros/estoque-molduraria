import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  BORDAS_PASPATUR, TAMANHOS_CAMISETA, TIPOS_QUADRO, moldurasDoOrcamento, materiaisDe, escolherTamanho,
  tamanhoDaCamiseta
} from '../orcamento';
import { formatarReais, formatarNumero } from '../formato';
import { nomeCasinha, TAXA_PINTURA_CHAPA } from '../gerado/nucleo';
import { Cartao } from './Cartao';
import { Campo } from './Campo';
import { GrupoPilulas } from './Pilula';
import { Interruptor } from './Interruptor';
import { Quantidade } from './Quantidade';
import { BuscaMoldura } from './BuscaMoldura';
import { CartaoMoldura } from './CartaoMoldura';
import { AvisoMoldura } from './AvisoMoldura';
import { DetalheQuadro } from './ResumoOrcamento';
import { Botao } from './Botao';
import { cores, tamanho } from '../tema';

const BORDAS = [{ valor: '', titulo: 'Sem' }, ...BORDAS_PASPATUR.map((b) => ({ valor: String(b), titulo: b + ' cm' }))];
const TAMANHOS = TAMANHOS_CAMISETA.map((t) => ({ valor: t.tamanho, titulo: t.tamanho }));

function opcoes(lista, nenhum) {
  return [{ valor: '', titulo: nenhum }, ...lista.map((m) => ({ valor: String(m.codigo), titulo: m.nome }))];
}

function juntar(numeros) {
  return numeros.length > 1 ? numeros.slice(0, -1).join(', ') + ' e ' + numeros[numeros.length - 1] : String(numeros[0]);
}

export function EditorQuadro({ q, n, total, pacote, r, aviso, aoMudar, aoTrocarTipo, aoDuplicar, aoTirar }) {
  const [trocando, setTrocando] = useState(false);
  const camiseta = q.tipo === 'camiseta';
  const reforma = q.tipo === 'reforma';
  const moldura = q.moldura ? pacote.molduras.find((m) => m.codigo === q.moldura) : null;
  const molduras = moldurasDoOrcamento(pacote);
  const novo = reforma ? ' NOVO' : '';
  const medida = (
    <View style={s.dupla}>
      <View style={s.metade}><Campo rotulo="Largura (cm)" valor={q.largura} aoMudar={(v) => aoMudar({ largura: v })} teclado="decimal-pad" /></View>
      <View style={s.metade}><Campo rotulo="Altura (cm)" valor={q.altura} aoMudar={(v) => aoMudar({ altura: v })} teclado="decimal-pad" /></View>
    </View>
  );

  return (
    <>
      <View style={s.topo}>
        <Text style={s.numero} accessibilityRole="header">{total > 1 ? 'Quadro ' + n + ' de ' + total : 'Quadro'}</Text>
        <Text style={s.valor}>{r && r.ok ? formatarReais(r.calc.valor_total) : ''}</Text>
      </View>

      <Cartao titulo="O QUE É">
        <GrupoPilulas opcoes={TIPOS_QUADRO} valor={q.tipo} aoMudar={aoTrocarTipo} />
        {reforma ? <Text style={s.nota}>O quadro é do cliente. Marque só o que vai trocar.</Text> : null}
      </Cartao>

      {camiseta ? (
        <Cartao titulo="TAMANHO DA CAMISETA">
          <GrupoPilulas
            opcoes={TAMANHOS}
            valor={tamanhoDaCamiseta(q.largura, q.altura) || null}
            aoMudar={(t) => aoMudar(escolherTamanho(q, t))}
          />
          <Text style={s.nota}>Ou meça a camiseta deitada:</Text>
          {medida}
          <Quantidade valor={q.quantidade} aoMudar={(v) => aoMudar({ quantidade: v })} />
          <Campo
            rotulo="Borda em volta (cm)"
            valor={q.margem}
            aoMudar={(v) => aoMudar({ margem: v })}
            teclado="decimal-pad"
            dica="Espaço de cada lado pra camiseta não ficar colada na moldura."
          />
          {r && r.ok ? (
            <Text style={s.nota}>O quadro fica {formatarNumero(r.externa.largura)} x {formatarNumero(r.externa.altura)} cm.</Text>
          ) : null}
        </Cartao>
      ) : (
        <>
          <Cartao titulo={reforma ? 'MEDIDA' : 'MEDIDA DA FOTO'}>
            {medida}
            <Quantidade valor={q.quantidade} aoMudar={(v) => aoMudar({ quantidade: v })} />
          </Cartao>
          <Cartao titulo={'PASPATUR' + novo}>
            <GrupoPilulas
              opcoes={BORDAS}
              valor={q.borda_outra ? null : q.paspatur}
              aoMudar={(v) => aoMudar({ borda_outra: false, paspatur: v })}
            />
            <Campo
              rotulo="Outra borda (cm)"
              valor={q.borda_outra ? q.paspatur : ''}
              aoMudar={(v) => aoMudar({ borda_outra: v !== '', paspatur: v })}
              teclado="decimal-pad"
            />
            {r && r.ok && r.borda > 0 ? (
              <Text style={s.nota}>Com o paspatur o quadro fica {formatarNumero(r.externa.largura)} x {formatarNumero(r.externa.altura)} cm.</Text>
            ) : null}
          </Cartao>
        </>
      )}

      <Cartao titulo={reforma ? 'MOLDURA NOVA' : 'MOLDURA'}>
        {moldura && !trocando ? (
          <CartaoMoldura moldura={moldura} mostrarEstado={false}>
            <Botao titulo="Trocar" variante="contorno" icone="swap-horizontal" onPress={() => setTrocando(true)} />
            <Botao titulo="Tirar" variante="perigo" icone="close" onPress={() => aoMudar({ moldura: '' })} />
          </CartaoMoldura>
        ) : (
          <>
            <BuscaMoldura
              comFoto
              molduras={molduras}
              rotulo="Buscar moldura (código ou nome)"
              limite={8}
              detalhe={(m) => formatarReais(m.preco_m) + ' o metro · ' + (m.local ? nomeCasinha(m.local) : 'ainda sem casinha')}
              aoEscolher={(m) => { aoMudar({ moldura: m.codigo }); setTrocando(false); }}
            />
            {trocando ? <Botao titulo="Manter a moldura" variante="contorno" onPress={() => setTrocando(false)} /> : null}
          </>
        )}
        {aviso ? <AvisoMoldura aviso={aviso} /> : null}
        {aviso && aviso.quadros.length > 1 ? (
          <Text style={s.nota}>Somando os quadros {juntar(aviso.quadros)}, que usam essa moldura.</Text>
        ) : null}
      </Cartao>

      <Cartao titulo={'VIDRO' + novo}>
        <GrupoPilulas
          opcoes={opcoes(materiaisDe(pacote, 'vidro'), 'Sem vidro')}
          valor={q.vidro}
          aoMudar={(v) => aoMudar(v ? { vidro: v } : { vidro: '', vidro_duplo: false })}
        />
        {q.vidro && !camiseta ? (
          <Interruptor
            titulo="2 vidros (sem fundo)"
            dica="Pra quadro que mostra os dois lados"
            valor={q.vidro_duplo}
            aoMudar={(v) => aoMudar({ vidro_duplo: v })}
          />
        ) : null}
      </Cartao>

      {!q.vidro_duplo ? (
        <Cartao titulo={'FUNDO' + novo}>
          <GrupoPilulas opcoes={opcoes(materiaisDe(pacote, 'chapa'), 'Sem fundo')} valor={q.chapa} aoMudar={(v) => aoMudar({ chapa: v })} />
          {camiseta ? <Text style={s.nota}>A camiseta vai presa no fundo pintado.</Text> : null}
        </Cartao>
      ) : null}

      {!camiseta ? (
        <Cartao titulo={'ESPELHO' + novo}>
          <GrupoPilulas opcoes={opcoes(materiaisDe(pacote, 'espelho'), 'Sem espelho')} valor={q.espelho} aoMudar={(v) => aoMudar({ espelho: v })} />
        </Cartao>
      ) : null}

      {!camiseta ? (
        <Cartao>
          <Interruptor
            titulo="Objeto em relevo"
            dica={'Pinta a chapa: mais ' + formatarReais(TAXA_PINTURA_CHAPA) + ' por quadro'}
            valor={q.objeto_alto}
            aoMudar={(v) => aoMudar({ objeto_alto: v })}
          />
        </Cartao>
      ) : null}

      <Cartao titulo="VALOR DESTE QUADRO">
        <DetalheQuadro r={r} vidroDuplo={q.vidro_duplo} />
      </Cartao>

      <View style={s.acoes}>
        <Botao icone="content-copy" titulo="Duplicar" variante="contorno" onPress={aoDuplicar} estilo={s.acao} />
        {aoTirar ? <Botao icone="trash-can-outline" titulo="Tirar este quadro" variante="perigo" onPress={aoTirar} estilo={s.acao} /> : null}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4 },
  numero: { fontSize: 24, fontWeight: '800', color: cores.marinho },
  valor: { fontSize: 22, fontWeight: '800', color: cores.tinta },
  dupla: { flexDirection: 'row', gap: 12 },
  metade: { flex: 1 },
  nota: { fontSize: tamanho.pequeno, color: cores.marinho, fontWeight: '600' },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  acao: { flexGrow: 1, flexBasis: 220 }
});
