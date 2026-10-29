import { ContextoPagina, responderJson } from "../_utilidades";

const texto = (valor: unknown, maximo: number) => typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
const colorValido = (valor: string) => /^#[0-9a-f]{6}$/i.test(valor);
const idValido = (valor: unknown) => Number.isInteger(Number(valor)) && Number(valor) > 0;
const urlValida = (valor: string) => /^\/[a-zA-Z0-9/_?=&%-]*$/.test(valor) || /^https?:\/\/[^\s]+$/i.test(valor);
const visible = (valor: unknown) => valor === true || valor === 1 || valor === "1";

const leerEnlace = (datos: Record<string, unknown>) => {
  const enlace = {
    nombre: texto(datos.nombre, 38), url: texto(datos.url, 500),
    color_fondo: texto(datos.color_fondo, 7) || "#087ead",
    color_texto: texto(datos.color_texto, 7) || "#ffffff",
    visible: visible(datos.visible),
  };
  return enlace.nombre && urlValida(enlace.url) && colorValido(enlace.color_fondo) && colorValido(enlace.color_texto) ? enlace : null;
};

/** Administración de los botones de acceso de portada. */
export const onRequest = async (contexto: ContextoPagina) => {
  const db = contexto.env.CONTENIDO_DB;
  const metodo = contexto.request.method.toUpperCase();
  if (metodo === "GET") {
    const resultado = await db.prepare("SELECT * FROM enlaces_portada ORDER BY orden ASC, id ASC").all();
    return responderJson({ enlaces: resultado.results ?? [] });
  }
  let datos: Record<string, unknown>;
  try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
  if (metodo === "POST") {
    const enlace = leerEnlace(datos);
    if (!enlace) return responderJson({ error: "Revisa el nombre, la dirección y los colores del botón." }, 400);
    await db.prepare(
      "INSERT INTO enlaces_portada(nombre,url,color_fondo,color_texto,visible,orden,actualizado_en) VALUES(?,?,?,?,?,COALESCE((SELECT MAX(orden)+1 FROM enlaces_portada),0),unixepoch())"
    ).bind(enlace.nombre, enlace.url, enlace.color_fondo, enlace.color_texto, enlace.visible ? 1 : 0).run();
    return responderJson({ guardado: true }, 201);
  }
  if (metodo === "PATCH") {
    if (!idValido(datos.id)) return responderJson({ error: "El enlace no es válido." }, 400);
    const enlace = leerEnlace(datos);
    if (!enlace) return responderJson({ error: "Revisa el nombre, la dirección y los colores del botón." }, 400);
    await db.prepare("UPDATE enlaces_portada SET nombre=?,url=?,color_fondo=?,color_texto=?,visible=?,actualizado_en=unixepoch() WHERE id=?")
      .bind(enlace.nombre, enlace.url, enlace.color_fondo, enlace.color_texto, enlace.visible ? 1 : 0, Number(datos.id)).run();
    return responderJson({ guardado: true });
  }
  if (metodo === "DELETE") {
    if (!idValido(datos.id)) return responderJson({ error: "El enlace no es válido." }, 400);
    await db.prepare("DELETE FROM enlaces_portada WHERE id=?").bind(Number(datos.id)).run();
    return responderJson({ eliminado: true });
  }
  return responderJson({ error: "Método no permitido." }, 405);
};
