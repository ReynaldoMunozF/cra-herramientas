import { ContextoPagina } from "../_utilidades";

/** Los archivos siguen siendo privados y esta ruta captura carpetas como libros/archivo.pdf. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  if (!contexto.data?.rol) return new Response("No autorizado", { status: 401 });
  const valor = contexto.params.clave;
  const clave = Array.isArray(valor) ? valor.join("/") : valor;
  if (!clave || !/^(eventos|libros)\/[a-z0-9-]+(?:-[a-z0-9-]+)?\.(pdf|png|jpe?g|webp)$/i.test(clave)) return new Response("No encontrado", { status: 404 });
  const rango = contexto.request.headers.get("Range");
  const objeto = await contexto.env.MEDIA_PRIVADA.get(clave, rango ? { range: contexto.request.headers } : undefined);
  if (!objeto) return new Response("No encontrado", { status: 404 });
  const cabeceras = new Headers({ "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes" });
  objeto.writeHttpMetadata(cabeceras);
  if (objeto.range) {
    cabeceras.set("Content-Range", `bytes ${objeto.range.offset}-${objeto.range.offset + objeto.range.length - 1}/${objeto.size}`);
    cabeceras.set("Content-Length", String(objeto.range.length));
    return new Response(objeto.body, { status: 206, headers: cabeceras });
  }
  cabeceras.set("Content-Length", String(objeto.size));
  return new Response(objeto.body, { headers: cabeceras });
};
