import { ContextoPagina, responderJson } from "../../api/_utilidades";

type ContextoManual = ContextoPagina & { next: () => Promise<Response> };
/** Defensa en profundidad: ni el catálogo ni sus imágenes se sirven a otros roles. */
const onRequestGet = async (contexto: ContextoManual) => {
  if (contexto.data?.rol !== "administrador") return responderJson({ error: "Acceso reservado al administrador." }, 403);
  const valor = contexto.params.archivo;
  const archivo = Array.isArray(valor) ? valor.join("/") : valor;
  const pagina = /^imagenes\/pagina-(\d{3})\.jpg$/.exec(archivo ?? "");
  const tipo = archivo === "catalogo.json" ? "application/json"
    : archivo === "manual.pdf" ? "application/pdf"
    : pagina && Number(pagina[1]) >= 1 && Number(pagina[1]) <= 142 ? "image/jpeg" : null;
  if (!tipo) return responderJson({ error: "Recurso no encontrado." }, 404);
  const clave = `teo/manual-2025-revision-v1/${archivo}`;
  const headers = { "Content-Type": tipo, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  // El bucket es privado y el endpoint general /api/media no permite estas claves.
  // Conservar la primera copia consultada evita perder las revisiones en futuros builds.
  try {
    const guardado = await contexto.env.MEDIA_PRIVADA.get(clave);
    if (guardado) return new Response(guardado.body, { headers });
  } catch { /* La copia de este despliegue sigue protegida por el middleware. */ }
  const respuesta = await contexto.next();
  if (!respuesta.ok || !(respuesta.headers.get("Content-Type") ?? "").includes(tipo)) {
    return responderJson({ error: "Este recurso del manual todavía no está disponible en este despliegue." }, 503);
  }
  try {
    if (respuesta.status === 200 && contexto.request.method === "GET") await contexto.env.MEDIA_PRIVADA.put(clave, await respuesta.clone().arrayBuffer(), { httpMetadata: { contentType: tipo } });
  } catch { /* Un fallo de almacenamiento no impide revisar la copia del despliegue. */ }
  const finales = new Headers(respuesta.headers);
  Object.entries(headers).forEach(([k,v]) => finales.set(k,v));
  return new Response(respuesta.body, { status: respuesta.status, headers: finales });
};

export const onRequest = async (contexto: ContextoManual) => {
  if (contexto.data?.rol !== "administrador") return responderJson({ error: "Acceso reservado al administrador." }, 403);
  if (!["GET", "HEAD"].includes(contexto.request.method)) return responderJson({ error: "Método no permitido." }, 405);
  const respuesta = await onRequestGet(contexto);
  return contexto.request.method === "HEAD" ? new Response(null, respuesta) : respuesta;
};
