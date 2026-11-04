export function semAcento(texto) {
  return String(texto == null ? '' : texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function buscarMolduras(molduras, termo, limite = 40) {
  const alvo = semAcento(termo);
  if (!alvo) return [];
  const partes = alvo.split(/\s+/);
  const achadas = (molduras || []).filter((m) => {
    const texto = [m.codigo, m.nome, m.marca, m.cor].map(semAcento).join(' ');
    return partes.every((p) => texto.includes(p));
  });
  achadas.sort((a, b) => {
    const exataA = semAcento(a.codigo) === alvo ? 0 : 1;
    const exataB = semAcento(b.codigo) === alvo ? 0 : 1;
    return exataA - exataB || String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  });
  return achadas.slice(0, limite);
}
