import { ContextoPagina, responderJson } from "./_utilidades";

/** Recibe sugerencias de usuarios autenticados sin exponer el panel administrativo. */
export const onRequestPost = async (contexto: ContextoPagina) => {
  let datos: { matricula?: unknown; pagina?: unknown; mensaje?: unknown };
  try {
    datos = await contexto.request.json();
  } catch {
    return responderJson({ error: "Datos no válidos." }, 400);
  }

  const matricula = typeof datos.matricula === "string"
    ? datos.matricula.trim().toUpperCase().slice(0, 12)
    : "";
  const pagina = typeof datos.pagina === "string" ? datos.pagina.slice(0, 160) : "/";
  const mensaje = typeof datos.mensaje === "string" ? datos.mensaje.trim() : "";
  if (mensaje.length < 5 || mensaje.length > 1500) {
    return responderJson({ error: "El mensaje debe tener entre 5 y 1500 caracteres." }, 400);
  }

  await contexto.env.CONTENIDO_DB
    .prepare("INSERT INTO feedback_usuarios (matricula, pagina, mensaje) VALUES (?, ?, ?)")
    .bind(matricula || null, pagina, mensaje)
    .run();
  return responderJson({ guardado: true }, 201);
};
