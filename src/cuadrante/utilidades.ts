import { InformacionTurno, OperadorCuadrante, RecomendacionCambio } from "./tipos";

/** Normaliza texto para permitir búsquedas sin distinguir mayúsculas ni tildes. */
export const normalizarTexto = (valor: string) =>
  valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

/** Traduce un código del cuadrante a una etiqueta comprensible y una clase visual. */
export const obtenerInformacionTurno = (codigo: string): InformacionTurno => {
  if (!codigo) return { etiqueta: "Libre", claseCss: "off" };
  if (codigo === "VC" || codigo === "VAC") return { etiqueta: "Vacaciones", claseCss: "vacation" };
  if (codigo === "BJ") return { etiqueta: "Baja", claseCss: "leave" };
  if (codigo === "FO") return { etiqueta: "Formación", claseCss: "other" };
  if (codigo.startsWith("M")) return { etiqueta: `Mañana · ${codigo}`, claseCss: "morning" };
  if (codigo.startsWith("T")) return { etiqueta: `Tarde · ${codigo}`, claseCss: "afternoon" };
  if (codigo.startsWith("N")) return { etiqueta: `Noche · ${codigo}`, claseCss: "night" };
  return { etiqueta: `Turno · ${codigo}`, claseCss: "other" };
};

/** Indica si un código representa un turno ordinario de mañana, tarde o noche. */
export const esTurnoOrdinario = (codigo: string) => /^[MTN]/.test(codigo);

/** Cuenta el bloque continuo de días libres que contiene la fecha indicada. */
export const contarBloqueDescanso = (dias: string[], indiceDia: number) => {
  if (dias[indiceDia]) return 0;
  let inicio = indiceDia;
  let fin = indiceDia;
  while (inicio > 0 && !dias[inicio - 1]) inicio -= 1;
  while (fin < dias.length - 1 && !dias[fin + 1]) fin += 1;
  return fin - inicio + 1;
};

/** Obtiene la mayor cantidad de jornadas trabajadas de forma consecutiva. */
export const obtenerMaximaRachaTrabajo = (dias: string[]) => {
  let rachaActual = 0;
  let rachaMaxima = 0;
  dias.forEach((codigo) => {
    rachaActual = esTurnoOrdinario(codigo) ? rachaActual + 1 : 0;
    rachaMaxima = Math.max(rachaMaxima, rachaActual);
  });
  return rachaMaxima;
};

/**
 * Simula todos los intercambios válidos entre dos operadores.
 * Premia los descansos consecutivos y penaliza rachas superiores a cinco jornadas.
 */
export const calcularRecomendaciones = (
  operadorPrincipal: OperadorCuadrante | null,
  operadorCandidato: OperadorCuadrante | null,
  indiceDiaSolicitado: number | null
): RecomendacionCambio[] => {
  if (!operadorPrincipal || !operadorCandidato || indiceDiaSolicitado === null) return [];
  const turnoSolicitado = operadorPrincipal.dias[indiceDiaSolicitado];
  if (!turnoSolicitado) return [];

  return operadorCandidato.dias
    .map((turnoCandidato, indiceDia): RecomendacionCambio | null => {
      const noEsValido = indiceDia === indiceDiaSolicitado
        || Boolean(operadorPrincipal.dias[indiceDia])
        || !esTurnoOrdinario(turnoCandidato)
        || !turnoCandidato.startsWith(operadorPrincipal.grupo);
      if (noEsValido) return null;

      const diasPrincipalSimulados = [...operadorPrincipal.dias];
      const diasCandidatoSimulados = [...operadorCandidato.dias];
      diasPrincipalSimulados[indiceDiaSolicitado] = "";
      diasPrincipalSimulados[indiceDia] = turnoCandidato;
      diasCandidatoSimulados[indiceDiaSolicitado] = turnoSolicitado;
      diasCandidatoSimulados[indiceDia] = "";

      const descansoCandidato = contarBloqueDescanso(diasCandidatoSimulados, indiceDia);
      const descansoPropio = contarBloqueDescanso(diasPrincipalSimulados, indiceDiaSolicitado);
      const maximaRachaPropia = obtenerMaximaRachaTrabajo(diasPrincipalSimulados);
      const maximaRachaCandidato = obtenerMaximaRachaTrabajo(diasCandidatoSimulados);
      const puntuacion = descansoCandidato * 12 + descansoPropio * 8
        - Math.max(0, maximaRachaPropia - 5) * 8
        - Math.max(0, maximaRachaCandidato - 5) * 8;

      return {
        indiceDia, turno: turnoCandidato, descansoCandidato, descansoPropio,
        maximaRachaPropia, maximaRachaCandidato, puntuacion,
      };
    })
    .filter((resultado): resultado is RecomendacionCambio => resultado !== null)
    .sort((a, b) => b.puntuacion - a.puntuacion || a.indiceDia - b.indiceDia)
    .slice(0, 5);
};
