import { ContextoPagina, responderJson } from "./_utilidades";

type Voto = "carcajada" | "sonrisa" | "cunado";
interface FilaHistorial { id: number; contenido: string; publicado_en: number; carcajada: number; sonrisa: number; cunado: number; }

const consultarHistorial = async (contexto: ContextoPagina) => {
  const resultado = await contexto.env.CONTENIDO_DB.prepare(
    `SELECT h.id, h.contenido, h.publicado_en,
      SUM(CASE WHEN v.voto = 'carcajada' THEN 1 ELSE 0 END) AS carcajada,
      SUM(CASE WHEN v.voto = 'sonrisa' THEN 1 ELSE 0 END) AS sonrisa,
      SUM(CASE WHEN v.voto = 'cunado' THEN 1 ELSE 0 END) AS cunado
     FROM rincon_javi_historial h
     LEFT JOIN rincon_javi_votos v ON v.chiste_id = h.id
     GROUP BY h.id ORDER BY h.publicado_en DESC, h.id DESC LIMIT 50`
  ).all<FilaHistorial>();
  return (resultado.results ?? []).map((fila) => ({
    id: fila.id, contenido: fila.contenido, publicadoEn: fila.publicado_en,
    votos: { carcajada: Number(fila.carcajada), sonrisa: Number(fila.sonrisa), cunado: Number(fila.cunado) },
  }));
};

const consultar = async (contexto: ContextoPagina) => {

  const fila = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT contenido, visible, actualizada_en FROM rincon_javi WHERE id = 1"
  ).first<{ contenido: string; visible: number; actualizada_en: number }>();
  const visible = fila?.visible === 1 && Boolean(fila.contenido.trim());

  const historial = await consultarHistorial(contexto);
  return responderJson({
    visible,
    contenido: visible ? fila?.contenido ?? "" : "",
    actualizadaEn: fila?.actualizada_en ?? 0,
    chisteActualId: visible && historial[0]?.contenido === fila?.contenido ? historial[0].id : null,
    historial: visible ? historial : [],
  });
};

const votar = async (contexto: ContextoPagina) => {
  let datos: { chisteId?: unknown; voto?: unknown };
  try { datos = await contexto.request.json(); }
  catch { return responderJson({ error: "Los datos enviados no son válidos." }, 400); }

  const chisteId = Number(datos.chisteId);
  const votosPermitidos = new Set<Voto>(["carcajada", "sonrisa", "cunado"]);
  const voto = typeof datos.voto === "string" && votosPermitidos.has(datos.voto as Voto) ? datos.voto as Voto : null;
  if (!Number.isSafeInteger(chisteId) || chisteId <= 0 || !voto) {
    return responderJson({ error: "La votación no es válida." }, 400);
  }

  const existe = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT id FROM rincon_javi_historial WHERE id = ?"
  ).bind(chisteId).first<{ id: number }>();
  if (!existe) return responderJson({ error: "El chiste ya no está disponible." }, 404);

  // Cada pulsación cuenta como un voto independiente. El identificador se
  // genera en el servidor para que usuarios compartidos puedan votar sin que
  // un navegador reemplace votos anteriores.
  await contexto.env.CONTENIDO_DB.prepare(
    "INSERT INTO rincon_javi_votos (chiste_id, votante, voto, votado_en) VALUES (?, ?, ?, unixepoch())"
  ).bind(chisteId, crypto.randomUUID(), voto).run();

  const historial = await consultarHistorial(contexto);
  return responderJson({ guardado: true, chiste: historial.find((item) => item.id === chisteId) });
};

/** Contenido y votación para cualquier usuario que tenga una sesión válida. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  if (metodo === "GET") return consultar(contexto);
  if (metodo === "POST") return votar(contexto);
  return responderJson({ error: "Método no permitido." }, 405);
};
