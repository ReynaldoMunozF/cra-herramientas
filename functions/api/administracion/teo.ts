import { ContextoPagina, responderJson } from "../_utilidades";
import { buscarLocalidades } from "../../_datos/busquedaPostal";
import { onRequestGet as consultarPostal } from "../codigo-postal";
import { onRequestGet as consultarValidacion } from "../validaciones-fse";
import { calcularOrientacion, aplicarValidacionFse, ValidacionFse } from "../../../src/servicios/orientacionFse";
import type { LocalizacionPostal } from "../../../src/servicios/localizacionPostal";

/** Piloto de Teo: exige la sesión administrativa validada por el middleware. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  if (contexto.data?.rol !== "administrador") {
    return responderJson({ error: "Teo está disponible únicamente para el administrador." }, 403);
  }
  const parametros = new URL(contexto.request.url).searchParams;
  const codigoPostal = parametros.get("codigoPostal");
  if (codigoPostal !== null) {
    if (!/^\d{5}$/.test(codigoPostal)) return responderJson({ error: "Código postal no válido." }, 400);
    try {
      const respuestaPostal = await consultarPostal(contexto);
      if (!respuestaPostal.ok) return respuestaPostal;
      const ubicacion = await respuestaPostal.json() as LocalizacionPostal;
      const base = calcularOrientacion(codigoPostal, ubicacion);
      let orientacion = base;
      let validacionDisponible = false;
      try {
        const respuesta = await consultarValidacion(contexto);
        if (respuesta.ok) {
          orientacion = aplicarValidacionFse(base, await respuesta.json() as ValidacionFse);
          validacionDisponible = true;
        }
      } catch { /* Mantiene el resultado base e informa de que faltan las validaciones. */ }
      return responderJson({ ubicacion, orientacion, validacionDisponible });
    } catch {
      return responderJson({ error: "No se pudo consultar este código postal. Inténtalo de nuevo." }, 503);
    }
  }
  const texto = (parametros.get("texto") ?? "").trim();
  if (texto.length < 2 || texto.length > 120) return responderJson({ error: "Escribe entre 2 y 120 caracteres." }, 400);
  return responderJson(buscarLocalidades(texto));
};
