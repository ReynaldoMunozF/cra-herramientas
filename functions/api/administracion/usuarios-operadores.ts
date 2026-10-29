import { ContextoPagina, responderJson } from "../_utilidades";
import { claveValida, crearHashClave, normalizarMatriculaCuenta } from "../_cuentas-operadores";

interface CuentaFila {
  matricula: string;
  nombre_visible: string;
  activa: number;
  debe_cambiar_clave: number;
  creada_en: number;
  ultimo_acceso_en: number | null;
}

/** Administración de cuentas personales. Las rutas /api/administracion ya son protegidas por el middleware. */
export const onRequest = async (contexto: ContextoPagina) => {
 try {
  const db = contexto.env.CONTENIDO_DB;
  const metodo = contexto.request.method.toUpperCase();
  if (metodo === "GET") {
    const resultado = await db.prepare(
      "SELECT matricula, nombre_visible, activa, debe_cambiar_clave, creada_en, ultimo_acceso_en FROM cuentas_operadores ORDER BY matricula"
    ).all<CuentaFila>();
    return responderJson({ cuentas: resultado.results ?? [] });
  }

  let datos: Record<string, unknown>;
  try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
  const matricula = normalizarMatriculaCuenta(datos.matricula);
  if (!matricula) return responderJson({ error: "La matrícula no es válida." }, 400);

  if (metodo === "POST") {
    const nombre = typeof datos.nombre === "string" ? datos.nombre.trim().slice(0, 100) : "";
    if (!nombre || !claveValida(datos.clave)) return responderJson({ error: "Indica el nombre y una contraseña temporal de al menos 10 caracteres." }, 400);
    if (!contexto.env.SECRETO_SESION) return responderJson({ error: "Falta la configuración de seguridad del servidor." }, 503);
    const clave = await crearHashClave(datos.clave as string, undefined, contexto.env.SECRETO_SESION);
    try {
      await db.prepare(
        `INSERT INTO cuentas_operadores(matricula, nombre_visible, salt_clave, clave_hash, iteraciones, activa, debe_cambiar_clave, creada_en, actualizada_en)
         VALUES (?, ?, ?, ?, ?, 1, 1, unixepoch(), unixepoch())`
      ).bind(matricula, nombre, clave.salt, clave.hash, clave.iteraciones).run();
      return responderJson({ creada: true, matricula });
    } catch {
      return responderJson({ error: "Esta matrícula ya tiene una cuenta. Puedes restablecerla o reactivarla desde la lista." }, 409);
    }
  }

  if (metodo === "PUT") {
    const accion = typeof datos.accion === "string" ? datos.accion : "";
    if (accion === "estado") {
      const activa = datos.activa === true ? 1 : 0;
      await db.prepare("UPDATE cuentas_operadores SET activa = ?, version_sesion = version_sesion + 1, actualizada_en = unixepoch() WHERE matricula = ?")
        .bind(activa, matricula).run();
      return responderJson({ actualizada: true, matricula, activa: Boolean(activa) });
    }
    if (accion === "restablecer") {
      if (!claveValida(datos.clave)) return responderJson({ error: "La nueva contraseña debe tener al menos 10 caracteres." }, 400);
      if (!contexto.env.SECRETO_SESION) return responderJson({ error: "Falta la configuración de seguridad del servidor." }, 503);
      const clave = await crearHashClave(datos.clave as string, undefined, contexto.env.SECRETO_SESION);
      await db.prepare(
        `UPDATE cuentas_operadores SET salt_clave = ?, clave_hash = ?, iteraciones = ?, debe_cambiar_clave = 1,
         version_sesion = version_sesion + 1, actualizada_en = unixepoch() WHERE matricula = ?`
      ).bind(clave.salt, clave.hash, clave.iteraciones, matricula).run();
      return responderJson({ restablecida: true, matricula });
    }
    return responderJson({ error: "Acción no válida." }, 400);
  }
  return responderJson({ error: "Método no permitido." }, 405);
 } catch (error) {
  console.error("Error al gestionar cuentas de operadores", error instanceof Error ? error.message : String(error));
  return responderJson({ error: "No se pudo crear o actualizar la cuenta. Inténtalo de nuevo." }, 500);
 }
};
