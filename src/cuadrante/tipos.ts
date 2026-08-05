/** Datos normalizados de un operador y sus turnos durante el mes. */
export interface OperadorCuadrante {
  codigo: string;
  nombre: string;
  matricula: string;
  grupo: string;
  horas: string;
  dias: string[];
}

/** Estructura original recibida desde el JSON extraído del PDF. */
export interface OperadorJson {
  id: string;
  name: string;
  initials: string;
  group: string;
  hours: string;
  days: string[];
}

/** Configuración completa de uno de los meses disponibles en la aplicación. */
export interface CuadranteMensual {
  id: string;
  mes: string;
  mesMayusculas: string;
  numeroMes: number;
  anio: number;
  desplazamientoPrimerDia: number;
  operadores: OperadorCuadrante[];
}

/** Resultado calculado para uno de los posibles días de devolución. */
export interface RecomendacionCambio {
  indiceDia: number;
  turno: string;
  descansoCandidato: number;
  descansoPropio: number;
  maximaRachaPropia: number;
  maximaRachaCandidato: number;
  puntuacion: number;
}

/** Información visual asociada a un código de turno. */
export interface InformacionTurno {
  etiqueta: string;
  claseCss: string;
}
