import { ContextoPagina, responderJson } from "../_utilidades";

const texto = (valor: unknown, maximo: number) => typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
const idValido = (valor: unknown) => Number.isInteger(Number(valor)) && Number(valor) > 0;
const colorValido = (valor: string) => /^#[0-9a-f]{6}$/i.test(valor);
const urlValida = (valor: string) => !valor || /^https:\/\/[^\s]+$/i.test(valor);
const fechaValida = (valor: string) => !valor || /^\d{4}-\d{2}-\d{2}$/.test(valor);
const horaValida = (valor: string) => !valor || /^\d{2}:\d{2}$/.test(valor);
const visible = (valor: unknown) => valor === true || valor === 1 || valor === "1";

const leerEvento = (datos: Record<string, unknown>) => {
  const evento = {
    titulo: texto(datos.titulo, 100), tipo: texto(datos.tipo, 35) || "Aviso",
    descripcion: texto(datos.descripcion, 600), fecha: texto(datos.fecha, 10),
    hora_inicio: texto(datos.hora_inicio, 5), hora_fin: texto(datos.hora_fin, 5),
    color: texto(datos.color, 7) || "#087ead", enlace: texto(datos.enlace, 300), visible: visible(datos.visible),
  };
  return evento.titulo && colorValido(evento.color) && urlValida(evento.enlace)
    && fechaValida(evento.fecha) && horaValida(evento.hora_inicio) && horaValida(evento.hora_fin) ? evento : null;
};

const leerPublicidad = (datos: Record<string, unknown>) => {
  const publicidad = {
    etiqueta: texto(datos.etiqueta, 40) || "Recomendado", titulo: texto(datos.titulo, 100),
    descripcion: texto(datos.descripcion, 500), texto_boton: texto(datos.texto_boton, 40),
    enlace: texto(datos.enlace, 300), imagen_url: texto(datos.imagen_url, 500),
    color_fondo: texto(datos.color_fondo, 7) || "#fff8df", color_acento: texto(datos.color_acento, 7) || "#f0ad00",
    visible: visible(datos.visible),
  };
  return colorValido(publicidad.color_fondo) && colorValido(publicidad.color_acento)
    && urlValida(publicidad.enlace) && urlValida(publicidad.imagen_url) ? publicidad : null;
};

/** CRUD reservado al administrador mediante functions/_middleware.ts. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  const base = contexto.env.CONTENIDO_DB;

  if (metodo === "GET") {
    const [eventos, publicidad] = await Promise.all([
      base.prepare("SELECT * FROM tablon_eventos ORDER BY orden ASC, id DESC").all(),
      base.prepare("SELECT * FROM publicidad_inicio WHERE id = 1").first(),
    ]);
    return responderJson({ eventos: eventos.results ?? [], publicidad });
  }

  let datos: Record<string, unknown>;
  try { datos = await contexto.request.json() as Record<string, unknown>; }
  catch { return responderJson({ error: "Datos no válidos." }, 400); }

  if (datos.recurso === "publicidad" && (metodo === "PUT" || metodo === "PATCH")) {
    const publicidad = leerPublicidad(datos);
    if (!publicidad) return responderJson({ error: "Revisa los colores y los enlaces de la publicidad." }, 400);
    await base.prepare(
      `UPDATE publicidad_inicio SET etiqueta=?, titulo=?, descripcion=?, texto_boton=?, enlace=?, imagen_url=?, color_fondo=?, color_acento=?, visible=?, actualizado_en=unixepoch() WHERE id=1`
    ).bind(publicidad.etiqueta, publicidad.titulo, publicidad.descripcion, publicidad.texto_boton, publicidad.enlace, publicidad.imagen_url, publicidad.color_fondo, publicidad.color_acento, publicidad.visible ? 1 : 0).run();
    return responderJson({ guardado: true });
  }

  if (datos.recurso !== "evento") return responderJson({ error: "Recurso no válido." }, 400);
  if (metodo === "POST") {
    const evento = leerEvento(datos);
    if (!evento) return responderJson({ error: "Revisa los datos del evento." }, 400);
    await base.prepare(
      `INSERT INTO tablon_eventos (titulo,tipo,descripcion,fecha,hora_inicio,hora_fin,color,enlace,visible,orden,actualizado_en)
       VALUES (?,?,?,?,?,?,?,?,?,COALESCE((SELECT MAX(orden)+1 FROM tablon_eventos),0),unixepoch())`
    ).bind(evento.titulo, evento.tipo, evento.descripcion, evento.fecha, evento.hora_inicio, evento.hora_fin, evento.color, evento.enlace, evento.visible ? 1 : 0).run();
    return responderJson({ guardado: true }, 201);
  }
  if (metodo === "PATCH") {
    if (!idValido(datos.id)) return responderJson({ error: "Evento no válido." }, 400);
    const evento = leerEvento(datos);
    if (!evento) return responderJson({ error: "Revisa los datos del evento." }, 400);
    await base.prepare(
      `UPDATE tablon_eventos SET titulo=?,tipo=?,descripcion=?,fecha=?,hora_inicio=?,hora_fin=?,color=?,enlace=?,visible=?,actualizado_en=unixepoch() WHERE id=?`
    ).bind(evento.titulo, evento.tipo, evento.descripcion, evento.fecha, evento.hora_inicio, evento.hora_fin, evento.color, evento.enlace, evento.visible ? 1 : 0, Number(datos.id)).run();
    return responderJson({ guardado: true });
  }
  if (metodo === "DELETE") {
    if (!idValido(datos.id)) return responderJson({ error: "Evento no válido." }, 400);
    await base.prepare("DELETE FROM tablon_eventos WHERE id=?").bind(Number(datos.id)).run();
    return responderJson({ eliminado: true });
  }
  return responderJson({ error: "Método no permitido." }, 405);
};
