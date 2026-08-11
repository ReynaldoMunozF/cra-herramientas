import { ContextoPagina, responderJson } from "./_utilidades";

/** Contenido público para cualquier usuario que tenga una sesión válida. */
export const onRequest = async (contexto: ContextoPagina) => {
  if (contexto.request.method.toUpperCase() !== "GET") {
    return responderJson({ error: "Método no permitido." }, 405);
  }

  const fila = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT contenido, visible, actualizada_en FROM rincon_javi WHERE id = 1"
  ).first<{ contenido: string; visible: number; actualizada_en: number }>();
  const visible = fila?.visible === 1 && Boolean(fila.contenido.trim());

  return responderJson({
    visible,
    contenido: visible ? fila?.contenido ?? "" : "",
    actualizadaEn: fila?.actualizada_en ?? 0,
  });
};
