import { ContextoPagina, responderJson } from "../_utilidades";

const MAXIMO_CARACTERES = 2000;

const consultar = async (contexto: ContextoPagina) => {
  const fila = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT contenido, visible, actualizada_en FROM rincon_javi WHERE id = 1"
  ).first<{ contenido: string; visible: number; actualizada_en: number }>();
  const historial = await contexto.env.CONTENIDO_DB.prepare(
    `SELECT h.id, h.contenido, h.publicado_en,
      SUM(CASE WHEN v.voto = 'carcajada' THEN 1 ELSE 0 END) AS carcajada,
      SUM(CASE WHEN v.voto = 'sonrisa' THEN 1 ELSE 0 END) AS sonrisa,
      SUM(CASE WHEN v.voto = 'cunado' THEN 1 ELSE 0 END) AS cunado
     FROM rincon_javi_historial h LEFT JOIN rincon_javi_votos v ON v.chiste_id = h.id
     GROUP BY h.id ORDER BY h.publicado_en DESC, h.id DESC LIMIT 50`
  ).all<{ id: number; contenido: string; publicado_en: number; carcajada: number; sonrisa: number; cunado: number }>();
  const elementos = (historial.results ?? []).map((item) => ({
    id: item.id, contenido: item.contenido, publicadoEn: item.publicado_en,
    votos: { carcajada: Number(item.carcajada), sonrisa: Number(item.sonrisa), cunado: Number(item.cunado) },
  }));
  return responderJson({
    contenido: fila?.contenido ?? "",
    visible: fila?.visible === 1,
    actualizadaEn: fila?.actualizada_en ?? 0,
    chisteActualId: elementos[0]?.contenido === fila?.contenido ? elementos[0].id : null,
    historial: elementos,
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

  const anterior = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT contenido FROM rincon_javi WHERE id = 1"
  ).first<{ contenido: string }>();
  const sentencias = [contexto.env.CONTENIDO_DB.prepare(
    `INSERT INTO rincon_javi (id, contenido, visible, actualizada_en)
     VALUES (1, ?, ?, unixepoch())
     ON CONFLICT(id) DO UPDATE SET contenido=excluded.contenido,
       visible=excluded.visible, actualizada_en=excluded.actualizada_en`
  ).bind(contenido, visible ? 1 : 0)];
  if (contenido && contenido !== anterior?.contenido) {
    sentencias.push(contexto.env.CONTENIDO_DB.prepare(
      "INSERT INTO rincon_javi_historial (contenido, publicado_en) VALUES (?, unixepoch())"
    ).bind(contenido));
  }
  await contexto.env.CONTENIDO_DB.batch(sentencias);
  const ultimo = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT id FROM rincon_javi_historial ORDER BY publicado_en DESC, id DESC LIMIT 1"
  ).first<{ id: number }>();
  return responderJson({ guardado: true, contenido, visible, chisteActualId: ultimo?.id ?? null });
};

export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  if (metodo === "GET") return consultar(contexto);
  if (metodo === "POST") return guardar(contexto);
  return responderJson({ error: "Método no permitido." }, 405);
};
