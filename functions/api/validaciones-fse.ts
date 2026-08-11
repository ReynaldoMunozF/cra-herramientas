import { ContextoPagina, responderJson } from "./_utilidades";

/** Valores cerrados para evitar que se guarde texto arbitrario en la base de datos. */
const cuerposPermitidos = new Set([
  "Policía Nacional",
  "Guardia Civil",
  "Mossos d’Esquadra",
  "Ertzaintza",
  "Policía Foral de Navarra",
  "Otro / requiere revisión",
]);

/** Devuelve la última validación registrada para un código postal. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const codigoPostal = new URL(contexto.request.url).searchParams.get("codigoPostal")?.trim() || "";
  if (!/^\d{5}$/.test(codigoPostal)) {
    return responderJson({ error: "Código postal no válido." }, 400);
  }

  const validacion = await contexto.env.CONTENIDO_DB
    .prepare(`
      SELECT
        resultado_mostrado AS resultadoMostrado,
        es_correcto AS esCorrecto,
        resultado_corregido AS resultadoCorregido
      FROM validaciones_fse
      WHERE codigo_postal = ?
      ORDER BY id DESC
      LIMIT 1
    `)
    .bind(codigoPostal)
    .first<{ resultadoMostrado: string; esCorrecto: number; resultadoCorregido: string | null }>();

  // Una confirmación posterior debe conservar el cuerpo que se estaba mostrando.
  // Antes solo se recuperaba resultado_corregido, por lo que confirmar una
  // corrección creaba una fila nueva sin ese campo y reaparecía el cálculo base.
  const resultadoAsignado = validacion?.esCorrecto === 1
    ? validacion.resultadoMostrado
    : validacion?.resultadoCorregido;

  return responderJson({
    resultadoAsignado: resultadoAsignado && cuerposPermitidos.has(resultadoAsignado)
      ? resultadoAsignado
      : null,
    resultadoCorregido: validacion?.resultadoCorregido && cuerposPermitidos.has(validacion.resultadoCorregido)
      ? validacion.resultadoCorregido
      : null,
    resultadoConfirmado: validacion?.esCorrecto === 1 && cuerposPermitidos.has(validacion.resultadoMostrado)
      ? validacion.resultadoMostrado
      : null,
  });
};

/**
 * Registra si la orientación FSE fue útil y, cuando no lo fue, la corrección.
 * La petición no contiene ningún identificador personal del operador.
 */
export const onRequestPost = async (contexto: ContextoPagina) => {
  let datos: {
    codigoPostal?: unknown;
    municipio?: unknown;
    provincia?: unknown;
    resultadoMostrado?: unknown;
    esCorrecto?: unknown;
    resultadoCorregido?: unknown;
  };

  try {
    datos = await contexto.request.json();
  } catch {
    return responderJson({ error: "Datos no válidos." }, 400);
  }

  const codigoPostal = typeof datos.codigoPostal === "string" ? datos.codigoPostal.trim() : "";
  const municipio = typeof datos.municipio === "string" ? datos.municipio.trim().slice(0, 120) : "";
  const provincia = typeof datos.provincia === "string" ? datos.provincia.trim().slice(0, 120) : "";
  const resultadoMostrado = typeof datos.resultadoMostrado === "string" ? datos.resultadoMostrado.trim() : "";
  const resultadoCorregido = typeof datos.resultadoCorregido === "string" ? datos.resultadoCorregido.trim() : "";

  if (!/^\d{5}$/.test(codigoPostal) || !municipio || !cuerposPermitidos.has(resultadoMostrado)) {
    return responderJson({ error: "La consulta que se intenta validar no es válida." }, 400);
  }
  if (typeof datos.esCorrecto !== "boolean") {
    return responderJson({ error: "Indica si el resultado es correcto." }, 400);
  }
  if (!datos.esCorrecto && (!cuerposPermitidos.has(resultadoCorregido) || resultadoCorregido === resultadoMostrado)) {
    return responderJson({ error: "Selecciona una fuerza distinta a la mostrada." }, 400);
  }

  await contexto.env.CONTENIDO_DB
    .prepare(`
      INSERT INTO validaciones_fse
        (codigo_postal, municipio, provincia, resultado_mostrado, es_correcto, resultado_corregido)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      codigoPostal,
      municipio,
      provincia || null,
      resultadoMostrado,
      datos.esCorrecto ? 1 : 0,
      datos.esCorrecto ? null : resultadoCorregido,
    )
    .run();

  return responderJson({ guardado: true }, 201);
};
