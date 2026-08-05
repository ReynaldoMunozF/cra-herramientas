import React from "react";
import { Link } from "react-router-dom";
import { ModalidadRobo, OpcionFlujo, PasoFlujo } from "../manual/configuracionOperativas";
import { procesosConfigurables, procesosPorSlug } from "../manual/configuracionProcesos";
import { ContenidoProcesoEditable, VersionManualResumen } from "../manual/modeloContenido";
import { guardarBorradorProceso, obtenerAdministracionProceso, publicarBorradorProceso } from "../servicios/contenidoManual";

const clonarContenido = (contenido: ContenidoProcesoEditable): ContenidoProcesoEditable => JSON.parse(JSON.stringify(contenido));
/** Editor único para todos los procedimientos y sus comentarios frecuentes. */
export const PaginaAdministracionManual: React.FC = () => {
  const [procesoSeleccionado, establecerProcesoSeleccionado] = React.useState("robo");
  const procesoActual = procesosPorSlug[procesoSeleccionado];
  const [contenido, establecerContenido] = React.useState<ContenidoProcesoEditable>(() => clonarContenido(procesosPorSlug.robo.contenido));
  const [pasoSeleccionado, establecerPasoSeleccionado] = React.useState("mode");
  const [versiones, establecerVersiones] = React.useState<VersionManualResumen[]>([]);
  const [estado, establecerEstado] = React.useState<"cargando" | "listo" | "guardando" | "publicando">("cargando");
  const [mensaje, establecerMensaje] = React.useState("");
  const [error, establecerError] = React.useState("");

  const cargarDatos = React.useCallback(async (slug: string) => {
    establecerEstado("cargando"); establecerError("");
    try {
      const datos = await obtenerAdministracionProceso(slug);
      const contenidoDisponible = datos.borrador || datos.publicado || procesosPorSlug[slug].contenido;
      establecerContenido(clonarContenido(contenidoDisponible));
      establecerVersiones(datos.versiones);
      establecerPasoSeleccionado(contenidoDisponible.flujo.mode ? "mode" : Object.keys(contenidoDisponible.flujo)[0]);
    } catch (errorCarga) {
      establecerError(errorCarga instanceof Error ? errorCarga.message : "No se pudo cargar el editor.");
    } finally { establecerEstado("listo"); }
  }, []);

  React.useEffect(() => { void cargarDatos(procesoSeleccionado); }, [cargarDatos, procesoSeleccionado]);

  const cambiarProceso = (slug: string) => {
    establecerMensaje("");
    establecerError("");
    establecerProcesoSeleccionado(slug);
  };

  const paso = contenido.flujo[pasoSeleccionado];
  const identificadores = Object.keys(contenido.flujo);

  const actualizarPaso = (cambios: Partial<PasoFlujo>) => establecerContenido((actual) => ({
    ...actual, flujo: { ...actual.flujo, [pasoSeleccionado]: { ...actual.flujo[pasoSeleccionado], ...cambios } },
  }));

  const actualizarOpcion = (indice: number, cambios: Partial<OpcionFlujo>) => {
    const opciones = [...(paso.options || [])];
    opciones[indice] = { ...opciones[indice], ...cambios };
    actualizarPaso({ options: opciones });
  };

  const agregarOpcion = () => actualizarPaso({ options: [...(paso.options || []), { label: "Nueva respuesta", next: identificadores[0] }] });
  const eliminarOpcion = (indice: number) => actualizarPaso({ options: (paso.options || []).filter((_, posicion) => posicion !== indice) });

  const agregarPaso = () => {
    let indice = 1;
    let identificador = `paso-nuevo-${indice}`;
    while (contenido.flujo[identificador]) { indice += 1; identificador = `paso-nuevo-${indice}`; }
    establecerContenido((actual) => ({
      ...actual,
      flujo: { ...actual.flujo, [identificador]: { eyebrow: "Nuevo paso", title: "Título del paso", description: "Explica aquí qué debe hacer el operador." } },
    }));
    establecerPasoSeleccionado(identificador);
  };

  const eliminarPaso = () => {
    if (pasoSeleccionado === "mode" || !window.confirm("¿Eliminar este paso y las respuestas que conducen hasta él?")) return;
    const nuevoFlujo: Record<string, PasoFlujo> = {};
    Object.entries(contenido.flujo).forEach(([id, valor]) => {
      if (id !== pasoSeleccionado) nuevoFlujo[id] = { ...valor, options: valor.options?.filter((opcion) => opcion.next !== pasoSeleccionado) };
    });
    establecerContenido((actual) => ({ ...actual, flujo: nuevoFlujo }));
    establecerPasoSeleccionado("mode");
  };

  const guardar = async () => {
    establecerEstado("guardando"); establecerMensaje(""); establecerError("");
    try {
      const resultado = await guardarBorradorProceso(procesoSeleccionado, contenido);
      establecerMensaje(`Borrador v${resultado.version} guardado. El manual público todavía no ha cambiado.`);
      await cargarDatos(procesoSeleccionado);
    } catch (errorGuardado) { establecerError(errorGuardado instanceof Error ? errorGuardado.message : "No se pudo guardar."); establecerEstado("listo"); }
  };

  const publicar = async () => {
    if (!window.confirm("¿Publicar el último borrador? El manual empezará a utilizarlo inmediatamente.")) return;
    establecerEstado("publicando"); establecerMensaje(""); establecerError("");
    try {
      const resultado = await publicarBorradorProceso(procesoSeleccionado);
      establecerMensaje(`Versión v${resultado.version} publicada correctamente.`);
      await cargarDatos(procesoSeleccionado);
    } catch (errorPublicacion) { establecerError(errorPublicacion instanceof Error ? errorPublicacion.message : "No se pudo publicar."); establecerEstado("listo"); }
  };

  if (!paso) return <main className="admin-manual"><p>No existe un paso seleccionable.</p></main>;

  return (
    <main className="admin-manual">
      <header className="admin-cabecera">
        <div><span>Panel de administración</span><h1>Contenido de {procesoActual.nombre}</h1><p>Edita mediante formularios, guarda un borrador y publícalo únicamente cuando esté revisado.</p></div>
        <div className="admin-cabecera-enlaces"><Link to="/manual">← Volver al manual</Link><Link to="/">Inicio</Link></div>
      </header>

      <section className="admin-selector-proceso">
        <label htmlFor="selector-proceso">Procedimiento que deseas editar</label>
        <select id="selector-proceso" value={procesoSeleccionado} onChange={(evento) => cambiarProceso(evento.target.value)} disabled={estado !== "listo"}>
          {procesosConfigurables.map((proceso) => <option value={proceso.slug} key={proceso.slug}>{proceso.nombre}</option>)}
        </select>
        <p>Cada señal guarda sus propios borradores, publicación e historial.</p>
      </section>

      <section className="admin-seguridad"><strong>Publicación segura por versiones</strong><span>Guardar no cambia el manual visible. Solo el botón “Publicar borrador” activa los cambios.</span></section>
      {mensaje && <p className="admin-mensaje" role="status">{mensaje}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="admin-distribucion">
        <aside className="admin-pasos">
          <div className="admin-titulo-seccion"><div><span>Estructura</span><h2>Pasos del proceso</h2></div><button onClick={agregarPaso}>+ Añadir</button></div>
          <nav aria-label="Pasos editables">{identificadores.map((id, indice) => (
            <button className={id === pasoSeleccionado ? "activo" : ""} onClick={() => establecerPasoSeleccionado(id)} key={id}>
              <span>{indice + 1}</span><strong>{contenido.flujo[id].title}</strong>
            </button>
          ))}</nav>
        </aside>

        <section className="admin-editor">
          <div className="admin-titulo-seccion"><div><span>Editando paso</span><h2>{paso.title}</h2></div>{pasoSeleccionado !== "mode" && <button className="admin-eliminar" onClick={eliminarPaso}>Eliminar paso</button>}</div>
          <div className="admin-campos">
            <label>Etiqueta superior<input value={paso.eyebrow} onChange={(evento) => actualizarPaso({ eyebrow: evento.target.value })} /></label>
            <label>Título<input value={paso.title} onChange={(evento) => actualizarPaso({ title: evento.target.value })} /></label>
            <label className="ancho-completo">Explicación<textarea rows={4} value={paso.description} onChange={(evento) => actualizarPaso({ description: evento.target.value })} /></label>
            <label className="admin-comprobacion"><input type="checkbox" checked={Boolean(paso.result)} onChange={(evento) => actualizarPaso({ result: evento.target.checked })} />Este paso finaliza la rama</label>
          </div>

          <div className="admin-opciones">
            <div className="admin-titulo-seccion"><div><span>Navegación</span><h3>Respuestas y siguiente paso</h3></div><button onClick={agregarOpcion}>+ Respuesta</button></div>
            {(paso.options || []).length === 0 && <p className="admin-vacio">Este paso no tiene respuestas. Puedes añadirlas o marcarlo como final.</p>}
            {(paso.options || []).map((opcion, indice) => (
              <div className="admin-opcion" key={`${indice}-${opcion.label}`}>
                <label>Texto del botón<input value={opcion.label} onChange={(evento) => actualizarOpcion(indice, { label: evento.target.value })} /></label>
                <label>Siguiente paso<select value={opcion.next} onChange={(evento) => actualizarOpcion(indice, { next: evento.target.value })}>{identificadores.map((id) => <option value={id} key={id}>{contenido.flujo[id].title}</option>)}</select></label>
                {pasoSeleccionado === "mode" && <label>Modalidad<select value={opcion.mode || ""} onChange={(evento) => actualizarOpcion(indice, { mode: (evento.target.value || undefined) as ModalidadRobo | undefined })}><option value="">Sin modalidad</option><option value="sin-acuda">Sin acuda</option><option value="acuda-aviso">Acuda con aviso</option><option value="acuda-sin-aviso">Acuda sin aviso</option></select></label>}
                <button aria-label={`Eliminar respuesta ${opcion.label}`} onClick={() => eliminarOpcion(indice)}>×</button>
              </div>
            ))}
          </div>

          <section className="admin-vista-previa"><span>Vista previa del paso</span><h2>{paso.title || "Sin título"}</h2><p>{paso.description || "Sin explicación"}</p><div>{(paso.options || []).map((opcion) => <button key={opcion.label}>{opcion.label || "Respuesta"}</button>)}</div></section>
        </section>
      </div>

      <section className="admin-comentarios">
        <div className="admin-titulo-seccion"><div><span>MasterMind</span><h2>Comentarios frecuentes de {procesoActual.nombre}</h2></div><button onClick={() => establecerContenido((actual) => ({ ...actual, comentarios: [...actual.comentarios, "Nuevo comentario"] }))}>+ Comentario</button></div>
        <div>{contenido.comentarios.map((comentario, indice) => <label key={indice}><span>Comentario {indice + 1}</span><textarea rows={2} value={comentario} onChange={(evento) => establecerContenido((actual) => ({ ...actual, comentarios: actual.comentarios.map((valor, posicion) => posicion === indice ? evento.target.value : valor) }))} /><button onClick={() => establecerContenido((actual) => ({ ...actual, comentarios: actual.comentarios.filter((_, posicion) => posicion !== indice) }))}>Eliminar</button></label>)}</div>
      </section>

      <section className="admin-publicacion">
        <div><span>Control de cambios</span><h2>Guardar y publicar</h2><p>Guarda primero el borrador. Después revísalo y publícalo cuando esté listo.</p></div>
        <div><button onClick={guardar} disabled={estado !== "listo"}>{estado === "guardando" ? "Guardando…" : "Guardar borrador"}</button><button className="publicar" onClick={publicar} disabled={estado !== "listo"}>{estado === "publicando" ? "Publicando…" : "Publicar borrador"}</button></div>
      </section>

      <section className="admin-versiones"><h2>Historial reciente</h2>{versiones.length === 0 ? <p>Todavía no existen versiones en la base de datos.</p> : <ol>{versiones.map((version) => <li key={version.id}><strong>v{version.version}</strong><span className={`estado-${version.estado}`}>{version.estado}</span><time>{new Date(`${version.creado_en}Z`).toLocaleString("es-ES")}</time></li>)}</ol>}</section>
    </main>
  );
};
