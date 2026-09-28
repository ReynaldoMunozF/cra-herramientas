import React from "react";

interface Evento { id: number; titulo: string; tipo: string; descripcion: string; fecha: string; hora_inicio: string; hora_fin: string; color: string; enlace: string; }
interface Publicidad { etiqueta: string; titulo: string; descripcion: string; texto_boton: string; enlace: string; imagen_url: string; color_fondo: string; color_acento: string; }

const fechaVisible = (fecha: string) => fecha ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(new Date(`${fecha}T12:00:00`)) : "Próximamente";

/** Muestra solo contenido publicado; se actualiza al volver a abrir la portada. */
export const ComunidadInicio: React.FC = () => {
  const [eventos, establecerEventos] = React.useState<Evento[]>([]);
  const [publicidad, establecerPublicidad] = React.useState<Publicidad | null>(null);
  React.useEffect(() => {
    fetch("/api/inicio-comunidad", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((datos: { eventos?: Evento[]; publicidad?: Publicidad | null } | null) => { if (datos) { establecerEventos(datos.eventos ?? []); establecerPublicidad(datos.publicidad ?? null); } })
      .catch(() => undefined);
  }, []);
  if (!publicidad && !eventos.length) return null;
  return <section className="inicio-comunidad" aria-label="Espacio recomendado y tablón de anuncios">
    {publicidad && <article className="inicio-recomendado" style={{ background: `linear-gradient(135deg, ${publicidad.color_fondo}, #fff)`, borderColor: publicidad.color_acento }}>
      <header><span aria-hidden="true">✦</span><strong>{publicidad.etiqueta}</strong></header>
      <div className="inicio-recomendado-ilustracion" style={{ color: publicidad.color_acento }}>{publicidad.imagen_url ? <img src={publicidad.imagen_url} alt="" /> : "✦"}</div>
      <div><h2>{publicidad.titulo}</h2><p>{publicidad.descripcion}</p>{publicidad.enlace && <a style={{ color: publicidad.color_acento }} href={publicidad.enlace} target="_blank" rel="noopener noreferrer">{publicidad.texto_boton || "Ver más"} →</a>}</div>
    </article>}
    {eventos.length > 0 && <article className="inicio-tablon"><header><span aria-hidden="true">📌</span><h2>Tablón</h2><small>Mini eventos</small></header><div className="inicio-tablon-lista">{eventos.map((evento) => <article key={evento.id} style={{ borderLeftColor: evento.color }}><time>{fechaVisible(evento.fecha)}{evento.hora_inicio ? ` · ${evento.hora_inicio}` : ""}</time><div><b>{evento.titulo}</b><small>{evento.tipo}</small>{evento.descripcion && <p>{evento.descripcion}</p>}{evento.enlace && <a href={evento.enlace} target="_blank" rel="noopener noreferrer">Más información →</a>}</div></article>)}</div></article>}
  </section>;
};
