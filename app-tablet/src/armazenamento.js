import AsyncStorage from '@react-native-async-storage/async-storage';

export function criarArmazenamento(prefixo) {
  return {
    async ler(chave, padrao) {
      const texto = await AsyncStorage.getItem(prefixo + chave);
      if (texto == null) return padrao;
      try {
        return JSON.parse(texto);
      } catch (e) {
        return padrao;
      }
    },
    gravar: (chave, valor) => AsyncStorage.setItem(prefixo + chave, JSON.stringify(valor)),
    apagar: (chave) => AsyncStorage.removeItem(prefixo + chave)
  };
}
