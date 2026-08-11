import { ContextoPagina, responderJson } from "./_utilidades";

interface LocalizacionPostal {
  nombre: string;
  comunidad: string;
  provincia: string;
  latitud: number;
  longitud: number;
  fuente: string;
}

const provinciasPorPrefijo: Record<string, string> = {
  "01":"Álava","02":"Albacete","03":"Alicante","04":"Almería","05":"Ávila","06":"Badajoz",
  "07":"Illes Balears","08":"Barcelona","09":"Burgos","10":"Cáceres","11":"Cádiz","12":"Castellón",
  "13":"Ciudad Real","14":"Córdoba","15":"A Coruña","16":"Cuenca","17":"Girona","18":"Granada",
  "19":"Guadalajara","20":"Gipuzkoa","21":"Huelva","22":"Huesca","23":"Jaén","24":"León",
  "25":"Lleida","26":"La Rioja","27":"Lugo","28":"Madrid","29":"Málaga","30":"Murcia",
  "31":"Navarra","32":"Ourense","33":"Asturias","34":"Palencia","35":"Las Palmas","36":"Pontevedra",
  "37":"Salamanca","38":"Santa Cruz de Tenerife","39":"Cantabria","40":"Segovia","41":"Sevilla",
  "42":"Soria","43":"Tarragona","44":"Teruel","45":"Toledo","46":"Valencia","47":"Valladolid",
  "48":"Bizkaia","49":"Zamora","50":"Zaragoza","51":"Ceuta","52":"Melilla",
};

const VERSION_CACHE = "postal-v4";
const normalizar = (texto = "") => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const numeroValido = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
};

const listaRegistros = (valor: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(valor)) return valor as Array<Record<string, unknown>>;
  if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    if (Array.isArray(objeto.results)) return objeto.results as Array<Record<string, unknown>>;
    if (Array.isArray(objeto.features)) {
      return objeto.features.map((feature) => {
        const registro = feature as Record<string, unknown>;
        return registro.properties && typeof registro.properties === "object"
          ? { ...registro, ...(registro.properties as Record<string, unknown>) }
          : registro;
      });
    }
    return [objeto.properties && typeof objeto.properties === "object"
      ? { ...objeto, ...(objeto.properties as Record<string, unknown>) }
      : objeto];
  }
  return [];
};

const leerJson = async (respuesta: Response): Promise<unknown> => {
  if (!respuesta.ok || !(respuesta.headers.get("Content-Type") ?? "").toLowerCase().includes("json")) return null;
  try { return await respuesta.json(); } catch { return null; }
};

const provinciaCoincide = (entrada: Record<string, unknown>, codigoPostal: string, provincia: string) => {
  const codigoProvincia = String(entrada.provinceCode ?? "").padStart(2, "0");
  const provinciaCandidata = normalizar(String(entrada.province ?? ""));
  return codigoProvincia === codigoPostal.slice(0, 2)
    || provinciaCandidata.includes(normalizar(provincia));
};

const consultarCartoCiudad = async (codigoPostal: string, provincia: string): Promise<LocalizacionPostal | null> => {
  const url = `https://www.cartociudad.es/geocoder/api/geocoder/candidates?q=${encodeURIComponent(codigoPostal)}&limit=10`;
  const respuesta = await fetch(url, { headers: { Accept: "application/json" } });
  const datos = listaRegistros(await leerJson(respuesta));
  const candidato = datos.find((entrada) => {
    const postal = String(entrada.postalCode ?? entrada.address ?? "").trim();
    const codigoExacto = new RegExp(`(^|\\D)${codigoPostal}(\\D|$)`).test(postal);
    return codigoExacto
      && provinciaCoincide(entrada, codigoPostal, provincia)
      && String(entrada.type ?? "").toLowerCase() === "codpost";
  });
  if (!candidato) return null;

  let detalle = candidato;
  if (candidato.id) {
    const urlDetalle = `https://www.cartociudad.es/geocoder/api/geocoder/find?id=${encodeURIComponent(String(candidato.id))}&type=Codpost`;
    const registrosDetalle = listaRegistros(await leerJson(await fetch(urlDetalle, { headers: { Accept: "application/json" } })));
    if (registrosDetalle[0]) detalle = { ...candidato, ...registrosDetalle[0] };
  }

  const latitud = numeroValido(detalle.lat);
  const longitud = numeroValido(detalle.lng);
  if (latitud === null || longitud === null) return null;

  let nombre = String(detalle.muni ?? detalle.poblacion ?? "").trim();
  let comunidad = String(detalle.comunidadAutonoma ?? "").trim();
  if (!nombre) {
    const urlInversa = `https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode?lon=${longitud}&lat=${latitud}`;
    const inversos = listaRegistros(await leerJson(await fetch(urlInversa, { headers: { Accept: "application/json" } })));
    const inverso = inversos.find((entrada) => provinciaCoincide(entrada, codigoPostal, provincia));
    if (inverso) {
      nombre = String(inverso.muni ?? inverso.poblacion ?? "").trim();
      comunidad ||= String(inverso.comunidadAutonoma ?? "").trim();
    }
  }
  if (!nombre) return null;
  return {
    nombre,
    comunidad,
    provincia,
    latitud,
    longitud,
    fuente: `CartoCiudad · IGN/CNIG · ${VERSION_CACHE}`,
  };
};

const consultarNominatim = async (codigoPostal: string, provincia: string): Promise<LocalizacionPostal | null> => {
  const parametros = new URLSearchParams({
    postalcode: codigoPostal,
    countrycodes: "es",
    format: "jsonv2",
    addressdetails: "1",
    limit: "10",
  });
  const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CRA-Herramientas/1.0 (+https://github.com/ReynaldoMunozF/cra-herramientas)",
    },
  });
  const resultados = listaRegistros(await leerJson(respuesta));
  for (const resultado of resultados) {
    const direccion = resultado.address && typeof resultado.address === "object"
      ? resultado.address as Record<string, unknown>
      : {};
    const postal = String(direccion.postcode ?? "").trim();
    const pais = String(direccion.country_code ?? "").toLowerCase();
    const territorio = normalizar(`${direccion.province ?? ""} ${direccion.state ?? ""} ${direccion.county ?? ""}`);
    if (postal !== codigoPostal || pais !== "es" || !territorio.includes(normalizar(provincia))) continue;
    const nombre = String(
      direccion.city ?? direccion.town ?? direccion.village ?? direccion.municipality ?? direccion.hamlet ?? "",
    ).trim();
    const latitud = numeroValido(resultado.lat);
    const longitud = numeroValido(resultado.lon);
    if (!nombre || latitud === null || longitud === null) continue;
    return {
      nombre,
      comunidad: String(direccion.state ?? "").trim(),
      provincia,
      latitud,
      longitud,
      fuente: `OpenStreetMap · Nominatim (respaldo) · ${VERSION_CACHE}`,
    };
  }
  return null;
};

export const onRequestGet = async (contexto: ContextoPagina) => {
  const codigoPostal = new URL(contexto.request.url).searchParams.get("codigoPostal")?.trim() || "";
  const provincia = provinciasPorPrefijo[codigoPostal.slice(0, 2)];
  if (!/^\d{5}$/.test(codigoPostal) || !provincia) {
    return responderJson({ error: "Código postal español no válido." }, 400);
  }

  const cache = await contexto.env.CONTENIDO_DB.prepare(
    `SELECT municipio AS nombre, comunidad, provincia, latitud, longitud, fuente
     FROM codigos_postales_cache WHERE codigo_postal = ?`,
  ).bind(codigoPostal).first<LocalizacionPostal>();
  if (cache?.fuente.includes(VERSION_CACHE)) return responderJson(cache);

  let localizacion: LocalizacionPostal | null = null;
  try {
    localizacion = await consultarCartoCiudad(codigoPostal, provincia)
      ?? await consultarNominatim(codigoPostal, provincia);
  } catch {
    return responderJson({ error: "No se pudo contactar con el servicio postal oficial." }, 503);
  }
  if (!localizacion?.nombre) return responderJson({ error: "Código postal no encontrado en España." }, 404);

  await contexto.env.CONTENIDO_DB.prepare(
    `INSERT INTO codigos_postales_cache
       (codigo_postal, municipio, provincia, comunidad, latitud, longitud, fuente, actualizado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
     ON CONFLICT(codigo_postal) DO UPDATE SET
       municipio=excluded.municipio, provincia=excluded.provincia, comunidad=excluded.comunidad,
       latitud=excluded.latitud, longitud=excluded.longitud, fuente=excluded.fuente,
       actualizado_en=excluded.actualizado_en`,
  ).bind(
    codigoPostal, localizacion.nombre, localizacion.provincia, localizacion.comunidad,
    localizacion.latitud, localizacion.longitud, localizacion.fuente,
  ).run();

  return responderJson(localizacion);
};
