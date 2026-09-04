import { ContextoPagina, responderJson } from "./_utilidades";
import { compararConstante, crearHashPin, crearTokenOperador, matriculaValida, pinValido } from "./_seguridad-pin";

export const onRequestPost = async (contexto: ContextoPagina) => {
  let datos: Record<string, unknown>; try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
  const matricula = matriculaValida(datos.matricula), pin = pinValido(datos.pin); if (!matricula || !pin) return responderJson({ error: "La matrícula o el PIN no son válidos." }, 400);
  const fila = await contexto.env.CONTENIDO_DB.prepare("SELECT salt, pin_hash, iteraciones, fallos, bloqueado_hasta FROM pines_operadores WHERE matricula = ?").bind(matricula).first<{ salt: string; pin_hash: string; iteraciones: number; fallos: number; bloqueado_hasta: number }>();
  if (!fila) return responderJson({ error: "Esta matrícula todavía no tiene PIN asignado." }, 409);
  const ahora = Math.floor(Date.now() / 1000); if (fila.bloqueado_hasta > ahora) return responderJson({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
  const calculado = await crearHashPin(pin, fila.salt, fila.iteraciones || undefined, fila.iteraciones === 0 ? contexto.env.SECRETO_SESION : undefined); if (!compararConstante(calculado.hash, fila.pin_hash)) { const fallos = fila.fallos + 1, bloqueo = fallos >= 5 ? ahora + 900 : 0; await contexto.env.CONTENIDO_DB.prepare("UPDATE pines_operadores SET fallos = ?, bloqueado_hasta = ? WHERE matricula = ?").bind(fallos >= 5 ? 0 : fallos, bloqueo, matricula).run(); return responderJson({ error: bloqueo ? "Demasiados intentos. Espera 15 minutos." : `PIN incorrecto. Quedan ${5 - fallos} intentos.` }, 401); }
  await contexto.env.CONTENIDO_DB.prepare("UPDATE pines_operadores SET fallos = 0, bloqueado_hasta = 0 WHERE matricula = ?").bind(matricula).run(); const sesion = await crearTokenOperador(contexto.env.CONTENIDO_DB, matricula); return responderJson({ autorizado: true, matricula, ...sesion });
};
