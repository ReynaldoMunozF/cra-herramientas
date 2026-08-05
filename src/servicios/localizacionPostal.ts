/** Datos normalizados de una ubicación obtenida a partir de un código postal. */
export interface LocalizacionPostal {
  nombre: string;
  comunidad?: string;
  provincia?: string;
  latitud: number;
  longitud: number;
}

/**
 * Resuelve códigos postales españoles usando primero un servicio postal específico.
 * Open-Meteo se conserva como alternativa por si el primer servicio no responde.
 */
export const localizarCodigoPostal = async (codigoPostal: string): Promise<LocalizacionPostal> => {
  try {
    const respuestaPostal = await fetch(`https://api.zippopotam.us/ES/${codigoPostal}`);
    if (respuestaPostal.ok) {
      const datosPostales = await respuestaPostal.json();
      const lugar = datosPostales.places?.[0];
      if (lugar) {
        return {
          nombre: lugar["place name"],
          comunidad: lugar.state,
          provincia: lugar.state,
          latitud: Number(lugar.latitude),
          longitud: Number(lugar.longitude),
        };
      }
    }
  } catch {
    // Continuamos con la fuente alternativa sin interrumpir la consulta.
  }

  const respuestaAlternativa = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${codigoPostal}&count=1&language=es&countryCode=ES&format=json`,
  );
  if (!respuestaAlternativa.ok) throw new Error("No se pudo consultar la ubicación.");
  const datosAlternativos = await respuestaAlternativa.json();
  const lugarAlternativo = datosAlternativos.results?.[0];
  if (!lugarAlternativo) throw new Error("Código postal no encontrado en España.");

  return {
    nombre: lugarAlternativo.name,
    comunidad: lugarAlternativo.admin1,
    provincia: lugarAlternativo.admin2,
    latitud: lugarAlternativo.latitude,
    longitud: lugarAlternativo.longitude,
  };
};
