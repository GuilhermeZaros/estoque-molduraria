import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, StyleSheet } from 'react-native';
import { estadoCasinha, rotuloCurto } from '../mapa';
import { nomeCasinha } from '../gerado/nucleo';
import { COR_ESTADO, cores } from '../tema';

const CURVA = Easing.bezier(0.77, 0, 0.175, 1);
const NATIVO = Platform.OS !== 'web';

function usePisca(ativo) {
  const opacidade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!ativo) return undefined;
    let vivo = true;
    let anim = null;
    const passo = (valor) => Animated.timing(opacidade, { toValue: valor, duration: 250, easing: CURVA, useNativeDriver: NATIVO });
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduzido) => {
        if (!vivo || reduzido) return;
        anim = Animated.sequence([Animated.delay(350), Animated.loop(Animated.sequence([passo(0.25), passo(1)]), { iterations: 5 })]);
        anim.start();
      });
    return () => {
      vivo = false;
      if (anim) anim.stop();
      opacidade.setValue(1);
    };
  }, [ativo, opacidade]);
  return opacidade;
}

export function Casinha({ codigo, molduras, aoTocar, estilo, compacto = false, piscar = false, aoMedir }) {
  const e = estadoCasinha(molduras);
  const c = COR_ESTADO[e.cor];
  const opacidade = usePisca(piscar);
  const qtd = e.total === 1 ? '1 moldura' : e.total + ' molduras';
  const situacao = e.cor === 'vazia' ? c.nome : 'a pior com ' + c.nome;
  return (
    <Animated.View
      onLayout={aoMedir}
      style={[s.anel, compacto && s.anelCompacto, piscar && s.achada, estilo, { opacity: opacidade }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nomeCasinha(codigo) + ': ' + situacao + ', ' + qtd + (piscar ? ', é aqui que está a moldura procurada' : '')}
        onPress={aoTocar}
        style={({ pressed }) => [s.casinha, compacto && s.casinhaCompacta, { backgroundColor: c.fundo }, e.cor === 'vazia' && s.vazia, pressed && s.apertado]}>
        <Text style={[s.rotulo, compacto && s.rotuloCompacto, { color: c.texto }]}>{rotuloCurto(codigo)}</Text>
        <Text style={[s.qtd, { color: c.texto }]}>{compacto ? String(e.total) : qtd}</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  anel: { padding: 2, borderWidth: 4, borderColor: 'transparent', borderRadius: 20 },
  anelCompacto: { padding: 1, borderWidth: 3, borderRadius: 18 },
  achada: { borderColor: cores.ouroTexto },
  casinha: { minHeight: 88, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 8 },
  casinhaCompacta: { paddingHorizontal: 2 },
  vazia: { borderWidth: 2, borderColor: '#d1d5db' },
  rotulo: { fontSize: 26, fontWeight: '800' },
  rotuloCompacto: { fontSize: 22 },
  qtd: { fontSize: 15, fontWeight: '600' },
  apertado: { opacity: 0.8 }
});
