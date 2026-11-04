import { Modal, View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { cores } from '../tema';

export function Dialogo({ visivel, titulo, aoFechar, children }) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <KeyboardAvoidingView style={s.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.caixa} accessibilityViewIsModal>
          <Text style={s.titulo} accessibilityRole="header">{titulo}</Text>
          <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(19, 41, 75, 0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  caixa: { width: '100%', maxWidth: 680, maxHeight: '92%', backgroundColor: cores.cartao, borderRadius: 20, padding: 24 },
  titulo: { fontSize: 26, fontWeight: '800', color: cores.marinho, marginBottom: 12 },
  conteudo: { gap: 16, paddingBottom: 8 }
});
