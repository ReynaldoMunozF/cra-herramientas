import { ContextoPagina, responderJson } from "../_utilidades";

const JUEGOS = ["codigo", "palabra", "asesino", "flota", "panel", "infiltrado", "social"];

const consultar = async (contexto: ContextoPagina) => {
  const fila = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT juegos, actualizada_en FROM configuracion_juegos_invitados WHERE id = 1"
  ).first<{ juegos: string; actualizada_en: number }>();
  let juegos = JUEGOS.slice(0, 4);
  try { juegos = JSON.parse(fila?.juegos ?? "[]"); } catch { /* Usa la selección inicial. */ }
  return responderJson({ juegos, actualizadaEn: fila?.actualizada_en ?? 0 });
};

/** Guarda inmediatamente qué juegos pueden ver los invitados. */
const guardar = async (contexto: ContextoPagina) => {
  let datos: { juegos?: unknown };
  try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
  const recibidos = Array.isArray(datos.juegos) ? datos.juegos : [];
  const juegos = [...new Set(recibidos.filter((juego): juego is string => typeof juego === "string" && JUEGOS.includes(juego)))];
  if (!juegos.length) return responderJson({ error: "Debes habilitar al menos un juego." }, 400);
  await contexto.env.CONTENIDO_DB.prepare(
    `INSERT INTO configuracion_juegos_invitados (id, juegos, actualizada_en)
     VALUES (1, ?, unixepoch())
     ON CONFLICT(id) DO UPDATE SET juegos=excluded.juegos, actualizada_en=excluded.actualizada_en`
  ).bind(JSON.stringify(juegos)).run();
  return responderJson({ guardado: true, juegos });
};

/** Controlador explícito para evitar que una petición POST termine usando la lectura. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  if (metodo === "GET") return consultar(contexto);
  if (metodo === "POST") return guardar(contexto);
  return responderJson({ error: "Método no permitido." }, 405);
};
