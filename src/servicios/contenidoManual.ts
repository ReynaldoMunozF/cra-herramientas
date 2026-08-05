import { ContenidoProcesoEditable, RespuestaAdministracionManual, esContenidoProcesoValido } from "../manual/modeloContenido";

const comprobarRespuesta = async (respuesta: Response) => {
  if (respuesta.ok) return respuesta;
  let mensaje = "No se pudo completar la operación.";
  try { mensaje = (await respuesta.json()).error || mensaje; } catch { /* Respuesta sin JSON. */ }
  throw new Error(mensaje);
};

/** Obtiene la última versión publicada; null activa el respaldo incluido en código. */
export const obtenerProcesoPublicado = async (proceso: string) => {
  const respuesta = await fetch(`/api/manual/${encodeURIComponent(proceso)}`, { credentials: "same-origin" });
  if (respuesta.status === 404) return null;
  await comprobarRespuesta(respuesta);
  const contenido = await respuesta.json();
  return esContenidoProcesoValido(contenido) ? contenido : null;
};

export const obtenerAdministracionProceso = async (proceso: string): Promise<RespuestaAdministracionManual> => {
  const respuesta = await fetch(`/api/administracion/manual/${encodeURIComponent(proceso)}`, { credentials: "same-origin" });
  await comprobarRespuesta(respuesta);
  return respuesta.json();
};

export const guardarBorradorProceso = async (proceso: string, contenido: ContenidoProcesoEditable) => {
  const respuesta = await fetch(`/api/administracion/manual/${encodeURIComponent(proceso)}`, {
    method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contenido),
  });
  await comprobarRespuesta(respuesta);
  return respuesta.json();
};

export const publicarBorradorProceso = async (proceso: string) => {
  const respuesta = await fetch(`/api/administracion/manual/${encodeURIComponent(proceso)}`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
  });
  await comprobarRespuesta(respuesta);
  return respuesta.json();
};
