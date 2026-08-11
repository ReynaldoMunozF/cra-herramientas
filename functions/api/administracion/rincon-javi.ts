import { ContextoPagina, responderJson } from "../_utilidades";

const MAXIMO_CARACTERES = 2000;

const consultar = async (contexto: ContextoPagina) => {
  const fila = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT contenido, visible, actualizada_en FROM rincon_javi WHERE id = 1"
  ).first<{ contenido: string; visible: number; actualizada_en: number }>();
  return responderJson({
    contenido: fila?.contenido ?? "",
    visible: fila?.visible === 1,
    actualizadaEn: fila?.actualizada_en ?? 0,
  });
};

const guardar = async (contexto: ContextoPagina) => {
  let datos: { contenido?: unknown; visible?: unknown };
  try { datos = await contexto.request.json(); }
  catch { return responderJson({ error: "Los datos enviados no son válidos." }, 400); }

  const contenido = typeof datos.contenido === "string" ? datos.contenido.trim() : "";
  const visible = datos.visible === true;
  if (contenido.length > MAXIMO_CARACTERES) {
    return responderJson({ error: `El contenido no puede superar ${MAXIMO_CARACTERES} caracteres.` }, 400);
  }
  if (visible && !contenido) {
    return responderJson({ error: "Escribe algún contenido antes de hacerlo visible." }, 400);
  }

  await contexto.env.CONTENIDO_DB.prepare(
    `INSERT INTO rincon_javi (id, contenido, visible, actualizada_en)
     VALUES (1, ?, ?, unixepoch())
     ON CONFLICT(id) DO UPDATE SET contenido=excluded.contenido,
       visible=excluded.visible, actualizada_en=excluded.actualizada_en`
  ).bind(contenido, visible ? 1 : 0).run();
  return responderJson({ guardado: true, contenido, visible });
};

export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  if (metodo === "GET") return consultar(contexto);
  if (metodo === "POST") return guardar(contexto);
  return responderJson({ error: "Método no permitido." }, 405);
};
