import { ContextoPagina, responderJson } from "./_utilidades";
import { claveValida, crearHashClave, verificarClaveCuenta } from "./_cuentas-operadores";

/** Permite a un operador sustituir su contraseña sin intervención del administrador. */
export const onRequestPost = async (contexto: ContextoPagina) => {
  if (contexto.data?.rol !== "operador" || !contexto.data.matricula || !contexto.env.SECRETO_SESION) {
    return responderJson({ error: "Esta opción está disponible al entrar con una cuenta personal." }, 403);
  }
  let datos: { actual?: unknown; nueva?: unknown };
  try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
  if (typeof datos.actual !== "string" || !claveValida(datos.nueva)) {
    return responderJson({ error: "La nueva contraseña debe tener al menos 10 caracteres." }, 400);
  }
  const cuenta = await contexto.env.CONTENIDO_DB.prepare(
    "SELECT salt_clave, clave_hash, iteraciones FROM cuentas_operadores WHERE matricula = ? AND activa = 1"
  ).bind(contexto.data.matricula).first<{ salt_clave: string; clave_hash: string; iteraciones: number }>();
  if (!cuenta || !await verificarClaveCuenta(datos.actual, cuenta, contexto.env.SECRETO_SESION)) {
    return responderJson({ error: "La contraseña actual no es correcta." }, 401);
  }
  const nueva = await crearHashClave(datos.nueva as string, undefined, contexto.env.SECRETO_SESION);
  await contexto.env.CONTENIDO_DB.prepare(
    `UPDATE cuentas_operadores SET salt_clave = ?, clave_hash = ?, iteraciones = ?, debe_cambiar_clave = 0,
     version_sesion = version_sesion + 1, actualizada_en = unixepoch() WHERE matricula = ?`
  ).bind(nueva.salt, nueva.hash, nueva.iteraciones, contexto.data.matricula).run();
  return responderJson({ cambiada: true, requiereReingreso: true });
};
