import { ContextoPagina, responderJson } from "../_utilidades";

interface Feedback {
  id: number;
  matricula: string | null;
  pagina: string;
  mensaje: string;
  creado_en: string;
}

/** Lectura y eliminación reservadas al administrador mediante el middleware. */
export const onRequest = async (contexto: ContextoPagina) => {
  if (contexto.request.method === "GET") {
    const resultado = await contexto.env.CONTENIDO_DB
      .prepare("SELECT id, matricula, pagina, mensaje, creado_en FROM feedback_usuarios ORDER BY creado_en DESC")
      .all<Feedback>();
    return responderJson({ feedback: resultado.results ?? [] });
  }

  if (contexto.request.method === "DELETE") {
    const datos = await contexto.request.json() as { id?: unknown };
    const id = Number(datos.id);
    if (!Number.isInteger(id) || id <= 0) return responderJson({ error: "ID no válido." }, 400);
    await contexto.env.CONTENIDO_DB
      .prepare("DELETE FROM feedback_usuarios WHERE id = ?")
      .bind(id)
      .run();
    return responderJson({ eliminado: true });
  }

  return responderJson({ error: "Método no permitido." }, 405);
};
