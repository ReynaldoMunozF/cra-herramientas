import { onRequest as gestionarPalabraClave } from "./administracion/palabra-clave";
import { ContextoPagina, responderJson } from "./_utilidades";

/**
 * Ruta disponible para cualquier sesión válida. Reutiliza el motor del juego,
 * pero bloquea expresamente la configuración reservada al administrador.
 */
export const onRequest = async (contexto: ContextoPagina) => {
  if (contexto.request.method.toUpperCase() === "POST") {
    try {
      const datos = await contexto.request.clone().json() as { accion?: string };
      if (datos.accion === "configurar") {
        return responderJson({ error: "Configuración reservada al administrador." }, 403);
      }
    } catch {
      return responderJson({ error: "Los datos enviados no son válidos." }, 400);
    }
  }
  return gestionarPalabraClave(contexto);
};
