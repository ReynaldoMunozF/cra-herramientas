import { ContextoPagina, responderJson } from "./_utilidades";

const TIPOS_PERMITIDOS = new Set([
  "busqueda_direccion", "busqueda_coordenadas", "copia_comentario",
  "uso_manual", "uso_cuadrante", "consulta_clima", "consulta_fse",
]);

/** Guarda un uso anónimo sin aceptar datos sensibles de la consulta. */
export const onRequestPost = async (contexto: ContextoPagina) => {
  let datos: { tipo?: unknown };
  try {
    datos = await contexto.request.json();
  } catch {
    return responderJson({ error: "Datos no válidos." }, 400);
  }
  const tipo = typeof datos.tipo === "string" ? datos.tipo : "";
  if (!TIPOS_PERMITIDOS.has(tipo)) {
    return responderJson({ error: "Tipo de estadística no permitido." }, 400);
  }
  await contexto.env.CONTENIDO_DB
    .prepare("INSERT INTO estadisticas_uso (tipo) VALUES (?)")
    .bind(tipo).run();
  return responderJson({ registrado: true }, 201);
};
