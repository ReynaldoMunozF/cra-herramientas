import { ContextoPagina, obtenerProceso, procesoPermitido, responderJson } from "../_utilidades";

interface FilaContenido { contenido_json: string; }

/** Entrega exclusivamente la última versión publicada al manual operativo. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const proceso = obtenerProceso(contexto);
  if (!procesoPermitido(proceso)) return responderJson({ error: "Proceso no disponible." }, 404);

  try {
    const fila = await contexto.env.CONTENIDO_DB.prepare(
      "SELECT contenido_json FROM versiones_manual WHERE proceso = ? AND estado = 'publicada' ORDER BY version DESC LIMIT 1",
    ).bind(proceso).first<FilaContenido>();
    if (!fila) return responderJson({ error: "Todavía no existe una versión publicada." }, 404);
    return responderJson(JSON.parse(fila.contenido_json));
  } catch (error) {
    console.error(JSON.stringify({ evento: "leer_manual_publicado", proceso, error: String(error) }));
    return responderJson({ error: "No se pudo consultar el manual publicado." }, 500);
  }
};
