import { ResultadoTeo, SesionTeoError } from "./teo";
export const cuerposValidacionFseTeo = ["Policía Nacional", "Guardia Civil", "Mossos d’Esquadra", "Ertzaintza", "Policía Foral de Navarra", "Otro / requiere revisión"];
/** Comparte el registro de validaciones de la herramienta FSE existente. */
export const guardarValidacionFseTeo = async (codigoPostal: string, resultado: ResultadoTeo, esCorrecto: boolean, cuerpoCorregido: string, signal: AbortSignal): Promise<ResultadoTeo> => {
  if (!/^\d{5}$/.test(codigoPostal) || !resultado.ubicacion.nombre) throw new Error("Vuelve a consultar el código postal antes de validar.");
  if (!esCorrecto && (!cuerposValidacionFseTeo.includes(cuerpoCorregido) || cuerpoCorregido === resultado.orientacion.principal)) throw new Error("Selecciona una FSE distinta a la mostrada.");
  const respuesta = await fetch("/api/validaciones-fse", {
    method: "POST", credentials: "same-origin", signal,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ codigoPostal, municipio: resultado.ubicacion.nombre, provincia: resultado.ubicacion.provincia || "", resultadoMostrado: resultado.orientacion.principal, esCorrecto, resultadoCorregido: esCorrecto ? "" : cuerpoCorregido }),
  });
  if ([401,403].includes(respuesta.status) || (respuesta.headers.get("Content-Type") ?? "").includes("text/html")) throw new SesionTeoError("La sesión de administrador ha caducado.");
  const datos = await respuesta.json().catch(() => null) as { guardado?: boolean; error?: string } | null;
  if (!respuesta.ok || datos?.guardado !== true) throw new Error(datos?.error || "No se pudo guardar la validación. Inténtalo de nuevo.");
  const base = resultado.orientacion;
  return { ...resultado, validacionDisponible: true, orientacion: esCorrecto ? {
    ...base, confianza: "alta", criterio: "Resultado confirmado como correcto por el operador.",
  } : {
    ...base, principal: cuerpoCorregido, confianza: base.confianza === "alta" ? "media" : base.confianza,
    concurrentes: [base.principal, ...base.concurrentes.filter(c => c !== cuerpoCorregido && c !== base.principal)],
    criterio: "Resultado corregido por el operador durante esta consulta.",
  } };
};
