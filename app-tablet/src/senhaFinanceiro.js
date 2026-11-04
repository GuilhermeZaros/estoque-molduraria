export const DEZ_MINUTOS = 10 * 60 * 1000;

export function criarCofre(relogio = () => Date.now(), validade = DEZ_MINUTOS) {
  let senha = '';
  let ultimoUso = 0;
  return {
    guardar(nova) {
      senha = String(nova || '');
      ultimoUso = relogio();
    },
    ativo() {
      if (senha && relogio() - ultimoUso > validade) senha = '';
      return !!senha;
    },
    ler() {
      if (!this.ativo()) return '';
      ultimoUso = relogio();
      return senha;
    },
    esquecer() {
      senha = '';
    }
  };
}

export const cofre = criarCofre();
