import React from "react";
import { obtenerDeletreo } from "../servicios/alfabetoFonetico";
import { BusquedaTeo, consultarTeo, ResultadoTeo, ResultadoCoordenadasTeo, SesionTeoError } from "../servicios/teo";
import { interpretarCoordenadas } from "../servicios/coordenadasTeo";
import { ConsultaProductividadRapida } from "./ConsultaProductividadRapida";
import { ConsultaManualTeo } from "./ConsultaManualTeo";
import imagenTeo from "../recursos/teo/teo.png";

interface PropiedadesTeo {
  siempreVisible: boolean;
  alCerrar: () => void;
  alCaducarSesion: () => void;
  alCambiarTamano: (alto: number, ancho?: number, altoMaximo?: number) => void;
}

export const PanelTeo: React.FC<PropiedadesTeo> = ({ siempreVisible, alCerrar, alCaducarSesion, alCambiarTamano }) => {
  const [vista, establecerVista] = React.useState<"consulta" | "productividad" | "manual">("consulta");
  const [manualIniciado, establecerManualIniciado] = React.useState(false);
  const [productividadIniciada, establecerProductividadIniciada] = React.useState(false);
  const [minimizado, establecerMinimizado] = React.useState(false);
  const [texto, establecerTexto] = React.useState("");
  const [busqueda, establecerBusqueda] = React.useState<BusquedaTeo | null>(null);
  const [ubicacionCoordenadas, establecerUbicacionCoordenadas] = React.useState<ResultadoCoordenadasTeo | null>(null);
  const [coordenadasCopiadas, establecerCoordenadasCopiadas] = React.useState(false);
  const [buscando, establecerBuscando] = React.useState(false);
  const [error, establecerError] = React.useState("");
  const [codigo, establecerCodigo] = React.useState("");
  const [resultado, establecerResultado] = React.useState<ResultadoTeo | null>(null);
  const [cargandoFse, establecerCargandoFse] = React.useState(false);
  const [errorFse, establecerErrorFse] = React.useState("");
  const [telefonoCopiado, establecerTelefonoCopiado] = React.useState<number | null>(null);
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
  const coordenadas = interpretarCoordenadas(consulta);
  const modoCoordenadas = coordenadas.tipo !== "texto";
  const deletreo = modoCoordenadas || !/[a-záéíóúüñ]/i.test(consulta) ? [] : obtenerDeletreo(consulta);

  const cancelarFse = () => { versionFse.current += 1; peticionFse.current?.abort(); };
  React.useEffect(() => () => cancelarFse(), []);

  React.useEffect(() => {
    const ventanaPanel = raiz.current?.ownerDocument.defaultView;
    if (!ventanaPanel || !cabecera.current) return;
    const medir = () => alCambiarTamano(
      minimizado ? (cabecera.current?.offsetHeight ?? 60) : vista === "manual" ? 760 : (cabecera.current?.offsetHeight ?? 60) + (contenido.current?.scrollHeight ?? 0) + 2,
      vista === "manual" ? 620 : 535, vista === "manual" ? 760 : 560
    );
    const observador = new ResizeObserver(medir);
    observador.observe(cabecera.current);
    if (contenido.current) observador.observe(contenido.current);
    medir();
    ventanaPanel.addEventListener("resize", medir);
    return () => { observador.disconnect(); ventanaPanel.removeEventListener("resize", medir); };
  }, [vista, minimizado, alCambiarTamano]);

  React.useLayoutEffect(() => {
    if (desplazamiento.current) desplazamiento.current.scrollTop = 0;
  }, [vista, minimizado]);

  React.useEffect(() => {
    const documento = raiz.current?.ownerDocument;
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") establecerMinimizado(true);
    };
    documento?.addEventListener("keydown", teclado);
    return () => documento?.removeEventListener("keydown", teclado);
  }, []);

  React.useEffect(() => {
    if (minimizado || vista !== "consulta") return;
    const controlador = new AbortController();
    establecerBusqueda(null); establecerUbicacionCoordenadas(null); establecerError("");
    if (modoCoordenadas) { establecerResultado(null); establecerCodigo(""); }
    if (coordenadas.tipo === "incompletas" || coordenadas.tipo === "invalidas") { establecerBuscando(false); return; }
    if (consulta.length < 2) { establecerBuscando(false); return; }
    establecerBuscando(true);
    // El deletreo es local; las coordenadas esperan un segundo para evitar peticiones al seguir tecleando.
    const temporizador = window.setTimeout(async () => {
      try {
        if (coordenadas.tipo === "validas") {
          const parametros = new URLSearchParams({ latitud: String(coordenadas.latitud), longitud: String(coordenadas.longitud) });
          const datos = await consultarTeo<ResultadoCoordenadasTeo>(parametros, controlador.signal);
          if (!controlador.signal.aborted && consultaActual.current === consulta) {
            establecerUbicacionCoordenadas(datos);
            establecerCodigo(datos.ubicacion.codigoPostal);
            establecerResultado(datos.fse);
          }
        } else {
          const datos = await consultarTeo<BusquedaTeo>(new URLSearchParams({ texto: consulta }), controlador.signal);
          if (!controlador.signal.aborted && consultaActual.current === consulta) establecerBusqueda(datos);
        }
      } catch (motivo) {
        if (controlador.signal.aborted || consultaActual.current !== consulta) return;
        if (motivo instanceof SesionTeoError) { alCaducarSesion(); return; }
        establecerError(motivo instanceof Error ? motivo.message : "No he podido buscar la localidad.");
      } finally {
        if (!controlador.signal.aborted && consultaActual.current === consulta) establecerBuscando(false);
      }
    }, modoCoordenadas ? 1000 : 350);
    return () => { window.clearTimeout(temporizador); controlador.abort(); };
  }, [consulta, minimizado, vista, reintento, alCaducarSesion]);

  React.useEffect(() => {
    if (vista === "consulta" && resultado && !ubicacionCoordenadas) tarjetaFse.current?.scrollIntoView({ block: "nearest" });
  }, [resultado, ubicacionCoordenadas, vista]);

  const cambiarTexto = (valor: string) => {
    if (desplazamiento.current) desplazamiento.current.scrollTop = 0;
    consultaActual.current = valor.replace(/\s+/g, " ").trim();
    cancelarFse(); establecerTelefonoCopiado(null); establecerTexto(valor); establecerCopiado(false); establecerCoordenadasCopiadas(false);
    establecerUbicacionCoordenadas(null);
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

  const copiar = (valor?: string, telefonoId?: number) => {
    const documento = raiz.current?.ownerDocument;
    if (!documento) return;
    const area = documento.createElement("textarea");
    area.value = valor ?? deletreo.join(" · "); area.style.cssText = "position:fixed;left:-9999px";
    documento.body.appendChild(area); area.select();
    try { const correcto = documento.execCommand("copy"); if (telefonoId !== undefined) establecerTelefonoCopiado(correcto ? telefonoId : null); else if (valor) establecerCoordenadasCopiadas(correcto); else establecerCopiado(correcto); } finally { area.remove(); input.current?.focus(); }
  };

  return <section ref={raiz} className={`teo-panel teo-vista-${vista} ${minimizado ? "teo-minimizado" : ""}`} aria-label="Teo, tu compañero CRA">
    <header ref={cabecera} className="teo-cabecera">
      <img src={imagenTeo} alt="" width={46} height={46} />
      <div><strong>Teo <span>· Tu compañero CRA</span></strong><small>{siempreVisible ? "Siempre visible" : "Dentro de esta página"} · Solo administrador</small></div>
      <button type="button" onClick={() => establecerMinimizado(!minimizado)} aria-label={minimizado ? "Desplegar Teo" : "Minimizar Teo"} title={minimizado ? "Desplegar" : "Minimizar"}>{minimizado ? "▢" : "−"}</button>
      <button type="button" onClick={alCerrar} aria-label="Cerrar Teo" title="Cerrar">×</button>
    </header>
    <div hidden={minimizado} ref={desplazamiento} className="teo-desplazamiento"><div ref={contenido} className="teo-contenido">
      {!siempreVisible && <p className="teo-aviso">Este navegador no permite fijar la ventana sobre otras aplicaciones. Usa Chrome o Edge con Picture-in-Picture para mantener a Teo siempre visible.</p>}
      <nav className="teo-vistas" aria-label="Herramientas de Teo">
        <button type="button" aria-pressed={vista === "consulta"} onClick={() => establecerVista("consulta")}><span aria-hidden="true">⌕</span> Consulta rápida</button>
        <button type="button" aria-pressed={vista === "productividad"} onClick={() => { establecerProductividadIniciada(true); establecerVista("productividad"); }}><span aria-hidden="true">▥</span> Productividad</button>
        <button type="button" aria-pressed={vista === "manual"} onClick={() => { establecerManualIniciado(true); establecerVista("manual"); }}><span aria-hidden="true">▤</span> Manual · Prueba</button>
      </nav>
      {manualIniciado && <div hidden={vista !== "manual"}><ConsultaManualTeo alCaducarSesion={alCaducarSesion} /></div>}
      <div className="teo-consulta" hidden={vista !== "consulta"}>
      <form onSubmit={(evento) => { evento.preventDefault(); establecerReintento((valor) => valor + 1); }}>
        <label htmlFor={`${id}-consulta`}>{consulta ? "Nombre, teléfono, enlace, CP o coordenadas" : "Hola, soy Teo. ¿Qué necesitas consultar?"}</label>
        <div className="teo-entrada"><span aria-hidden="true">⌕</span><input ref={input} id={`${id}-consulta`} value={texto} onChange={(evento) => cambiarTexto(evento.target.value)} maxLength={120} autoComplete="off" placeholder="Nombre, CGO, Toolbox, CP o coordenadas" autoFocus />{texto && <button type="button" onClick={() => { cambiarTexto(""); input.current?.focus(); }} aria-label="Limpiar consulta">×</button>}</div>
        {!consulta && <small>Consulta nombres, teléfonos, enlaces, CP o coordenadas.</small>}
      </form>
      {coordenadas.tipo === "validas" && <p className="teo-coordenadas-previa">Latitud: {coordenadas.latitud} · Longitud: {coordenadas.longitud}<small>Comprueba el orden y el punto antes de utilizar la dirección.</small></p>}
      {(coordenadas.tipo === "incompletas" || coordenadas.tipo === "invalidas") && <p className="teo-estado" role="status">{coordenadas.mensaje}</p>}
      {Boolean(busqueda?.telefonos?.length) && <section className="teo-interes" aria-label="Teléfonos de interés"><h2>Teléfonos de interés</h2>{busqueda!.telefonos!.map(t => <article key={t.id} className="teo-tarjeta teo-telefono"><h3>{t.nombre}</h3>{t.descripcion && <p className="teo-nota">{t.descripcion}</p>}<div className="teo-interes-acciones"><a className="teo-numero-telefono" href={`tel:${t.telefono.replace(/[^0-9+]/g, "")}`}>{t.telefono}</a><button type="button" onClick={() => copiar(t.telefono, t.id)} aria-label={`Copiar teléfono de ${t.nombre}`}>{telefonoCopiado === t.id ? "Copiado ✓" : "Copiar"}</button></div></article>)}<small className="teo-nota">Fuente: Teléfonos de interés.{(busqueda?.totalTelefonos ?? 0) > 5 ? ` Se muestran 5 de ${busqueda!.totalTelefonos}; concreta la búsqueda.` : ""}</small></section>}
      {Boolean(busqueda?.enlaces?.length) && <section className="teo-interes" aria-label="Enlaces de interés"><h2>Enlaces de interés</h2><div className="teo-interes-enlaces">{busqueda!.enlaces!.map(e => <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer">Abrir {e.nombre} <span aria-hidden="true">↗</span></a>)}</div><small className="teo-nota">Accesos guardados en Enlaces de interés.{(busqueda?.totalEnlaces ?? 0) > 5 ? ` Se muestran 5 de ${busqueda!.totalEnlaces}; concreta la búsqueda.` : ""}</small></section>}
      {busqueda?.avisosInteres?.map(aviso => <p key={aviso} className="teo-error" role="status">{aviso} <button type="button" onClick={() => establecerReintento(n => n+1)}>Reintentar</button></p>)}
      {deletreo.length > 0 && <article className="teo-tarjeta teo-alfabeto"><div className="teo-titulo-tarjeta"><h2>Alfabeto militar</h2><button type="button" onClick={() => copiar()} aria-label="Copiar deletreo">{copiado ? "Copiado ✓" : "Copiar"}</button></div><p>{deletreo.join(" · ")}</p></article>}
      <div aria-live="polite" aria-busy={buscando}>
        {buscando && <p className="teo-estado">{modoCoordenadas ? "Localizando el punto…" : "Consultando tus herramientas…"}</p>}
        {error && <p className="teo-error" role="alert">{error} <button type="button" onClick={() => establecerReintento((valor) => valor + 1)}>Reintentar</button></p>}
        {ubicacionCoordenadas && <article className="teo-tarjeta teo-ubicacion">
          <h2>Ubicación aproximada</h2>
          <p><strong>{ubicacionCoordenadas.ubicacion.direccionCompleta}</strong></p>
          <p className="teo-provincia">{[ubicacionCoordenadas.ubicacion.localidad, ubicacionCoordenadas.ubicacion.provincia, ubicacionCoordenadas.ubicacion.comunidad, ubicacionCoordenadas.ubicacion.pais].filter(Boolean).join(" · ")}</p>
          <p>Código postal: <strong>{ubicacionCoordenadas.ubicacion.codigoPostal || "No disponible"}</strong></p>
          <div className="teo-mapas">
            <a href={`https://www.openstreetmap.org/?mlat=${ubicacionCoordenadas.ubicacion.latitud}&mlon=${ubicacionCoordenadas.ubicacion.longitud}#map=18/${ubicacionCoordenadas.ubicacion.latitud}/${ubicacionCoordenadas.ubicacion.longitud}`} target="_blank" rel="noopener noreferrer">Abrir mapa</a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${ubicacionCoordenadas.ubicacion.latitud},${ubicacionCoordenadas.ubicacion.longitud}`} target="_blank" rel="noopener noreferrer">Google Maps</a>
            <button type="button" onClick={() => copiar(`${ubicacionCoordenadas.ubicacion.latitud}, ${ubicacionCoordenadas.ubicacion.longitud}`)}>{coordenadasCopiadas ? "Copiado ✓" : "Copiar coordenadas"}</button>
          </div>
          {ubicacionCoordenadas.avisoFse && <p className="teo-estado">{ubicacionCoordenadas.avisoFse}</p>}
          <small className="teo-nota">Fuente: la herramienta Localización (OpenStreetMap). Verifica la dirección y el CP antes de utilizarlos.</small>
        </article>}
        {busqueda && busqueda.total === 0 && !busqueda.telefonos?.length && !busqueda.enlaces?.length && <p className="teo-estado">No encuentro coincidencias en localidades, teléfonos ni enlaces. El deletreo sigue disponible.</p>}
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
      </div>
      <div hidden={vista !== "productividad"}>
        {productividadIniciada && <ConsultaProductividadRapida variante="teo" />}
      </div>
    </div></div>
  </section>;
};
