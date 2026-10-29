import React from "react";
import { buscarProcedimientosManual, cargarManualTeo, CatalogoManualTeo, RUTA_MANUAL_TEO } from "../servicios/manualTeo";
import { SesionTeoError } from "../servicios/teo";
export type EstadoBusquedaManual = "inactivo" | "buscando" | "encontrado" | "sin-resultados" | "error";
interface Props {
  consulta: string;
  alCaducarSesion: () => void;
  alCambiarEstado: (estado: EstadoBusquedaManual) => void;
}
/** Índice local cargado desde la ruta administrativa; las vistas previas conservan esa protección. */
export const ResultadosManualTeo: React.FC<Props> = ({ consulta, alCaducarSesion, alCambiarEstado }) => {
  const [catalogo, setCatalogo] = React.useState<CatalogoManualTeo | null>(null);
  const [error, setError] = React.useState("");
  const [reintento, setReintento] = React.useState(0);
  const [previsualizacion, setPrevisualizacion] = React.useState<string | null | undefined>(undefined);
  const [paginas, setPaginas] = React.useState<Record<string, number>>({});
  const [imagenFallida, setImagenFallida] = React.useState("");
  const activa = consulta.trim().length >= 3 && /[a-záéíóúüñ]/i.test(consulta);
  React.useEffect(() => {
    if (!activa || catalogo) return;
    const abortar = new AbortController(); setError("");
    cargarManualTeo(abortar.signal).then(setCatalogo).catch(e => {
      if (abortar.signal.aborted) return;
      if (e instanceof SesionTeoError) alCaducarSesion();
      else setError("No he podido consultar el índice del manual.");
    });
    return () => abortar.abort();
  }, [activa, catalogo, reintento, alCaducarSesion]);
  React.useEffect(() => { setPrevisualizacion(undefined); setImagenFallida(""); }, [consulta]);
  const resultados = activa && catalogo ? buscarProcedimientosManual(catalogo.procedimientos, consulta, "", true) : [];
  const estado: EstadoBusquedaManual = !activa ? "inactivo" : error ? "error" : !catalogo ? "buscando" : resultados.length ? "encontrado" : "sin-resultados";
  React.useEffect(() => alCambiarEstado(estado), [estado, alCambiarEstado]);
  if (!activa) return null;
  if (error) return <p className="teo-error" role="status">{error} <button type="button" onClick={() => setReintento(n => n+1)}>Reintentar manual</button></p>;
  if (!catalogo) return <p className="teo-estado" role="status">Buscando en el manual…</p>;
  if (!resultados.length) return null;
  const abierta = previsualizacion === undefined ? resultados[0].id : previsualizacion;
  return <section className="teo-resultados-manual" aria-label="Páginas del manual"><h2>En el manual</h2>{resultados.slice(0,3).map(p => {
    const pagina = paginas[p.id] ?? p.paginas[0];
    const imagen = `${RUTA_MANUAL_TEO}imagenes/pagina-${String(pagina).padStart(3,"0")}.jpg`;
    const pdf = `${RUTA_MANUAL_TEO}manual.pdf#page=${pagina}`;
    return <article key={p.id} className="teo-tarjeta"><h3>{p.titulo}</h3><small className="teo-nota">{p.grupo} · Manual 2025 · Página {pagina}</small>
      {p.paginas.length > 1 && <label className="teo-manual-pagina">Página de referencia<select aria-label={`Página de ${p.titulo}`} value={pagina} onChange={e => { setPaginas(v => ({ ...v, [p.id]: Number(e.target.value) }));setImagenFallida(""); }}>{p.paginas.map(n => <option key={n} value={n}>Página {n}</option>)}</select></label>}
      <div className="teo-manual-enlaces"><a href={pdf} target="_blank" rel="noopener noreferrer">Abrir PDF · p. {pagina} ↗</a><button type="button" aria-expanded={abierta === p.id} onClick={() => setPrevisualizacion(abierta === p.id ? null : p.id)}>{abierta === p.id ? "Ocultar vista previa" : "Ver vista previa"}</button></div>
      {abierta === p.id && (imagenFallida === imagen ? <p className="teo-nota">No se pudo cargar la vista previa. Puedes abrir la página en el PDF.</p> : <a className="teo-miniatura-manual" href={imagen} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar página ${pagina} del manual`}><img src={imagen} alt={`Página ${pagina}: ${p.titulo}`} onError={() => setImagenFallida(imagen)} /><span>Pulsa para ampliar</span></a>)}
    </article>;
  })}{resultados.length > 3 && <p className="teo-nota">Se muestran 3 de {resultados.length} coincidencias. Concreta el proceso para afinar la búsqueda.</p>}</section>;
};
