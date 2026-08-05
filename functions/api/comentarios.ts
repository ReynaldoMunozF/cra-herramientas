import {
  ContextoPagina,
  responderJson,
} from "./_utilidades";

interface ComentarioGuardado {
  id: number;
  matricula: string;
  texto: string;
  creado_en: string;
  orden: number;
}

/** API central para consultar, crear y eliminar comentarios desde cualquier equipo. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  const baseDatos = contexto.env.CONTENIDO_DB;
  const url = new URL(contexto.request.url);

  const matriculaValida = (valor: unknown) => {
    const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : "";
    return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null;
  };

  if (metodo === "GET") {
    const matricula = matriculaValida(url.searchParams.get("matricula"));
    if (!matricula) {
      return responderJson({ error: "La matrícula no es válida." }, 400);
    }
    const resultado = await baseDatos
      .prepare(
        `SELECT id, matricula, texto, creado_en, orden
         FROM comentarios_frecuentes
         WHERE matricula = ?
         ORDER BY orden ASC, creado_en DESC, id DESC`
      )
      .bind(matricula)
      .all<ComentarioGuardado>();

    return responderJson({ comentarios: resultado.results ?? [] });
  }

  if (metodo === "POST") {
    let datos: { texto?: unknown; matricula?: unknown };
    try {
      datos = await contexto.request.json();
    } catch {
      return responderJson({ error: "El contenido enviado no es válido." }, 400);
    }

    const texto = typeof datos.texto === "string" ? datos.texto.trim() : "";
    const matricula = matriculaValida(datos.matricula);
    if (!matricula) {
      return responderJson({ error: "La matrícula no es válida." }, 400);
    }
    if (!texto || texto.length > 1200) {
      return responderJson(
        { error: "El comentario debe contener entre 1 y 1200 caracteres." },
        400
      );
    }

    await baseDatos
      .prepare(`
        INSERT OR IGNORE INTO comentarios_frecuentes (matricula, texto, orden)
        VALUES (
          ?,
          ?,
          COALESCE((SELECT MIN(orden) - 1 FROM comentarios_frecuentes WHERE matricula = ?), 0)
        )
      `)
      .bind(matricula, texto, matricula)
      .run();

    const comentario = await baseDatos
      .prepare(
        `SELECT id, matricula, texto, creado_en, orden
         FROM comentarios_frecuentes
         WHERE matricula = ? AND texto = ? COLLATE NOCASE`
      )
      .bind(matricula, texto)
      .first<ComentarioGuardado>();

    return responderJson({ comentario }, 201);
  }

  if (metodo === "PATCH") {
    let datos: { ids?: unknown; matricula?: unknown };
    try {
      datos = await contexto.request.json();
    } catch {
      return responderJson({ error: "No se ha indicado el nuevo orden." }, 400);
    }

    const matricula = matriculaValida(datos.matricula);
    const ids = Array.isArray(datos.ids) ? datos.ids.map(Number) : [];
    const idsValidos = ids.length <= 200
      && ids.every((id) => Number.isInteger(id) && id > 0)
      && new Set(ids).size === ids.length;
    if (!matricula || !idsValidos) {
      return responderJson({ error: "El nuevo orden no es válido." }, 400);
    }

    const existentes = await baseDatos
      .prepare("SELECT id FROM comentarios_frecuentes WHERE matricula = ?")
      .bind(matricula)
      .all<{ id: number }>();
    const idsExistentes = new Set((existentes.results ?? []).map((comentario) => comentario.id));
    if (ids.length !== idsExistentes.size || !ids.every((id) => idsExistentes.has(id))) {
      return responderJson({ error: "La lista de comentarios está incompleta." }, 409);
    }

    await baseDatos.batch(
      ids.map((id, indice) =>
        baseDatos
          .prepare("UPDATE comentarios_frecuentes SET orden = ? WHERE id = ? AND matricula = ?")
          .bind(indice, id, matricula)
      )
    );
    return responderJson({ guardado: true });
  }

  if (metodo === "DELETE") {
    let datos: { id?: unknown; matricula?: unknown };
    try {
      datos = await contexto.request.json();
    } catch {
      return responderJson({ error: "No se ha indicado el comentario." }, 400);
    }

    const id = Number(datos.id);
    const matricula = matriculaValida(datos.matricula);
    if (!Number.isInteger(id) || id <= 0 || !matricula) {
      return responderJson({ error: "El identificador no es válido." }, 400);
    }

    await baseDatos
      .prepare("DELETE FROM comentarios_frecuentes WHERE id = ? AND matricula = ?")
      .bind(id, matricula)
      .run();

    return responderJson({ eliminado: true });
  }

  return responderJson({ error: "Método no permitido." }, 405);
};
