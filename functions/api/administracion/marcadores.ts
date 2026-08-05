import { ContextoPagina, responderJson } from "../_utilidades";

/** Elimina únicamente resultados que alimentan rankings; conserva partidas activas y otros datos. */
export const onRequestPost = async (contexto: ContextoPagina) => {
  let datos: { confirmacion?: unknown };
  try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Confirmación no válida." }, 400); }
  if (datos.confirmacion !== "REINICIAR_MARCADORES") {
    return responderJson({ error: "Debes confirmar expresamente el reinicio." }, 400);
  }

  const resultados = await contexto.env.CONTENIDO_DB.batch([
    contexto.env.CONTENIDO_DB.prepare("DELETE FROM partidas_codigo_secreto WHERE estado='ganada'"),
    contexto.env.CONTENIDO_DB.prepare("DELETE FROM partidas_palabra_clave WHERE estado='ganada'"),
    contexto.env.CONTENIDO_DB.prepare("DELETE FROM partidas_caso_asesino WHERE estado='ganada'"),
    contexto.env.CONTENIDO_DB.prepare("DELETE FROM salas_hundir_flota WHERE estado='finalizada'"),
  ]);
  const eliminados = resultados.reduce((total, resultado) => total + Number(resultado.meta?.changes ?? 0), 0);
  return responderJson({ reiniciado: true, eliminados });
};
