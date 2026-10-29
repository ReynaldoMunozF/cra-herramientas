import React from "react";

interface Enlace { id: number; nombre: string; url: string; color_fondo: string; color_texto: string; visible: number; }
type Borrador = Omit<Enlace, "id"> & { id?: number };
const vacio = (): Borrador => ({ nombre: "", url: "", color_fondo: "#087ead", color_texto: "#ffffff", visible: 1 });

/** Editor de accesos visibles encima de la portada. */
export const PanelEnlacesPortada: React.FC = () => {
  const [enlaces, establecerEnlaces] = React.useState<Enlace[]>([]);
  const [borrador, establecerBorrador] = React.useState<Borrador>(vacio());
  const [cargando, establecerCargando] = React.useState(true);
  const [guardando, establecerGuardando] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");
  const cargar = React.useCallback(async () => {
    establecerCargando(true);
    try { const respuesta = await fetch("/api/administracion/enlaces-portada", { credentials: "same-origin", cache: "no-store" }); if (!respuesta.ok) throw new Error(); const datos = await respuesta.json() as { enlaces?: Enlace[] }; establecerEnlaces(datos.enlaces ?? []); }
    catch { establecerMensaje("No se pudieron cargar los accesos de portada."); }
    finally { establecerCargando(false); }
  }, []);
  React.useEffect(() => { cargar(); }, [cargar]);
  const cambiar = (campo: keyof Borrador, valor: string | number) => establecerBorrador((actual) => ({ ...actual, [campo]: valor }));
  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault(); establecerGuardando(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/enlaces-portada", { method: borrador.id ? "PATCH" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(borrador) });
      const datos = await respuesta.json() as { error?: string }; if (!respuesta.ok) throw new Error(datos.error);
      establecerBorrador(vacio()); establecerMensaje(borrador.id ? "Botón actualizado." : "Botón publicado en la parte superior de la portada."); await cargar();
    } catch (error) { establecerMensaje(error instanceof Error && error.message ? error.message : "No se pudo guardar el botón."); }
    finally { establecerGuardando(false); }
  };
  const eliminar = async (id: number) => {
    if (!window.confirm("¿Eliminar este acceso de la portada?")) return;
    establecerGuardando(true); establecerMensaje("");
    try { const respuesta = await fetch("/api/administracion/enlaces-portada", { method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (!respuesta.ok) throw new Error(); establecerMensaje("Acceso eliminado."); await cargar(); }
    catch { establecerMensaje("No se pudo eliminar el acceso."); }
    finally { establecerGuardando(false); }
  };
  return <section className="panel-enlaces-portada">
    <header><span>ENLACES DE INTERÉS · PORTADA</span><h2>Botones de aplicaciones y enlaces</h2><p>Añade los accesos que necesites. Se mostrarán juntos encima de la portada y se adaptarán a móvil automáticamente.</p></header>
    {mensaje && <p className="panel-enlaces-mensaje" role="status">{mensaje}</p>}
    <div className="panel-enlaces-cuerpo">
      <form onSubmit={guardar}><div className="panel-enlaces-titulo"><h3>{borrador.id ? "Editar botón" : "Crear botón"}</h3>{borrador.id && <button type="button" onClick={() => establecerBorrador(vacio())}>Cancelar edición</button>}</div><label>Nombre del botón<input value={borrador.nombre} maxLength={38} onChange={(e) => cambiar("nombre", e.target.value)} placeholder="Ej. Manual de alarmas" required /></label><label>Destino<input value={borrador.url} maxLength={500} onChange={(e) => cambiar("url", e.target.value)} placeholder="https://... o /ruta-interna" required /><small>Admite una dirección web o una ruta interna, por ejemplo <b>/zona-descanso</b>.</small></label><div className="panel-enlaces-colores"><label>Color de fondo<input type="color" value={borrador.color_fondo} onChange={(e) => cambiar("color_fondo", e.target.value)} /></label><label>Color del texto<input type="color" value={borrador.color_texto} onChange={(e) => cambiar("color_texto", e.target.value)} /></label></div><label className="interruptor-enlace"><input type="checkbox" checked={Boolean(borrador.visible)} onChange={(e) => cambiar("visible", e.target.checked ? 1 : 0)} /><i /><span><b>Visible en la portada</b><small>Si lo desactivas quedará guardado, pero oculto.</small></span></label><button className="boton-enlace-guardar" type="submit" disabled={guardando || !borrador.nombre.trim() || !borrador.url.trim()}>{guardando ? "Guardando…" : borrador.id ? "Guardar cambios" : "Añadir botón"}</button></form>
      <aside className="panel-enlaces-vista"><small>PREVISUALIZACIÓN</small><p>Así se verá en la parte superior:</p><div><span style={{ backgroundColor: borrador.color_fondo, color: borrador.color_texto }}><i aria-hidden="true">↗</i>{borrador.nombre || "Nombre del botón"}</span></div></aside>
    </div>
    <section className="lista-enlaces-admin"><h3>Botones creados <small>{enlaces.length}</small></h3>{cargando ? <p>Cargando accesos…</p> : !enlaces.length ? <p>Aún no has creado ningún botón.</p> : enlaces.map((enlace) => <article key={enlace.id}><span style={{ backgroundColor: enlace.color_fondo, color: enlace.color_texto }}>↗ {enlace.nombre}</span><div><b>{enlace.visible ? "Visible" : "Oculto"}</b><small>{enlace.url}</small></div><footer><button type="button" onClick={() => { establecerBorrador({ ...enlace }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button type="button" onClick={() => eliminar(enlace.id)} disabled={guardando}>Eliminar</button></footer></article>)}</section>
  </section>;
};
