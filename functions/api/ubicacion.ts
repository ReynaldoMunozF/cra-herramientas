import { ContextoPagina, responderJson } from "./_utilidades";

interface RespuestaNominatim {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Convierte unas coordenadas en una dirección aproximada mediante Nominatim.
 * La sesión privada del proyecto protege este punto de acceso frente a terceros.
 */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const url = new URL(contexto.request.url);
  const direccionBuscada = (url.searchParams.get("direccion") ?? "").trim();
  const latitud = Number(url.searchParams.get("latitud"));
  const longitud = Number(url.searchParams.get("longitud"));

  if (direccionBuscada) {
    if (direccionBuscada.length < 5 || direccionBuscada.length > 500) {
      return responderJson({ error: "La dirección no tiene una longitud válida." }, 400);
    }

    const consultaDireccion = new URL("https://nominatim.openstreetmap.org/search");
    consultaDireccion.searchParams.set("format", "jsonv2");
    consultaDireccion.searchParams.set("q", direccionBuscada);
    consultaDireccion.searchParams.set("addressdetails", "1");
    consultaDireccion.searchParams.set("accept-language", "es");
    consultaDireccion.searchParams.set("countrycodes", "es");
    consultaDireccion.searchParams.set("limit", "1");

    try {
      const respuesta = await fetch(consultaDireccion, {
        headers: {
          "User-Agent": "Manual-CRA-Reynaldo/1.0 (herramienta privada de localizacion)",
          "Referer": new URL(contexto.request.url).origin,
        },
      });
      if (!respuesta.ok) throw new Error();
      const coincidencias = (await respuesta.json()) as RespuestaNominatim[];
      const datos = coincidencias[0];
      if (!datos?.lat || !datos?.lon) {
        return responderJson({ error: "No se encontró una coincidencia para esa dirección." }, 404);
      }

      const direccion = datos.address ?? {};
      return responderJson({
        direccionCompleta: datos.display_name ?? direccionBuscada,
        localidad:
          direccion.city ??
          direccion.town ??
          direccion.village ??
          direccion.municipality ??
          "",
        provincia: direccion.county ?? "",
        comunidad: direccion.state ?? "",
        codigoPostal: direccion.postcode ?? "",
        pais: direccion.country ?? "",
        latitud: Number(datos.lat),
        longitud: Number(datos.lon),
      });
    } catch {
      return responderJson({ error: "No ha sido posible buscar esa dirección." }, 502);
    }
  }

  if (
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud) ||
    latitud < -90 ||
    latitud > 90 ||
    longitud < -180 ||
    longitud > 180
  ) {
    return responderJson({ error: "Las coordenadas no son válidas." }, 400);
  }

  const consulta = new URL("https://nominatim.openstreetmap.org/reverse");
  consulta.searchParams.set("format", "jsonv2");
  consulta.searchParams.set("lat", String(latitud));
  consulta.searchParams.set("lon", String(longitud));
  consulta.searchParams.set("addressdetails", "1");
  consulta.searchParams.set("accept-language", "es");
  consulta.searchParams.set("zoom", "18");

  try {
    const respuesta = await fetch(consulta, {
      headers: {
        "User-Agent": "Manual-CRA-Reynaldo/1.0 (herramienta privada de localizacion)",
        "Referer": new URL(contexto.request.url).origin,
      },
    });
    if (!respuesta.ok) throw new Error();

    const datos = (await respuesta.json()) as RespuestaNominatim;
    const direccion = datos.address ?? {};
    return responderJson({
      direccionCompleta: datos.display_name ?? "Dirección no identificada",
      localidad:
        direccion.city ??
        direccion.town ??
        direccion.village ??
        direccion.municipality ??
        "",
      provincia: direccion.county ?? "",
      comunidad: direccion.state ?? "",
      codigoPostal: direccion.postcode ?? "",
      pais: direccion.country ?? "",
      latitud,
      longitud,
    });
  } catch {
    return responderJson(
      { error: "No ha sido posible localizar estas coordenadas." },
      502
    );
  }
};
