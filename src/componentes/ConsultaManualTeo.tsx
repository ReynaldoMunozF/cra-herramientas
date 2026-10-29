import React from "react";
import { buscarProcedimientosManual, cargarManualTeo, CatalogoManualTeo, ProcedimientoManualTeo, RUTA_MANUAL_TEO } from "../servicios/manualTeo";
import { SesionTeoError } from "../servicios/teo";

type Revision = { estado: string; notas: string };
export const ConsultaManualTeo: React.FC<{ alCaducarSesion: () => void }> = ({ alCaducarSesion }) => {
  const [datos, setDatos] = React.useState<CatalogoManualTeo | null>(null);
  const [error, setError] = React.useState("");
  const [intento, setIntento] = React.useState(0);
  const [texto, setTexto] = React.useState("");
  const [grupo, setGrupo] = React.useState("");
  const [paginaResultados, setPaginaResultados] = React.useState(0);
  const [porPagina, setPorPagina] = React.useState(3);
  const [seleccion, setSeleccion] = React.useState<ProcedimientoManualTeo | null>(null);
  const [ruta, setRuta] = React.useState<string[]>([]);
  const [verFuente, setVerFuente] = React.useState(false);
  const [pagina, setPagina] = React.useState(1);
  const [revisiones, setRevisiones] = React.useState<Record<string, Revision>>({});
  const [aviso, setAviso] = React.useState("");
  const raiz = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  React.useEffect(() => {
    const controlador = new AbortController();setError("");
    cargarManualTeo(controlador.signal).then(d => {
      setDatos(d);
      try { setRevisiones(JSON.parse(localStorage.getItem(`teo-revision-manual-${d.fuente.sha256}`) || "{}")); } catch { setRevisiones({}); }
    }).catch(e => {
      if (controlador.signal.aborted) return;
      if (e instanceof SesionTeoError) alCaducarSesion();
      else setError(e instanceof Error ? e.message : "No se pudo cargar el manual.");
    });
    return () => controlador.abort();
  }, [intento, alCaducarSesion]);
  const guardar = (cambio: Partial<Revision>) => {
    if (!datos || !seleccion) return;
    const nuevas = { ...revisiones, [seleccion.id]: { estado: "pendiente", notas: "", ...revisiones[seleccion.id], ...cambio } };
    setRevisiones(nuevas);
    try { localStorage.setItem(`teo-revision-manual-${datos.fuente.sha256}`, JSON.stringify(nuevas)); setAviso("Revisión guardada en este navegador."); }
    catch { setAviso("No se pudo guardar aquí. Exporta la revisión para conservarla."); }
  };
  const exportar = () => {
    if (!datos) return;
    const blob = new Blob([JSON.stringify({ version: 1, fuente_sha256: datos.fuente.sha256, exportado: new Date().toISOString(), revisiones }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = (raiz.current?.ownerDocument ?? document).createElement("a");
    a.href = url;a.download = "revision-manual-teo.json";a.click();window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const abrir = (p: ProcedimientoManualTeo) => { setSeleccion(p);setRuta([p.inicio]);setVerFuente(false);setPagina(p.paginas[0]);setAviso(""); };
  const nodo = seleccion?.nodos[ruta[ruta.length - 1]];
  const encontradas = datos ? buscarProcedimientosManual(datos.procedimientos, texto, grupo) : [];
  React.useLayoutEffect(() => {
    const contenedor = raiz.current?.closest(".teo-desplazamiento");
    if (!contenedor) return;
    const medir = () => setPorPagina(contenedor.clientHeight >= 700 ? 3 : 2);
    const observador = new ResizeObserver(medir);
    observador.observe(contenedor); medir();
    return () => observador.disconnect();
  }, []);
  const totalPaginas = Math.max(1, Math.ceil(encontradas.length / porPagina));
  const paginaActual = Math.min(paginaResultados, totalPaginas - 1);
  const visibles = encontradas.slice(paginaActual * porPagina, (paginaActual + 1) * porPagina);
  React.useEffect(() => setPaginaResultados(0), [texto, grupo, porPagina]);
  React.useLayoutEffect(() => {
    const contenedor = raiz.current?.closest(".teo-desplazamiento");
    if (contenedor) contenedor.scrollTop = 0;
  }, [seleccion?.id, ruta.join("/"), texto, grupo, paginaActual]);
  const pendientes = datos?.discrepancias.filter(d => seleccion?.discrepancias?.includes(d.id)) ?? [];
  const revision = seleccion ? revisiones[seleccion.id] : null;
  return <div ref={raiz} className="teo-manual">
    {!seleccion && <><div className="teo-manual-titulo"><h2>Manual · Prueba de administrador</h2><span>Borrador</span></div>
    <p className="teo-nota">Respuestas del manual 2025 pendientes de revisar. No realiza gestiones. No introduzcas claves ni datos de clientes.</p></>}
    {error ? <p className="teo-error" role="alert">{error} <button type="button" onClick={() => setIntento(n => n+1)}>Reintentar</button></p> : !datos ? <p role="status">Cargando manual…</p> : <>
      {!seleccion ? <>
        <label htmlFor={`${id}-buscar`}>¿Qué necesitas consultar?</label>
        <div className="teo-entrada"><span aria-hidden="true">⌕</span><input id={`${id}-buscar`} value={texto} onChange={e => setTexto(e.target.value)} maxLength={160} placeholder="Interferencia, fuego, robo…" autoComplete="off" /></div>
        <label htmlFor={`${id}-familia`}>Familia</label><select id={`${id}-familia`} value={grupo} onChange={e => setGrupo(e.target.value)}><option value="">Todas las familias</option>{Array.from(new Set(datos.procedimientos.map(p => p.grupo))).map(g => <option key={g} value={g}>{g}</option>)}</select>
        <p className="teo-nota" role="status">{encontradas.length} procesos · Elige uno para empezar.</p>
        <div className="teo-manual-lista">{visibles.map(p => <button type="button" key={p.id} onClick={() => abrir(p)}><strong>{p.titulo}</strong><small>{p.grupo} · p. {p.paginas.join(", ")}{revisiones[p.id]?.estado === "revisado" ? " · Revisado" : revisiones[p.id]?.estado === "corregir" ? " · Corregir" : ""}</small></button>)}</div>
        {totalPaginas > 1 && <nav className="teo-manual-paginacion" aria-label="Páginas de procesos"><button type="button" disabled={paginaActual === 0} onClick={() => setPaginaResultados(n => n-1)}>← Anterior</button><span>Página {paginaActual+1} de {totalPaginas}</span><button type="button" disabled={paginaActual === totalPaginas-1} onClick={() => setPaginaResultados(n => n+1)}>Siguiente →</button></nav>}
        {!encontradas.length && <p>No he encontrado ese proceso. Prueba otra palabra o elige una familia; no seleccionaré una ruta por mi cuenta.</p>}
      </> : nodo && <>
        <button type="button" className="teo-manual-volver" onClick={() => setSeleccion(null)}>← Buscar otro proceso</button>
        <div className="teo-manual-proceso-titulo"><h3>{seleccion.titulo}</h3><span>Borrador</span></div>
        <small className="teo-nota">{seleccion.grupo} · Página{seleccion.paginas.length > 1 ? "s" : ""} {seleccion.paginas.join(", ")} · Paso {ruta.length}</small>
        <article className={`teo-tarjeta teo-manual-respuesta ${nodo.tipo === "consulta" ? "requiere-consulta" : ""}`} aria-live="polite">
          {nodo.tipo === "consulta" && <strong>Hace falta comprobar este dato</strong>}
          <p>{nodo.texto}</p>
          <div className="teo-manual-opciones">{nodo.opciones.map(o => <button key={o.destino} type="button" onClick={() => { setRuta(r => [...r, o.destino]);setVerFuente(false); }}>{o.etiqueta}</button>)}</div>
        </article>
        <div className="teo-manual-acciones"><button type="button" disabled={ruta.length < 2} onClick={() => setRuta(r => r.slice(0,-1))}>Volver un paso</button><button type="button" onClick={() => setRuta([seleccion.inicio])}>Reiniciar</button><button type="button" onClick={() => setVerFuente(v => !v)} aria-expanded={verFuente}>Ver manual original</button></div>
        {verFuente && <div className="teo-tarjeta teo-manual-fuente"><label htmlFor={`${id}-pagina`}>Página de referencia</label><select id={`${id}-pagina`} value={pagina} onChange={e => setPagina(Number(e.target.value))}>{seleccion.paginas.map(n => <option key={n} value={n}>Página {n}</option>)}</select><a href={`${RUTA_MANUAL_TEO}imagenes/pagina-${String(pagina).padStart(3,"0")}.jpg`} target="_blank" rel="noopener noreferrer"><img src={`${RUTA_MANUAL_TEO}imagenes/pagina-${String(pagina).padStart(3,"0")}.jpg`} alt={`Manual original, página ${pagina}. Pulsa para ampliar.`} /></a><a href={`${RUTA_MANUAL_TEO}manual.pdf#page=${pagina}`} target="_blank" rel="noopener noreferrer">Abrir PDF en esta página</a></div>}
        {pendientes.length > 0 && <details className="teo-manual-dudas"><summary>{pendientes.length} puntos del manual pendientes de aclarar</summary>{pendientes.map(d => <div key={d.id}><strong>{d.id} · {d.titulo}</strong><p>{d.detalle}</p><p>{d.regla}</p></div>)}</details>}
        <details className="teo-manual-revision"><summary>Revisar o corregir este proceso</summary><label htmlFor={`${id}-estado`}>Estado de tu revisión</label><select id={`${id}-estado`} value={revision?.estado ?? "pendiente"} onChange={e => guardar({ estado: e.target.value })}><option value="pendiente">Pendiente</option><option value="revisado">Revisado por mí</option><option value="corregir">Necesita corrección</option></select><label htmlFor={`${id}-notas`}>Tus correcciones</label><textarea id={`${id}-notas`} value={revision?.notas ?? ""} onChange={e => guardar({ notas: e.target.value })} placeholder="Qué cambiarías en esta respuesta o ruta…" rows={3} maxLength={10000} /><p className="teo-nota" role="status">{aviso || "Se guarda en este navegador. Marcar revisado no publica el proceso."}</p><button type="button" className="teo-manual-volver" onClick={exportar}>Exportar revisión</button></details>
      </>}
      {!seleccion && <div className="teo-manual-pie"><small>{datos.procedimientos.length} fichas · {datos.fuente.paginas} páginas · Solo administrador</small><button type="button" onClick={exportar}>Exportar revisión</button></div>}
    </>}
  </div>;
};
