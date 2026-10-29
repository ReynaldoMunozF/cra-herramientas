import React from "react";
import { obtenerDeletreo } from "../servicios/alfabetoFonetico";
import { localizarCodigoPostal } from "../servicios/localizacionPostal";
import { consultarOrientacionFse, OrientacionFse } from "../servicios/orientacionFse";

interface Localidad {
  nombre: string;
  provincia: string;
  comunidad: string;
  codigos: Array<{ codigoPostal: string; complementario: boolean }>;
}

/** Una entrada para las consultas existentes, conservando la elección de localidad y código. */
export const ConsultaUnificada: React.FC = () => {
  const id = React.useId();
  const [texto, establecerTexto] = React.useState("");
  const [localidades, establecerLocalidades] = React.useState<Localidad[]>([]);
  const [total, establecerTotal] = React.useState(0);
  const [buscando, establecerBuscando] = React.useState(false);
  const [consultado, establecerConsultado] = React.useState(false);
  const [error, establecerError] = React.useState("");
  const [codigo, establecerCodigo] = React.useState("");
  const [cargandoFse, establecerCargandoFse] = React.useState(false);
  const [resultado, establecerResultado] = React.useState<{
    nombre: string; provincia?: string; orientacion: OrientacionFse; validacionDisponible: boolean;
  } | null>(null);
  const [errorFse, establecerErrorFse] = React.useState("");
  const [copiado, establecerCopiado] = React.useState(false);
  const peticion = React.useRef<AbortController | null>(null);
  const version = React.useRef(0);
  const deletreo = obtenerDeletreo(texto.trim());

  const cancelar = () => {
    version.current += 1;
    peticion.current?.abort();
  };
  React.useEffect(() => () => cancelar(), []);

  const cambiarTexto = (valor: string) => {
    cancelar();
    establecerTexto(valor);
    establecerLocalidades([]); establecerTotal(0); establecerConsultado(false);
    establecerBuscando(false); establecerCargandoFse(false);
    establecerCodigo(""); establecerResultado(null); establecerError(""); establecerErrorFse(""); establecerCopiado(false);
  };

  const buscar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const consulta = texto.replace(/\s+/g, " ").trim();
    if (consulta.length < 2) { establecerError("Escribe al menos dos caracteres para buscar una localidad o un código postal."); return; }
    cancelar();
    const actual = version.current;
    const controlador = new AbortController(); peticion.current = controlador;
    establecerBuscando(true); establecerConsultado(false); establecerError("");
    establecerCodigo(""); establecerResultado(null); establecerErrorFse(""); establecerCargandoFse(false); establecerLocalidades([]);
    try {
      const respuesta = await fetch(`/api/consulta-rapida?texto=${encodeURIComponent(consulta)}`, {
        signal: controlador.signal, credentials: "same-origin", headers: { Accept: "application/json" },
      });
      if (!respuesta.ok) throw new Error("No se pudo consultar el catálogo postal. Comprueba tu sesión e inténtalo de nuevo.");
      const datos = await respuesta.json() as { localidades: Localidad[]; total: number };
      if (actual !== version.current) return;
      establecerLocalidades(datos.localidades); establecerTotal(datos.total); establecerConsultado(true);
    } catch {
      if (actual === version.current) establecerError("No se pudo consultar el catálogo postal. Comprueba tu sesión e inténtalo de nuevo.");
    } finally {
      if (actual === version.current) establecerBuscando(false);
    }
  };

  const consultarCodigo = async (codigoPostal: string) => {
    cancelar();
    const actual = version.current;
    const controlador = new AbortController(); peticion.current = controlador;
    establecerCodigo(codigoPostal); establecerResultado(null); establecerErrorFse(""); establecerCargandoFse(true);
    try {
      const ubicacion = await localizarCodigoPostal(codigoPostal, controlador.signal);
      const fse = await consultarOrientacionFse(codigoPostal, ubicacion, controlador.signal);
      if (actual === version.current) establecerResultado({ nombre: ubicacion.nombre, provincia: ubicacion.provincia, ...fse });
    } catch (motivo) {
      if (actual === version.current) establecerErrorFse(motivo instanceof Error ? motivo.message : "No se pudo consultar la FSE.");
    } finally {
      if (actual === version.current) establecerCargandoFse(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(deletreo.join(" · "));
      establecerCopiado(true);
    } catch { establecerError("No se pudo copiar. Puedes seleccionar y copiar el deletreo directamente."); }
  };

  return <section className="consulta-unificada" aria-labelledby={`${id}-titulo`}>
    <header><span>Una consulta, varias herramientas</span><h2 id={`${id}-titulo`}>Asistente de consulta rápida</h2><p>Escribe un nombre para deletrearlo o busca una localidad y sus códigos postales.</p></header>
    <form onSubmit={buscar}>
      <label htmlFor={`${id}-texto`}>Nombre, localidad o código postal</label>
      <div className="consulta-unificada-entrada"><input id={`${id}-texto`} value={texto} onChange={(evento) => cambiarTexto(evento.target.value)} maxLength={120} placeholder="Ej.: García, Parla o 28981" autoComplete="off" /><button type="submit" disabled={buscando || texto.trim().length < 2}>{buscando ? "Buscando…" : "Buscar ubicación"}</button></div>
      <small>El deletreo es inmediato. Para consultar ubicaciones, pulsa Buscar ubicación.</small>
    </form>
    {deletreo.length > 0 && <div className="consulta-unificada-deletreo"><h3>Alfabeto fonético</h3><p>{deletreo.join(" · ")}</p><button type="button" onClick={copiar}>{copiado ? "Copiado ✓" : "Copiar deletreo"}</button></div>}
    {error && <p role="alert" className="consulta-unificada-error">{error}</p>}
    <div aria-live="polite" aria-busy={buscando}>
      {buscando && <p>Consultando el catálogo postal…</p>}
      {consultado && !localidades.length && <p>No hay coincidencias en el catálogo para «{texto.trim()}». Puedes añadir la provincia o consultar la herramienta Localización para una dirección. El deletreo sigue disponible.</p>}
      {localidades.length > 0 && <div className="consulta-unificada-localidades"><h3>Localidades y códigos postales</h3><p>Selecciona el código de la dirección para consultar su FSE. Son las coincidencias del catálogo disponible; no garantizan todos los códigos de una localidad.</p>
        {total > localidades.length && <p>Mostrando {localidades.length} de {total} localidades. Añade la provincia o más letras para concretar.</p>}
        {localidades.map((localidad) => <article key={`${localidad.nombre}-${localidad.provincia}-${localidad.comunidad}`}><h4>{localidad.nombre}</h4><p>{localidad.provincia} · {localidad.comunidad}</p><div className="consulta-unificada-codigos">{localidad.codigos.map(({ codigoPostal, complementario }) => <button type="button" key={codigoPostal} aria-pressed={codigo === codigoPostal} onClick={() => consultarCodigo(codigoPostal)}>{codigoPostal}{complementario && <small>Complementario</small>}</button>)}</div></article>)}
      </div>}
    </div>
    <div aria-live="polite" aria-busy={cargandoFse}>
      {cargandoFse && <p>Consultando la FSE de {codigo}…</p>}
      {errorFse && <p role="alert" className="consulta-unificada-error">{errorFse} <button type="button" onClick={() => consultarCodigo(codigo)}>Reintentar</button></p>}
      {resultado && <article className="consulta-unificada-fse"><h3>FSE orientativa · {codigo}</h3><p>{resultado.nombre} · {resultado.provincia}</p><strong>{resultado.orientacion.principal}</strong><p>{resultado.orientacion.criterio}</p><p>Confianza: {resultado.orientacion.confianza}. Otros cuerpos: {resultado.orientacion.concurrentes.join(", ")}.</p>{!resultado.validacionDisponible && <p className="consulta-unificada-error">No se pudieron recuperar las correcciones guardadas. Se muestra solo la orientación base; vuelve a consultar antes de usarla.</p>}<small>Confirma siempre la demarcación mediante las fuentes y procedimientos corporativos.</small></article>}
    </div>
  </section>;
};
