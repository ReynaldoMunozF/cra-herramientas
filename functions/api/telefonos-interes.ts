import { ContextoPagina, responderJson } from "./_utilidades";

interface TelefonoInteres {
  id: number;
  nombre: string;
  telefono: string;
  descripcion: string;
  orden: number;
  actualizado_en: number;
}

/** Lista compartida. La sesión global de Pages ya protege su lectura. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const resultado = await contexto.env.CONTENIDO_DB.prepare(
    `SELECT id, nombre, telefono, descripcion, orden, actualizado_en
     FROM telefonos_interes
     ORDER BY orden ASC, nombre COLLATE NOCASE ASC, id ASC`
  ).all<TelefonoInteres>();
  const telefonos = resultado.results ?? [];
  const version = telefonos.reduce((maximo, telefono) => Math.max(maximo, telefono.actualizado_en), 0);
  return responderJson({ telefonos, version });
};
