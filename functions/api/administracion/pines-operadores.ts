import { ContextoPagina, responderJson } from "../_utilidades";
import { crearHashPin, matriculaValida, pinValido } from "../_seguridad-pin";

export const onRequest = async (contexto: ContextoPagina) => {
 try {
  const metodo = contexto.request.method.toUpperCase(), db = contexto.env.CONTENIDO_DB;
  if (metodo === "GET") { const filas = await db.prepare("SELECT matricula, actualizado_en FROM pines_operadores ORDER BY matricula").all<{ matricula: string; actualizado_en: number }>(); return responderJson({ operadores: filas.results ?? [] }); }
  let datos: Record<string, unknown>; try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); } const matricula = matriculaValida(datos.matricula); if (!matricula) return responderJson({ error: "Matrícula no válida." }, 400);
  if (metodo === "PUT") { const pin = pinValido(datos.pin); if (!pin) return responderJson({ error: "El PIN debe contener entre 4 y 8 números." }, 400); if (!contexto.env.SECRETO_SESION) return responderJson({ error: "Falta configurar el secreto de seguridad del servidor." }, 503); const seguro = await crearHashPin(pin, undefined, undefined, contexto.env.SECRETO_SESION); await db.prepare("INSERT INTO pines_operadores(matricula,salt,pin_hash,iteraciones,fallos,bloqueado_hasta,actualizado_en) VALUES(?,?,?,?,0,0,unixepoch()) ON CONFLICT(matricula) DO UPDATE SET salt=excluded.salt,pin_hash=excluded.pin_hash,iteraciones=excluded.iteraciones,fallos=0,bloqueado_hasta=0,actualizado_en=unixepoch()").bind(matricula, seguro.salt, seguro.hash, seguro.iteraciones).run(); await db.prepare("DELETE FROM sesiones_pin_operador WHERE matricula = ?").bind(matricula).run(); return responderJson({ guardado: true, matricula }); }
  if (metodo === "DELETE") { await db.prepare("DELETE FROM sesiones_pin_operador WHERE matricula = ?").bind(matricula).run(); await db.prepare("DELETE FROM pines_operadores WHERE matricula = ?").bind(matricula).run(); return responderJson({ eliminado: true, matricula }); }
  return responderJson({ error: "Método no permitido." }, 405);
 } catch (error) {
  console.error("Error gestionando PIN de operador", error instanceof Error ? error.message : String(error));
  return responderJson({ error: "No se pudo cifrar o guardar el PIN. Inténtalo de nuevo." }, 500);
 }
};
