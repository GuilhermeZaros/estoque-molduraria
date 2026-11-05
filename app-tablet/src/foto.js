import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { medidaReduzida } from './reduzir';

export function primeiraFoto(resultado) {
  const lista = Array.isArray(resultado) ? resultado : [resultado];
  const achado = lista.find((r) => r && !r.canceled && r.assets && r.assets.length);
  return achado ? achado.assets[0] : null;
}

export async function prepararFoto(asset) {
  const contexto = ImageManipulator.manipulate(asset.uri);
  contexto.resize(medidaReduzida(asset.width, asset.height));
  const imagem = await contexto.renderAsync();
  const salva = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return { uri: salva.uri, base64: salva.base64 };
}

export async function fotoParaPapel(uri) {
  try {
    const contexto = ImageManipulator.manipulate(uri);
    contexto.resize({ width: 500 });
    const imagem = await contexto.renderAsync();
    const salva = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    return 'data:image/jpeg;base64,' + salva.base64;
  } catch {
    return uri;
  }
}

export async function lerFotoBase64(uri) {
  const imagem = await ImageManipulator.manipulate(uri).renderAsync();
  const salva = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  return salva.base64;
}
