import datosJulio from "./datos-julio-2026.json";
import datosAgosto from "./datos-agosto-2026.json";
import datosSeptiembre from "./datos-septiembre-2026.json";
import datosOctubre from "./datos-octubre-2026.json";
import { CuadranteMensual, OperadorCuadrante, OperadorJson } from "./tipos";

/** Fecha indicada por la empresa para esta edición de los dos cuadrantes. */
export const FECHA_ACTUALIZACION_CUADRANTES = "23 de septiembre de 2026";

/** Días abreviados utilizados en la cabecera del calendario de escritorio. */
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Nombres completos utilizados en las tarjetas de la versión móvil. */
export const DIAS_SEMANA_COMPLETOS = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
];

/**
 * Convierte las claves técnicas del JSON a nombres de dominio en español.
 * De esta forma, el resto de la aplicación no depende del formato de extracción del PDF.
 */
const normalizarOperadores = (operadores: OperadorJson[]): OperadorCuadrante[] => operadores.map(
  (operador) => ({
    codigo: operador.id,
    // Solo se muestran nombres cuando existe autorización expresa.
    nombre: operador.initials === "RMI" ? "Reynaldo Muñoz Flores"
      : operador.initials === "CAP" ? "Catia Alexandra Pires Orfao"
      : operador.initials === "DMA" ? "Daniel Antonio Martín Martín"
      : "Operador CRA",
    matricula: operador.initials,
    grupo: operador.group,
    horas: operador.hours,
    dias: operador.days,
  })
);

/** Meses oficiales disponibles, ordenados del más reciente al más antiguo. */
export const CUADRANTES: CuadranteMensual[] = [
  {
    id: "octubre-2026", mes: "octubre", mesMayusculas: "OCTUBRE", numeroMes: 10, anio: 2026,
    // Octubre de 2026 comienza en jueves: tres huecos desde una semana que empieza en lunes.
    desplazamientoPrimerDia: 3,
    operadores: normalizarOperadores(datosOctubre as OperadorJson[]),
  },
  {
    id: "septiembre-2026", mes: "septiembre", mesMayusculas: "SEPTIEMBRE", numeroMes: 9, anio: 2026,
    // Septiembre de 2026 comienza en martes: un hueco desde una semana que empieza en lunes.
    desplazamientoPrimerDia: 1,
    operadores: normalizarOperadores(datosSeptiembre as OperadorJson[]),
  },
  {
    id: "agosto-2026", mes: "agosto", mesMayusculas: "AGOSTO", numeroMes: 8, anio: 2026,
    desplazamientoPrimerDia: 5,
    operadores: normalizarOperadores(datosAgosto as OperadorJson[]),
  },
  {
    id: "julio-2026", mes: "julio", mesMayusculas: "JULIO", numeroMes: 7, anio: 2026,
    desplazamientoPrimerDia: 2,
    operadores: normalizarOperadores(datosJulio.operators as OperadorJson[]),
  },
];
