import React from "react";
import { obtenerDeletreo } from "../servicios/alfabetoFonetico";
import { BusquedaTeo, consultarTeo, ResultadoTeo, SesionTeoError } from "../servicios/teo";
import imagenTeo from "../recursos/teo/teo.png";

interface PropiedadesTeo {
  siempreVisible: boolean;
  alCerrar: () => void;
  alCaducarSesion: () => void;
  alCambiarTamano: (alto: number) => void;
}

export const PanelTeo: React.FC<PropiedadesTeo> = ({ siempreVisible, alCerrar, alCaducarSesion, alCambiarTamano }) => {
  const [minimizado, establecerMinimizado] = React.useState(false);
  const [texto, establecerTexto] = React.useState("");
  const [busqueda, establecerBusqueda] = React.useState<BusquedaTeo | null>(null);
  const [buscando, establecerBuscando] = React.useState(false);
  const [error, establecerError] = React.useState("");
  const [codigo, establecerCodigo] = React.useState("");
  const [resultado, establecerResultado] = React.useState<ResultadoTeo | null>(null);
  const [cargandoFse, establecerCargandoFse] = React.useState(false);
  const [errorFse, establecerErrorFse] = React.useState("");
  const [copiado, establecerCopiado] = React.useState(false);
  const [reintento, establecerReintento] = React.useState(0);
  const raiz = React.useRef<HTMLElement>(null);
  const cabecera = React.useRef<HTMLElement>(null);
  const contenido = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const desplazamiento = React.useRef<HTMLDivElement>(null);
  const tarjetaFse = React.useRef<HTMLElement>(null);
  const consultaActual = React.useRef("");
  const peticionFse = React.useRef<AbortController | null>(null);
  const versionFse = React.useRef(0);
  const id = React.useId();
  const consulta = texto.replace(/\s+/g, " ").trim();
  const deletreo = obtenerDeletreo(consulta);

  const cancelarFse = () => { versionFse.current += 1; peticionFse.current?.abort(); };
  React.useEffect(() => () => cancelarFse(), []);

  React.useEffect(() => {
    const vista = raiz.current?.ownerDocument.defaultView;
    if (!vista || !cabecera.current) return;
    const medir = () => alCambiarTamano((cabecera.current?.offsetHeight ?? 56) + (minimizado ? 0 : contenido.current?.scrollHeight ?? 0));
    const observador = new ResizeObserver(medir);
    observador.observe(cabecera.current);
    if (contenido.current) observador.observe(contenido.current);
    medir();
    return () => observador.disconnect();
  }, [minimizado, alCambiarTamano]);

  React.useEffect(() => {
    const documento = raiz.current?.ownerDocument;
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") establecerMinimizado(true);
    };
    documento?.addEventListener("keydown", teclado);
    return () => documento?.removeEventListener("keydown", teclado);
  }, []);

  React.useEffect(() => {
    if (minimizado) return;
    const controlador = new AbortController();
    establecerBusqueda(null); establecerError("");
    if (consulta.length < 2) { establecerBuscando(false); return; }
    establecerBuscando(true);
    // El deletreo es local; solo el catálogo espera a que el operador deje de teclear.
    const temporizador = window.setTimeout(async () => {
      try {
        const datos = await consultarTeo<BusquedaTeo>(new URLSearchParams({ texto: consulta }), controlador.signal);
        if (!controlador.signal.aborted && consultaActual.current === consulta) establecerBusqueda(datos);
      } catch (motivo) {
        if (controlador.signal.aborted || consultaActual.current !== consulta) return;
        if (motivo instanceof SesionTeoError) { alCaducarSesion(); return; }
        establecerError(motivo instanceof Error ? motivo.message : "No he podido buscar la localidad.");
      } finally {
        if (!controlador.signal.aborted && consultaActual.current === consulta) establecerBuscando(false);
      }
    }, 350);
    return () => { window.clearTimeout(temporizador); controlador.abort(); };
  }, [consulta, minimizado, reintento, alCaducarSesion]);

  React.useEffect(() => {
    if (resultado) tarjetaFse.current?.scrollIntoView({ block: "nearest" });
  }, [resultado]);

  const cambiarTexto = (valor: string) => {
    if (desplazamiento.current) desplazamiento.current.scrollTop = 0;
    consultaActual.current = valor.replace(/\s+/g, " ").trim();
    cancelarFse(); establecerTexto(valor); establecerCopiado(false);
    establecerCodigo(""); establecerResultado(null); establecerErrorFse(""); establecerCargandoFse(false);
    establecerBusqueda(null); establecerError("");
  };

  const consultarCodigo = async (codigoPostal: string) => {
    cancelarFse();
    const version = versionFse.current;
    const controlador = new AbortController(); peticionFse.current = controlador;
    const textoConsultado = consulta;
    establecerCodigo(codigoPostal); establecerResultado(null); establecerErrorFse(""); establecerCargandoFse(true);
    try {
      const datos = await consultarTeo<ResultadoTeo>(new URLSearchParams({ codigoPostal }), controlador.signal);
      if (version === versionFse.current && textoConsultado === consultaActual.current) establecerResultado(datos);
    } catch (motivo) {
      if (controlador.signal.aborted || version !== versionFse.current) return;
      if (motivo instanceof SesionTeoError) { alCaducarSesion(); return; }
      establecerErrorFse(motivo instanceof Error ? motivo.message : "No he podido consultar la FSE.");
    } finally {
      if (version === versionFse.current) establecerCargandoFse(false);
    }
  };

  // Un CP completo es inequívoco: recupera automáticamente su información y FSE.
  React.useEffect(() => {
    if (minimizado || !/^\d{5}$/.test(consulta) || !busqueda?.localidades.length) return;
    void consultarCodigo(consulta);
    // La selección manual de un código no debe iniciar otra petición automática.
  }, [consulta, busqueda, minimizado]);

  const copiar = () => {
    const documento = raiz.current?.ownerDocument;
    if (!documento) return;
    const area = documento.createElement("textarea");
    area.value = deletreo.join(" · "); area.style.cssText = "position:fixed;left:-9999px";
    documento.body.appendChild(area); area.select();
    try { establecerCopiado(documento.execCommand("copy")); } finally { area.remove(); input.current?.focus(); }
  };

  return <section ref={raiz} className={`teo-panel ${minimizado ? "teo-minimizado" : ""}`} aria-label="Teo, tu compañero CRA">
    <header ref={cabecera} className="teo-cabecera">
      <img src={imagenTeo} alt="" width={46} height={46} />
      <div><strong>Teo <span>· Tu compañero CRA</span></strong><small>{siempreVisible ? "Siempre visible" : "Dentro de esta página"} · Solo administrador</small></div>
      <button type="button" onClick={() => establecerMinimizado(!minimizado)} aria-label={minimizado ? "Desplegar Teo" : "Minimizar Teo"} title={minimizado ? "Desplegar" : "Minimizar"}>{minimizado ? "▢" : "−"}</button>
      <button type="button" onClick={alCerrar} aria-label="Cerrar Teo" title="Cerrar">×</button>
    </header>
    {!minimizado && <div ref={desplazamiento} className="teo-desplazamiento"><div ref={contenido} className="teo-contenido">
      {!siempreVisible && <p className="teo-aviso">Este navegador no permite fijar la ventana sobre otras aplicaciones. Usa Chrome o Edge con Picture-in-Picture para mantener a Teo siempre visible.</p>}
      <form onSubmit={(evento) => { evento.preventDefault(); establecerReintento((valor) => valor + 1); }}>
        <label htmlFor={`${id}-consulta`}>{consulta ? "Nombre, localidad o código postal" : "Hola, soy Teo. ¿Qué necesitas consultar?"}</label>
        <div className="teo-entrada"><span aria-hidden="true">⌕</span><input ref={input} id={`${id}-consulta`} value={texto} onChange={(evento) => cambiarTexto(evento.target.value)} maxLength={120} autoComplete="off" placeholder="Ej.: García, Parla o 28981" autoFocus />{texto && <button type="button" onClick={() => { cambiarTexto(""); input.current?.focus(); }} aria-label="Limpiar consulta">×</button>}</div>
        {!consulta && <small>Escribe y te mostraré los datos de tus herramientas.</small>}
      </form>
      {deletreo.length > 0 && <article className="teo-tarjeta teo-alfabeto"><div className="teo-titulo-tarjeta"><h2>Alfabeto militar</h2><button type="button" onClick={copiar} aria-label="Copiar deletreo">{copiado ? "Copiado ✓" : "Copiar"}</button></div><p>{deletreo.join(" · ")}</p></article>}
      <div aria-live="polite" aria-busy={buscando}>
        {buscando && <p className="teo-estado">Buscando localidades…</p>}
        {error && <p className="teo-error" role="alert">{error} <button type="button" onClick={() => establecerReintento((valor) => valor + 1)}>Reintentar</button></p>}
        {busqueda && busqueda.total === 0 && <p className="teo-estado">No encuentro una localidad o código postal con ese texto en el catálogo. El deletreo sigue disponible.</p>}
        {busqueda && busqueda.total > 0 && <div className="teo-localidades"><h2>Localidades y códigos postales</h2>{busqueda.total > busqueda.localidades.length && <p className="teo-estado">{busqueda.localidades.length} de {busqueda.total} coincidencias. Añade la provincia para concretar.</p>}
          {busqueda.localidades.map((localidad) => <article className="teo-tarjeta" key={`${localidad.nombre}|${localidad.provincia}|${localidad.comunidad}`}><h3>{localidad.nombre}</h3><p className="teo-provincia">{localidad.provincia} · {localidad.comunidad}</p><div className="teo-codigos">{localidad.codigos.map((cp) => <button key={cp.codigoPostal} type="button" onClick={() => consultarCodigo(cp.codigoPostal)} aria-pressed={codigo === cp.codigoPostal} title={cp.complementario ? "Entrada del catálogo complementario" : "Consultar FSE de este código postal"}>{cp.codigoPostal}{cp.complementario && <span aria-label="Catálogo complementario">*</span>}</button>)}</div></article>)}
          <small className="teo-nota">Elige el CP de la dirección para consultar su FSE. * Catálogo complementario. La lista puede no incluir todos los CP de la localidad.</small>
        </div>}
      </div>
      <div aria-live="polite" aria-busy={cargandoFse}>
        {cargandoFse && <p className="teo-estado">Consultando FSE de {codigo}…</p>}
        {errorFse && <p className="teo-error" role="alert">{errorFse} <button type="button" onClick={() => consultarCodigo(codigo)}>Reintentar FSE</button></p>}
        {resultado && <article ref={tarjetaFse} className="teo-tarjeta teo-fse"><h2>FSE orientativa · {codigo}</h2><p className="teo-provincia">{resultado.ubicacion.nombre} · {resultado.ubicacion.provincia}</p><strong>{resultado.orientacion.principal}</strong><p>{resultado.orientacion.criterio}</p><small>Confianza {resultado.orientacion.confianza}. Otros cuerpos: {resultado.orientacion.concurrentes.join(", ")}.</small>{!resultado.validacionDisponible && <p className="teo-error">No he podido recuperar las correcciones guardadas. Se muestra solo la orientación base. <button type="button" onClick={() => consultarCodigo(codigo)}>Actualizar FSE</button></p>}<small className="teo-aviso-fse">Confirma la demarcación según el procedimiento corporativo.</small></article>}
      </div>
    </div></div>}
  </section>;
};
