import { ContextoPagina, responderJson } from "./_utilidades";
export const onRequestGet = async (contexto: ContextoPagina) => {
  const resultado = await contexto.env.CONTENIDO_DB.prepare("SELECT id,titulo,autor,descripcion,portada_clave,pdf_clave FROM biblioteca_libros WHERE visible=1 ORDER BY creado_en DESC").all();
  return responderJson({ libros: resultado.results ?? [] });
};
