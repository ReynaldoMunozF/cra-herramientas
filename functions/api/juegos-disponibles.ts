import { ContextoPagina, responderJson } from "./_utilidades";

const PREDETERMINADOS = ["codigo", "palabra", "asesino", "flota"];

/** Devuelve la rotación de juegos configurada para las sesiones de invitado. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const fila = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT juegos, actualizada_en FROM configuracion_juegos_invitados WHERE id = 1"
  ).first<{ juegos: string; actualizada_en: number }>();
  try {
    return responderJson({ juegos: JSON.parse(fila?.juegos ?? JSON.stringify(PREDETERMINADOS)), actualizadaEn: fila?.actualizada_en ?? 0 });
  } catch {
    return responderJson({ juegos: PREDETERMINADOS, actualizadaEn: 0 });
  }
};
