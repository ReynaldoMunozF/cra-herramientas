import type { LocalizacionPostal } from "./localizacionPostal";
import type { OrientacionFse } from "./orientacionFse";

export interface LocalidadTeo {
  nombre: string;
  provincia: string;
  comunidad: string;
  codigos: Array<{ codigoPostal: string; complementario: boolean }>;
}
export interface BusquedaTeo { localidades: LocalidadTeo[]; total: number; }
export interface ResultadoTeo {
  ubicacion: LocalizacionPostal;
  orientacion: OrientacionFse;
  validacionDisponible: boolean;
}
export class SesionTeoError extends Error {}

export const consultarTeo = async <T,>(parametros: URLSearchParams, signal: AbortSignal): Promise<T> => {
  const respuesta = await fetch(`/api/administracion/teo?${parametros}`, {
    credentials: "same-origin", signal, headers: { Accept: "application/json" },
  });
  // El middleware devuelve el formulario de acceso al caducar la sesión.
  if ([401, 403].includes(respuesta.status) || (respuesta.headers.get("Content-Type") ?? "").includes("text/html")) {
    throw new SesionTeoError("Teo solo está disponible con una sesión de administrador activa.");
  }
  if (!respuesta.ok) throw new Error("No he podido consultar los datos. Inténtalo de nuevo.");
  return await respuesta.json() as T;
};
