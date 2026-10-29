import { ContextoPagina, responderJson } from "./_utilidades";

interface EnlacePortada { id: number; nombre: string; url: string; color_fondo: string; color_texto: string; }

/** Accesos publicados en la parte superior de la portada. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const resultado = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT id, nombre, url, color_fondo, color_texto FROM enlaces_portada WHERE visible = 1 ORDER BY orden ASC, id ASC"
  ).all<EnlacePortada>();
  return responderJson({ enlaces: resultado.results ?? [] });
};
