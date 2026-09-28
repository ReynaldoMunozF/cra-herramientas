import { ContextoPagina } from "../_utilidades";

/** Los archivos permanecen privados: exige una sesión CRA antes de leer R2. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  if (!contexto.data?.rol) return new Response("No autorizado", { status: 401 });
  const clave = Array.isArray(contexto.params.clave) ? contexto.params.clave.join("/") : contexto.params.clave;
  if (!clave || !/^(eventos|libros)\/[a-z0-9-]+\.(pdf|png|jpe?g|webp)$/i.test(clave)) return new Response("No encontrado", { status: 404 });
  const objeto = await contexto.env.MEDIA_PRIVADA.get(clave);
  if (!objeto) return new Response("No encontrado", { status: 404 });
  const cabeceras = new Headers({ "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" });
  objeto.writeHttpMetadata(cabeceras);
  return new Response(objeto.body, { headers: cabeceras });
};
