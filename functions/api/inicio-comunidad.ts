import { ContextoPagina, responderJson } from "./_utilidades";

interface EventoPublicado {
  id: number;
  titulo: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  color: string;
  enlace: string;
}

interface PublicidadInicio {
  etiqueta: string;
  titulo: string;
  descripcion: string;
  texto_boton: string;
  enlace: string;
  imagen_url: string;
  color_fondo: string;
  color_acento: string;
}

/** Contenido ligero de portada. Se consulta al abrirla, sin sondeo continuo. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const [eventosResultado, publicidad] = await Promise.all([
    contexto.env.CONTENIDO_DB.prepare(
      `SELECT id, titulo, tipo, descripcion, fecha, hora_inicio, hora_fin, color, enlace
       FROM tablon_eventos WHERE visible = 1
       ORDER BY CASE WHEN fecha = '' THEN 1 ELSE 0 END, fecha ASC, orden ASC, id DESC LIMIT 6`
    ).all<EventoPublicado>(),
    contexto.env.CONTENIDO_DB.prepare(
      `SELECT etiqueta, titulo, descripcion, texto_boton, enlace, imagen_url, color_fondo, color_acento
       FROM publicidad_inicio WHERE id = 1 AND visible = 1`
    ).first<PublicidadInicio>(),
  ]);
  return responderJson({ eventos: eventosResultado.results ?? [], publicidad });
};
