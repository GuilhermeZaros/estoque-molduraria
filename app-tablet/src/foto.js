import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { medidaReduzida } from './reduzir';

export async function prepararFoto(asset) {
  const contexto = ImageManipulator.manipulate(asset.uri);
  contexto.resize(medidaReduzida(asset.width, asset.height));
  const imagem = await contexto.renderAsync();
  const salva = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return { uri: salva.uri, base64: salva.base64 };
}
