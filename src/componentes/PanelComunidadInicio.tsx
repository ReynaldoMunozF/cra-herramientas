import React from "react";

type Evento = { id: number; titulo: string; tipo: string; descripcion: string; fecha: string; hora_inicio: string; hora_fin: string; color: string; enlace: string; visible: number };
type Publicidad = { etiqueta: string; titulo: string; descripcion: string; texto_boton: string; enlace: string; imagen_url: string; color_fondo: string; color_acento: string; visible: number };

const eventoVacio = (): Omit<Evento, "id"> => ({ titulo: "", tipo: "Mini evento", descripcion: "", fecha: "", hora_inicio: "", hora_fin: "", color: "#087ead", enlace: "", visible: 1 });
const publicidadVacia = (): Publicidad => ({ etiqueta: "Recomendado", titulo: "", descripcion: "", texto_boton: "Ver más", enlace: "", imagen_url: "", color_fondo: "#fff8df", color_acento: "#f0ad00", visible: 0 });

export const PanelComunidadInicio: React.FC = () => {
  const [pestana, establecerPestana] = React.useState<"eventos" | "publicidad">("eventos");
  const [eventos, establecerEventos] = React.useState<Evento[]>([]);
  const [evento, establecerEvento] = React.useState<Omit<Evento, "id"> & { id?: number }>(eventoVacio());
  const [publicidad, establecerPublicidad] = React.useState<Publicidad>(publicidadVacia());
  const [cargando, establecerCargando] = React.useState(true);
  const [guardando, establecerGuardando] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");

  const cargar = React.useCallback(async () => {
    establecerCargando(true);
    try {
      const respuesta = await fetch("/api/administracion/inicio-comunidad", { credentials: "same-origin", cache: "no-store" });
      if (!respuesta.ok) throw new Error();
      const datos = await respuesta.json() as { eventos?: Evento[]; publicidad?: Publicidad | null };
      establecerEventos(datos.eventos ?? []);
      establecerPublicidad(datos.publicidad ? { ...publicidadVacia(), ...datos.publicidad } : publicidadVacia());
    } catch { establecerMensaje("No se pudo cargar la configuración."); }
    finally { establecerCargando(false); }
  }, []);

  React.useEffect(() => { cargar(); }, [cargar]);
  const cambiarEvento = (campo: keyof Omit<Evento, "id">, valor: string | number) => establecerEvento((actual) => ({ ...actual, [campo]: valor }));
  const cambiarPublicidad = (campo: keyof Publicidad, valor: string | number) => establecerPublicidad((actual) => ({ ...actual, [campo]: valor }));

  const guardarEvento = async (e: React.FormEvent) => {
    e.preventDefault(); establecerGuardando(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/inicio-comunidad", { method: evento.id ? "PATCH" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recurso: "evento", ...evento }) });
      const datos = await respuesta.json() as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error);
      establecerEvento(eventoVacio()); establecerMensaje("Evento guardado y listo para publicarse en la portada."); await cargar();
    } catch (error) { establecerMensaje(error instanceof Error && error.message ? error.message : "No se pudo guardar el evento."); }
    finally { establecerGuardando(false); }
  };
  const editarEvento = (item: Evento) => { establecerEvento({ ...item }); establecerPestana("eventos"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const eliminarEvento = async (id: number) => {
    if (!window.confirm("¿Eliminar este mini evento? Esta acción no se puede deshacer.")) return;
    establecerGuardando(true); establecerMensaje("");
    try { const respuesta = await fetch("/api/administracion/inicio-comunidad", { method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recurso: "evento", id }) }); if (!respuesta.ok) throw new Error(); establecerMensaje("Evento eliminado."); await cargar(); }
    catch { establecerMensaje("No se pudo eliminar el evento."); }
    finally { establecerGuardando(false); }
  };
  const guardarPublicidad = async (e: React.FormEvent) => {
    e.preventDefault(); establecerGuardando(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/inicio-comunidad", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recurso: "publicidad", ...publicidad }) });
      const datos = await respuesta.json() as { error?: string }; if (!respuesta.ok) throw new Error(datos.error);
      establecerMensaje("Espacio recomendado actualizado.");
    } catch (error) { establecerMensaje(error instanceof Error && error.message ? error.message : "No se pudo guardar la publicidad."); }
    finally { establecerGuardando(false); }
  };

  return <section className="panel-comunidad-admin">
    <header><span>Portada pública</span><h2>Tablón y espacio recomendado</h2><p>Solo tú editas este contenido. Los operadores solo verán aquello que marques como visible.</p></header>
    <div className="panel-comunidad-pestanas"><button className={pestana === "eventos" ? "activa" : ""} onClick={() => establecerPestana("eventos")} type="button">📌 Mini eventos</button><button className={pestana === "publicidad" ? "activa" : ""} onClick={() => establecerPestana("publicidad")} type="button">✦ Espacio recomendado</button></div>
    {mensaje && <p className="panel-comunidad-mensaje" aria-live="polite">{mensaje}</p>}
    {cargando ? <p className="panel-comunidad-cargando">Cargando configuración…</p> : pestana === "eventos" ? <div className="panel-comunidad-cuerpo">
      <form className="formulario-comunidad" onSubmit={guardarEvento}>
        <div className="formulario-comunidad-titulo"><h3>{evento.id ? "Editar mini evento" : "Crear mini evento"}</h3>{evento.id && <button type="button" onClick={() => establecerEvento(eventoVacio())}>Cancelar edición</button>}</div>
        <label>Título<input value={evento.titulo} maxLength={100} onChange={(e) => cambiarEvento("titulo", e.target.value)} placeholder="Ej. Reto relámpago de hoy" required /></label>
        <div className="formulario-comunidad-dos"><label>Tipo<select value={evento.tipo} onChange={(e) => cambiarEvento("tipo", e.target.value)}><option>Mini evento</option><option>Aviso</option><option>Recordatorio</option><option>Formación</option><option>Torneo</option><option>Celebración</option></select></label><label>Color identificativo<input type="color" value={evento.color} onChange={(e) => cambiarEvento("color", e.target.value)} /></label></div>
        <label>Descripción<textarea value={evento.descripcion} maxLength={600} onChange={(e) => cambiarEvento("descripcion", e.target.value)} placeholder="Qué se va a hacer, para quién y cualquier indicación útil." /></label>
        <div className="formulario-comunidad-tres"><label>Fecha<input type="date" value={evento.fecha} onChange={(e) => cambiarEvento("fecha", e.target.value)} /></label><label>Inicio<input type="time" value={evento.hora_inicio} onChange={(e) => cambiarEvento("hora_inicio", e.target.value)} /></label><label>Fin<input type="time" value={evento.hora_fin} onChange={(e) => cambiarEvento("hora_fin", e.target.value)} /></label></div>
        <label>Enlace opcional<input type="url" value={evento.enlace} maxLength={300} onChange={(e) => cambiarEvento("enlace", e.target.value)} placeholder="https://..." /></label>
        <label className="interruptor-comunidad"><input type="checkbox" checked={Boolean(evento.visible)} onChange={(e) => cambiarEvento("visible", e.target.checked ? 1 : 0)} /><i /><span><b>Visible en la portada</b><small>Puedes prepararlo sin que nadie lo vea todavía.</small></span></label>
        <button className="boton-comunidad-guardar" disabled={guardando || !evento.titulo.trim()} type="submit">{guardando ? "Guardando…" : evento.id ? "Guardar cambios" : "Publicar evento"}</button>
      </form>
      <aside className="lista-eventos-admin"><h3>Eventos creados <small>{eventos.length}</small></h3>{!eventos.length ? <p>Aún no has creado ningún mini evento.</p> : eventos.map((item) => <article key={item.id} style={{ borderLeftColor: item.color }}><div><span>{item.tipo} · {item.visible ? "Visible" : "Oculto"}</span><strong>{item.titulo}</strong><small>{item.fecha || "Sin fecha"}{item.hora_inicio ? ` · ${item.hora_inicio}${item.hora_fin ? `–${item.hora_fin}` : ""}` : ""}</small></div><footer><button onClick={() => editarEvento(item)} type="button">Editar</button><button onClick={() => eliminarEvento(item.id)} type="button" disabled={guardando}>Eliminar</button></footer></article>)}</aside>
    </div> : <form className="formulario-comunidad formulario-publicidad" onSubmit={guardarPublicidad}>
      <h3>Configurar el espacio recomendado</h3><p>Es una sola tarjeta en portada. Puedes actualizarla tantas veces como quieras o dejarla oculta.</p>
      <div className="formulario-comunidad-dos"><label>Etiqueta<input value={publicidad.etiqueta} maxLength={40} onChange={(e) => cambiarPublicidad("etiqueta", e.target.value)} placeholder="Ej. Recomendado" /></label><label>Texto del botón<input value={publicidad.texto_boton} maxLength={40} onChange={(e) => cambiarPublicidad("texto_boton", e.target.value)} placeholder="Ej. Ver más" /></label></div>
      <label>Título<input value={publicidad.titulo} maxLength={100} onChange={(e) => cambiarPublicidad("titulo", e.target.value)} placeholder="Nombre de tu emprendimiento" /></label><label>Descripción<textarea value={publicidad.descripcion} maxLength={500} onChange={(e) => cambiarPublicidad("descripcion", e.target.value)} placeholder="Qué quieres comunicar y por qué puede interesar al equipo." /></label>
      <div className="formulario-comunidad-dos"><label>Enlace del botón<input type="url" value={publicidad.enlace} maxLength={300} onChange={(e) => cambiarPublicidad("enlace", e.target.value)} placeholder="https://..." /></label><label>URL de imagen opcional<input type="url" value={publicidad.imagen_url} maxLength={500} onChange={(e) => cambiarPublicidad("imagen_url", e.target.value)} placeholder="https://.../imagen.jpg" /></label></div>
      <div className="formulario-comunidad-dos"><label>Color de fondo<input type="color" value={publicidad.color_fondo} onChange={(e) => cambiarPublicidad("color_fondo", e.target.value)} /></label><label>Color de acento<input type="color" value={publicidad.color_acento} onChange={(e) => cambiarPublicidad("color_acento", e.target.value)} /></label></div>
      <label className="interruptor-comunidad"><input type="checkbox" checked={Boolean(publicidad.visible)} onChange={(e) => cambiarPublicidad("visible", e.target.checked ? 1 : 0)} /><i /><span><b>Mostrar en la portada</b><small>Si está apagado, no se verá ningún anuncio.</small></span></label><button className="boton-comunidad-guardar" disabled={guardando} type="submit">{guardando ? "Guardando…" : "Guardar espacio recomendado"}</button>
    </form>}
  </section>;
};
