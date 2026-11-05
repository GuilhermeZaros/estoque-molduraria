import { useSyncExternalStore } from 'react';
import * as Crypto from 'expo-crypto';
import { criarCentral } from './central';
import { criarApi } from './api';
import { criarApiDemo } from './demo';
import { criarArmazenamento } from './armazenamento';
import { lerFotoBase64 } from './foto';
import { API_URL, APP_TOKEN, MODO_DEMO } from './config';

export const api = MODO_DEMO ? criarApiDemo() : criarApi({ url: API_URL, token: APP_TOKEN, lerFoto: lerFotoBase64 });

export const central = criarCentral({
  api,
  armazenamento: criarArmazenamento(MODO_DEMO ? 'vera-demo:' : 'vera:'),
  gerarId: () => Crypto.randomUUID()
});

export function useEstado(escolher) {
  return useSyncExternalStore(central.ouvir, () => escolher(central.ler()));
}
