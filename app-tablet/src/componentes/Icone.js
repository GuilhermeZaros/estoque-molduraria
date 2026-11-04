import { MaterialCommunityIcons } from '@expo/vector-icons';

export function Icone({ nome, tamanho = 28, cor }) {
  return (
    <MaterialCommunityIcons
      name={nome}
      size={tamanho}
      color={cor}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
