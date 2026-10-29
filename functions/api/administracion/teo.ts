import { ContextoPagina, responderJson } from "../_utilidades";
import { consultarInteresTeo } from "../../_datos/interesTeo";
import { buscarLocalidades } from "../../_datos/busquedaPostal";
import { onRequestGet as consultarPostal } from "../codigo-postal";
import { onRequestGet as consultarValidacion } from "../validaciones-fse";
import { onRequestGet as consultarUbicacion } from "../ubicacion";
import { calcularOrientacion, aplicarValidacionFse, ValidacionFse } from "../../../src/servicios/orientacionFse";
import type { LocalizacionPostal } from "../../../src/servicios/localizacionPostal";
import type { ResultadoTeo, UbicacionCoordenadasTeo } from "../../../src/servicios/teo";

const consultarFsePostal = async (contexto: ContextoPagina, codigoPostal: string) => {
  const url = new URL(contexto.request.url);
  url.searchParams.set("codigoPostal", codigoPostal);
  const contextoPostal = { ...contexto, request: new Request(url, contexto.request) };
  const respuestaPostal = await consultarPostal(contextoPostal);
  if (!respuestaPostal.ok) return respuestaPostal;
  const ubicacion = await respuestaPostal.json() as LocalizacionPostal;
  let orientacion = calcularOrientacion(codigoPostal, ubicacion);
  let validacionDisponible = false;
  try {
    const respuesta = await consultarValidacion(contextoPostal);
    if (respuesta.ok) {
      orientacion = aplicarValidacionFse(orientacion, await respuesta.json() as ValidacionFse);
      validacionDisponible = true;
    }
  } catch { /* Mantiene el resultado base e informa de que faltan las validaciones. */ }
  return responderJson({ ubicacion, orientacion, validacionDisponible });
};

/** Piloto de Teo: exige la sesión administrativa validada por el middleware. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  if (contexto.data?.rol !== "administrador") {
    return responderJson({ error: "Teo está disponible únicamente para el administrador." }, 403);
  }
  const parametros = new URL(contexto.request.url).searchParams;
  if (parametros.has("latitud") || parametros.has("longitud")) {
    const latitudTexto = parametros.get("latitud")?.trim() ?? "";
    const longitudTexto = parametros.get("longitud")?.trim() ?? "";
    const latitud = Number(latitudTexto);
    const longitud = Number(longitudTexto);
    if (!latitudTexto || !longitudTexto || !Number.isFinite(latitud) || !Number.isFinite(longitud) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) {
      return responderJson({ error: "Introduce latitud y longitud válidas, en ese orden." }, 400);
    }
    try {
      const respuesta = await consultarUbicacion(contexto);
      if (!respuesta.ok) return respuesta;
      const ubicacion = await respuesta.json() as UbicacionCoordenadasTeo;
      const esEspana = ubicacion.codigoPais
        ? ubicacion.codigoPais.toLowerCase() === "es"
        : /^(españa|espana|spain)$/i.test(ubicacion.pais.trim());
      let fse: ResultadoTeo | null = null;
      let avisoFse: string | undefined;
      if (!esEspana) {
        avisoFse = "No se consulta la FSE española: la ubicación está fuera de España o no se ha podido confirmar el país.";
      } else if (!/^\d{5}$/.test(ubicacion.codigoPostal)) {
        avisoFse = "La fuente no devuelve un código postal español preciso. No se ha deducido una FSE.";
      } else {
        try {
          const respuestaFse = await consultarFsePostal(contexto, ubicacion.codigoPostal);
          if (respuestaFse.ok) fse = await respuestaFse.json() as ResultadoTeo;
          else avisoFse = "La dirección está disponible, pero no se ha podido resolver la FSE de este código postal.";
        } catch {
          avisoFse = "La dirección está disponible, pero la consulta FSE no está disponible. Inténtalo de nuevo.";
        }
      }
      return responderJson({ ubicacion, fse, avisoFse });
    } catch {
      return responderJson({ error: "No se ha podido localizar este punto. Inténtalo de nuevo." }, 503);
    }
  }
  const codigoPostal = parametros.get("codigoPostal");
  if (codigoPostal !== null) {
    if (!/^\d{5}$/.test(codigoPostal)) return responderJson({ error: "Código postal no válido." }, 400);
    try { return await consultarFsePostal(contexto, codigoPostal); }
    catch { return responderJson({ error: "No se pudo consultar este código postal. Inténtalo de nuevo." }, 503); }
  }
  const texto = (parametros.get("texto") ?? "").trim();
  if (texto.length < 2 || texto.length > 120) return responderJson({ error: "Escribe entre 2 y 120 caracteres." }, 400);
  return responderJson({ ...buscarLocalidades(texto), ...await consultarInteresTeo(contexto, texto) });
};
