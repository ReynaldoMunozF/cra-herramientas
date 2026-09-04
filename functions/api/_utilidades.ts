interface ResultadoD1<T> { results?: T[]; success: boolean; }
export interface SentenciaD1 {
  bind: (...valores: unknown[]) => SentenciaD1;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
  all: <T>() => Promise<ResultadoD1<T>>;
}
export interface BaseD1 {
  prepare: (consulta: string) => SentenciaD1;
  batch: (sentencias: SentenciaD1[]) => Promise<unknown[]>;
}
export interface EntornoManual { CONTENIDO_DB: BaseD1; SECRETO_SESION?: string; }
export interface ContextoPagina {
  request: Request;
  env: EntornoManual;
  params: Record<string, string | string[]>;
  data?: { rol?: "administrador" | "invitado" };
}

export const responderJson = (datos: unknown, estado = 200) => new Response(JSON.stringify(datos), {
  status: estado,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" },
});

export const obtenerProceso = (contexto: ContextoPagina) => {
  const valor = contexto.params.proceso;
  return (Array.isArray(valor) ? valor[0] : valor || "").toLowerCase();
};

/**
 * Lista cerrada de procedimientos que pueden consultarse o modificarse.
 * Evita que un valor recibido desde la URL pueda utilizarse como identificador
 * arbitrario dentro de la base de datos.
 */
const procesosPermitidos = new Set([
  "robo", "atraco", "coaccion", "fuego", "medica", "sabotaje",
  "sabotaje-cataluna", "sabotaje-central", "robo-general-902", "disparo-actifog",
  "fallo-una-via", "fallo-doble-via", "fallo-linea-smart", "supervision-actividad",
  "problema-zona", "fallo-luz", "fallo-luz-urgente", "bateria-baja-central",
  "interferencia", "fallo-sirena-modulo", "perdida-sensor-bateria-rf",
  "codigo-erroneo", "fallo-armado", "falta-test", "antimasking",
  "fallo-ac-repetidor", "falta-restauracion",
]);

export const procesoPermitido = (proceso: string) => procesosPermitidos.has(proceso);

export const validarContenido = (contenido: unknown) => {
  if (!contenido || typeof contenido !== "object") return false;
  const datos = contenido as { flujo?: Record<string, unknown>; comentarios?: unknown[] };
  return Boolean(datos.flujo?.mode && Array.isArray(datos.comentarios));
};
