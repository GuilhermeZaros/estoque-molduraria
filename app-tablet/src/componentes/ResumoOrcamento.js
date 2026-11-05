import { View, Text, StyleSheet } from 'react-native';
import { Botao } from './Botao';
import { Icone } from './Icone';
import { formatarReais, formatarNumero } from '../formato';
import { AVISO, cores, tamanho } from '../tema';

const NOMES = { moldura: 'Moldura', vidro: 'Vidro', chapa: 'Fundo', espelho: 'Espelho', paspatur: 'Paspatur', silicone: 'Silicone' };

function nomeDoItem(it, r, vidroDuplo) {
  if (it.categoria === 'paspatur') return 'Borda de ' + formatarNumero(r.borda) + ' cm';
  if (it.categoria === 'silicone') return 'Junta dos 2 vidros';
  if (it.categoria === 'vidro' && vidroDuplo) return it.item + ' (2 vidros)';
  return it.item;
}

function Linha({ rotulo, item, valor }) {
  return (
    <View style={s.linha}>
      <View style={s.linhaTextos}>
        <Text style={s.linhaRotulo}>{rotulo}</Text>
        {item ? <Text style={s.linhaItem} numberOfLines={2}>{item}</Text> : null}
      </View>
      <Text style={s.linhaValor}>{formatarReais(valor)}</Text>
    </View>
  );
}

function Erro({ texto }) {
  return (
    <View style={s.erro}>
      <Icone nome="information-outline" tamanho={26} cor={AVISO.amarelo.borda} />
      <Text style={s.erroTexto}>{texto}</Text>
    </View>
  );
}

export function DetalheQuadro({ r, vidroDuplo }) {
  if (!r || !r.ok) return <Erro texto={r ? r.erro : 'Carregando...'} />;
  const q = r.calc.quantidade;
  const servicos = r.calc.servicos || [];
  const vazio = !r.calc.itens.length && !r.calc.pintura_chapa && !servicos.length;
  return (
    <View style={s.caixa}>
      {vazio ? <Text style={s.cada}>Nada marcado ainda.</Text> : null}
      <View style={s.linhas}>
        {r.calc.itens.map((it, i) => (
          <Linha key={it.categoria + i} rotulo={NOMES[it.categoria] || it.categoria} item={nomeDoItem(it, r, vidroDuplo)} valor={it.valor * q} />
        ))}
        {r.calc.pintura_chapa ? <Linha rotulo="Pintura da chapa" valor={r.calc.pintura_chapa * q} /> : null}
        {servicos.map((sv, i) => (
          <Linha key={'servico' + i} rotulo="Serviço" item={sv.descricao || 'Sem descrição'} valor={sv.valor} />
        ))}
      </View>
      {q > 1 ? <Text style={s.cada}>{q} iguais de {formatarReais(r.calc.valor_unitario)} cada</Text> : null}
      <View style={s.total}>
        <Text style={s.totalRotulo}>Este quadro</Text>
        <Text style={s.subtotal}>{formatarReais(r.calc.valor_total)}</Text>
      </View>
    </View>
  );
}

export function ResumoOrcamento({ rr, desativado, aoFechar, aoSalvar, aoWhatsApp, children }) {
  const pronto = !!rr && rr.ok;
  const ajustado = pronto && Math.abs(rr.valor_final - rr.valor_total) >= 0.005;
  const pecas = pronto ? rr.quantidade : 0;
  return (
    <View style={s.caixa}>
      {!pronto ? (
        <Erro texto={rr ? rr.erro : 'Carregando...'} />
      ) : (
        <>
          <View style={s.total}>
            <Text style={s.totalRotulo}>{(ajustado ? 'Total calculado' : 'Total') + (pecas > 1 ? ', ' + pecas + ' peças' : '')}</Text>
            <Text style={[s.totalValor, ajustado && s.riscado]}>{formatarReais(rr.valor_total)}</Text>
          </View>
          {ajustado ? (
            <View style={s.total}>
              <Text style={s.totalRotulo}>Valor pro cliente</Text>
              <Text style={s.totalValor}>{formatarReais(rr.valor_final)}</Text>
            </View>
          ) : null}
        </>
      )}
      <View style={s.botoes}>
        <Botao grande icone="cash-register" titulo="Fechou a venda" variante="ouro" desativado={desativado || !pronto} onPress={aoFechar} />
        <Botao icone="content-save-outline" titulo="Salvar orçamento" desativado={desativado || !pronto} onPress={aoSalvar} />
        <Botao icone="whatsapp" titulo="Mandar no WhatsApp" variante="contorno" desativado={desativado || !pronto} onPress={aoWhatsApp} />
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { gap: 14 },
  erro: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tamanho.raio,
    backgroundColor: AVISO.amarelo.fundo
  },
  erroTexto: { flex: 1, fontSize: tamanho.texto, fontWeight: '600', color: AVISO.amarelo.texto },
  linhas: { gap: 2 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: cores.linha },
  linhaTextos: { flex: 1 },
  linhaRotulo: { fontSize: tamanho.pequeno, fontWeight: '700', color: cores.apagado },
  linhaItem: { fontSize: 18, color: cores.tinta },
  linhaValor: { fontSize: 18, fontWeight: '700', color: cores.tinta },
  cada: { fontSize: tamanho.pequeno, color: cores.apagado, textAlign: 'right' },
  total: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 12 },
  totalRotulo: { flexShrink: 1, fontSize: tamanho.texto, fontWeight: '700', color: cores.marinho },
  totalValor: { flexShrink: 0, fontSize: 34, fontWeight: '800', color: cores.marinho },
  subtotal: { fontSize: 26, fontWeight: '800', color: cores.marinho },
  riscado: { fontSize: 22, color: cores.apagado, textDecorationLine: 'line-through' },
  botoes: { gap: 12, marginTop: 4 }
});
