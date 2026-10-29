import { LocalizacionPostal } from "./localizacionPostal";
import { esMunicipioPoliciaNacionalDocumentado } from "../datos/demarcacionesPoliciaNacional";

export interface OrientacionFse {
  principal: string;
  concurrentes: string[];
  criterio: string;
  confianza: "alta" | "media" | "baja";
}

/** Capital de cada provincia, indexada por los dos primeros dígitos postales. */
const capitalesProvincia: Record<string, string> = {
  "01": "Vitoria-Gasteiz", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Palma", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón de la Plana",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Donostia-San Sebastián",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León", "25": "Lleida",
  "26": "Logroño", "27": "Lugo", "28": "Madrid", "29": "Málaga", "30": "Murcia",
  "31": "Pamplona", "32": "Ourense", "33": "Oviedo", "34": "Palencia",
  "35": "Las Palmas de Gran Canaria", "36": "Pontevedra", "37": "Salamanca",
  "38": "Santa Cruz de Tenerife", "39": "Santander", "40": "Segovia", "41": "Sevilla",
  "42": "Soria", "43": "Tarragona", "44": "Teruel", "45": "Toledo", "46": "Valencia",
  "47": "Valladolid", "48": "Bilbao", "49": "Zamora", "50": "Zaragoza",
  "51": "Ceuta", "52": "Melilla",
};

/** Simplifica acentos y variantes para comparar nombres obtenidos de servicios externos. */
const normalizar = (texto = "") => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Demarcaciones confirmadas mediante fuentes oficiales.
 * Se identifican por municipio y provincia para que la corrección se aplique a
 * todos los códigos postales de la localidad, no únicamente a uno concreto.
 */
const demarcacionesVerificadas: Record<string, string> = {
  "pozuelo de alarcon|madrid": "Policía Nacional",
  "parla|madrid": "Policía Nacional",
};

/**
 * Genera una orientación, no una asignación operativa. Las policías autonómicas
 * con despliegue integral se priorizan; en el resto se aplica una aproximación
 * capital/no capital que siempre debe verificarse con la demarcación oficial.
 */
export const calcularOrientacion = (codigoPostal: string, ubicacion: LocalizacionPostal): OrientacionFse => {
  const comunidad = normalizar(ubicacion.comunidad);
  const claveMunicipio = `${normalizar(ubicacion.nombre)}|${normalizar(ubicacion.provincia)}`;
  const cuerpoVerificado = demarcacionesVerificadas[claveMunicipio];

  if (comunidad.includes("catalu") || comunidad.includes("catalon")) {
    return { principal: "Mossos d’Esquadra", concurrentes: ["Policía Nacional", "Guardia Civil"], criterio: "Policía autonómica con despliegue territorial en Cataluña.", confianza: "media" };
  }
  if (comunidad.includes("pais vasco") || comunidad.includes("euskadi") || comunidad.includes("basque")) {
    return { principal: "Ertzaintza", concurrentes: ["Policía Nacional", "Guardia Civil"], criterio: "Policía autonómica con despliegue territorial en el País Vasco.", confianza: "media" };
  }
  if (comunidad.includes("navarra") || comunidad.includes("navarre")) {
    return { principal: "Policía Foral de Navarra", concurrentes: ["Policía Nacional", "Guardia Civil"], criterio: "En Navarra existen competencias concurrentes que dependen del servicio y la demarcación.", confianza: "baja" };
  }
  if (cuerpoVerificado) {
    return {
      principal: cuerpoVerificado,
      concurrentes: cuerpoVerificado === "Policía Nacional" ? ["Guardia Civil"] : ["Policía Nacional"],
      criterio: "Demarcación del municipio contrastada mediante fuentes oficiales.",
      confianza: "media",
    };
  }

  if (esMunicipioPoliciaNacionalDocumentado(ubicacion.nombre, ubicacion.provincia || "")) {
    return {
      principal: "Policía Nacional",
      concurrentes: ["Guardia Civil"],
      criterio: "Municipio incluido en la relación documental de demarcaciones de Policía Nacional.",
      confianza: "media",
    };
  }

  const capital = capitalesProvincia[codigoPostal.slice(0, 2)];
  const pareceCapital = capital && (
    normalizar(ubicacion.nombre).includes(normalizar(capital)) ||
    normalizar(capital).includes(normalizar(ubicacion.nombre))
  );

  if (pareceCapital) {
    return { principal: "Policía Nacional", concurrentes: ["Guardia Civil"], criterio: "Orientación basada en que la localidad coincide con una capital de provincia.", confianza: "media" };
  }

  return { principal: "Guardia Civil", concurrentes: ["Policía Nacional"], criterio: "Orientación aproximada para una localidad no identificada como capital; existen municipios urbanos con Policía Nacional.", confianza: "baja" };
};

export interface ValidacionFse {
  resultadoAsignado?: string | null;
  resultadoCorregido?: string | null;
  resultadoConfirmado?: string | null;
}

export const aplicarValidacionFse = (base: OrientacionFse, validacion: ValidacionFse): OrientacionFse => {
  const asignado = validacion.resultadoAsignado ?? validacion.resultadoCorregido;
  const orientacion = asignado ? {
    ...base,
    principal: asignado,
    concurrentes: base.principal === asignado ? base.concurrentes
      : [base.principal, ...base.concurrentes.filter((cuerpo) => cuerpo !== asignado)],
    criterio: "Resultado actualizado con la última validación registrada para este código postal.",
  } : base;
  return validacion.resultadoConfirmado === orientacion.principal
    ? { ...orientacion, confianza: "alta", criterio: "Resultado confirmado previamente como correcto por un operador." }
    : orientacion;
};

