/** Datos postales normalizados por la API interna respaldada por CartoCiudad. */
export interface LocalizacionPostal {
  nombre: string;
  comunidad?: string;
  provincia?: string;
  latitud: number;
  longitud: number;
  fuente?: string;
}

/** Resuelve el código en el servidor para evitar proveedores postales en el navegador. */
export const localizarCodigoPostal = async (codigoPostal: string): Promise<LocalizacionPostal> => {
  if (!/^\d{5}$/.test(codigoPostal)) throw new Error("Código postal español no válido.");
  const respuesta = await fetch(`/api/codigo-postal?codigoPostal=${encodeURIComponent(codigoPostal)}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const texto = await respuesta.text();
  let datos: Partial<LocalizacionPostal> & { error?: string };
  try {
    datos = JSON.parse(texto) as Partial<LocalizacionPostal> & { error?: string };
  } catch {
    throw new Error(
      respuesta.ok
        ? "El servidor devolvió una respuesta no válida. Reinicia la sesión local."
        : `Error postal del servidor (${respuesta.status}). Revisa la terminal de Wrangler.`,
    );
  }
  if (!respuesta.ok) throw new Error(datos.error || "No se pudo validar el código postal.");
  if (!datos.nombre || typeof datos.latitud !== "number" || typeof datos.longitud !== "number") {
    throw new Error("La fuente postal devolvió datos incompletos.");
  }
  return datos as LocalizacionPostal;
};
