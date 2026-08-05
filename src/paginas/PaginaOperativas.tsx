import React from "react";
import { Link } from "react-router-dom";
import {
  ElementoSenal, ModalidadRobo, OpcionFlujo, flujo, gruposSenales,
  mapasRobo, modalidades, obtenerAcciones, obtenerComentariosSenal,
} from "../manual/configuracionOperativas";
import logoMovistarProsegur from "../recursos/marca/logo-movistar-prosegur.png";
import { ContenidoProcesoEditable } from "../manual/modeloContenido";
import { procesosPorSlug, slugPorNombreSenal } from "../manual/configuracionProcesos";
import { obtenerProcesoPublicado } from "../servicios/contenidoManual";
import { registrarUso } from "../servicios/estadisticasUso";

/** Icono vectorial de casa para volver a la portada. */
const IconoInicio: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5v-9.7Z" />
  </svg>
);

/** Icono vectorial de calendario para acceder al cuadrante. */
const IconoCuadrante: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 2v3M17 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <path d="M7 13h3M14 13h3M7 17h3M14 17h3" />
  </svg>
);

/** Componente principal del manual interactivo CRA. */
/**
 * Pantalla principal del manual CRA.
 * Coordina el catálogo de señales, la navegación guiada del flujo de robo,
 * los mapas completos y el copiador de comentarios para MasterMind.
 */
export const PaginaOperativas: React.FC = () => {
  React.useEffect(() => {
    registrarUso("uso_manual");
  }, []);

  // El enlace de edición solo aparece para la sesión administradora.
  const [esAdministrador, establecerEsAdministrador] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/sesion", { credentials: "same-origin" })
      .then((respuesta) => respuesta.json())
      .then((sesion: { rol?: string }) => establecerEsAdministrador(sesion.rol === "administrador"))
      .catch(() => establecerEsAdministrador(false));
  }, []);

  // Indica si el flujograma funcional de la señal se encuentra abierto.
  const [flujoIniciado, establecerFlujoIniciado] = React.useState(false);

  // Señal elegida en el catálogo; null significa que todavía no hay selección.
  const [senalSeleccionada, establecerSenalSeleccionada] = React.useState<string | null>(null);

  // Identificador del paso actual dentro del objeto flow.
  const [pasoActual, establecerPasoActual] = React.useState("mode");

  // Modalidad de robo seleccionada en el primer paso.
  const [modalidad, establecerModalidad] = React.useState<ModalidadRobo | null>(null);

  // IDs anteriores: permiten regresar al paso previo sin perder la rama.
  const [historial, establecerHistorial] = React.useState<string[]>([]);

  // Textos de las decisiones tomadas, mostrados como rastro visual.
  const [rastro, establecerRastro] = React.useState<string[]>([]);

  // Controla la apertura del panel flotante de comentarios.
  const [comentariosAbiertos, establecerComentariosAbiertos] = React.useState(false);

  // Alterna entre el asistente de decisiones y la imagen completa del flujo.
  const [vistaFlujo, establecerVistaFlujo] = React.useState<"guided" | "map">("guided");

  // Índice copiado recientemente para mostrar la confirmación "Copiado".
  const [comentarioCopiado, establecerComentarioCopiado] = React.useState<number | null>(null);

  // Cada señal se relaciona con su identificador estable para consultar D1.
  const [slugProceso, establecerSlugProceso] = React.useState<string | null>(null);

  // El contenido incluido en el paquete actúa como respaldo hasta que D1 tenga
  // una versión publicada válida o si temporalmente no puede consultarse.
  const [contenidoProceso, establecerContenidoProceso] = React.useState<ContenidoProcesoEditable>(() => ({
    flujo,
    comentarios: obtenerComentariosSenal("Robo"),
  }));

  React.useEffect(() => {
    if (!slugProceso) return;
    let consultaVigente = true;
    obtenerProcesoPublicado(slugProceso)
      .then((contenidoPublicado) => { if (consultaVigente && contenidoPublicado) establecerContenidoProceso(contenidoPublicado); })
      .catch(() => { /* Se conserva el contenido estable incluido en código. */ });
    return () => { consultaVigente = false; };
  }, [slugProceso]);

  // Valores derivados del estado; no necesitan estados adicionales.
  const pasoVisible = contenidoProceso.flujo[pasoActual] || flujo[pasoActual];
  const esProcesoRobo = slugProceso === "robo";
  const acciones = esProcesoRobo ? obtenerAcciones(pasoActual, modalidad) : [];
  const comentariosVisibles = flujoIniciado ? contenidoProceso.comentarios : obtenerComentariosSenal(senalSeleccionada);
  const mapaActual = modalidad ? mapasRobo[modalidad] : null;

  // Oculta el catálogo y abre el flujo o la pantalla informativa correspondiente.
  const seleccionarSenal = (senal: ElementoSenal) => {
    const slug = slugPorNombreSenal[senal.name];
    establecerSenalSeleccionada(senal.name);
    establecerSlugProceso(slug || null);
    establecerFlujoIniciado(Boolean(slug));
    if (slug) establecerContenidoProceso(JSON.parse(JSON.stringify(procesosPorSlug[slug].contenido)));
    establecerPasoActual("mode");
    establecerModalidad(null);
    establecerHistorial([]);
    establecerRastro([]);
    establecerComentariosAbiertos(false);
    establecerComentarioCopiado(null);
    establecerVistaFlujo("guided");
  };

  // Guarda la decisión actual y avanza al nodo indicado por la opción.
  const seleccionarOpcion = (opcion: OpcionFlujo) => {
    const modalidadSeleccionada = opcion.mode ?? modalidad;
    establecerHistorial((pasoAnterior) => [...pasoAnterior, pasoActual]);
    establecerRastro((rastroAnterior) => [...rastroAnterior, opcion.label]);
    if (opcion.mode) establecerModalidad(opcion.mode);

    // Excepción del manual: en esta combinación se envía el acuda directamente.
    if (esProcesoRobo && pasoActual === "no-answer" && opcion.next === "not-confirmed" && modalidadSeleccionada === "acuda-sin-aviso") {
      establecerPasoActual("acuda-direct");
      return;
    }

    establecerPasoActual(opcion.next);
  };

  // Recupera el último nodo visitado y elimina la última decisión del rastro.
  const volverPaso = () => {
    const pasoAnterior = historial[historial.length - 1];
    if (!pasoAnterior) return;
    establecerPasoActual(pasoAnterior);
    establecerHistorial((pasos) => pasos.slice(0, -1));
    establecerRastro((decisiones) => decisiones.slice(0, -1));
    if (pasoAnterior === "mode") establecerModalidad(null);
  };

  // Devuelve todos los estados a sus valores iniciales y muestra el catálogo.
  const reiniciarFlujo = () => {
    establecerFlujoIniciado(false);
    establecerSenalSeleccionada(null);
    establecerSlugProceso(null);
    establecerPasoActual("mode");
    establecerModalidad(null);
    establecerHistorial([]);
    establecerRastro([]);
    establecerVistaFlujo("guided");
  };

  /**
   * Copia un comentario al portapapeles.
   * navigator.clipboard es el método moderno; el bloque catch mantiene la
   * funcionalidad en navegadores o contextos donde ese permiso no está disponible.
   */
  const copiarComentario = async (comentario: string, indice: number) => {
    try {
      await navigator.clipboard.writeText(comentario);
    } catch {
      const areaTexto = document.createElement("textarea");
      areaTexto.value = comentario;
      areaTexto.style.position = "fixed";
      areaTexto.style.opacity = "0";
      document.body.appendChild(areaTexto);
      areaTexto.select();
      document.execCommand("copy");
      document.body.removeChild(areaTexto);
    }

    // Mostramos una confirmación breve y después restauramos el botón.
    registrarUso("copia_comentario");
    establecerComentarioCopiado(indice);
    window.setTimeout(() => establecerComentarioCopiado(null), 1800);
  };

  // Simplifica las condiciones visuales de la rama especial de acuda directo.
  const acudaDirecto = esProcesoRobo && pasoActual === "acuda-direct";

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="company-brand">
            <div className="company-logo-crop">
              <img src={logoMovistarProsegur} alt="Movistar Prosegur Alarmas" />
            </div>
          </div>
          <div className="header-copy">
            <span className="brand-kicker">Manual interactivo CRA</span>
            <h1>Gestión guiada de señales</h1>
            <p>Selecciona una señal y avanza por el procedimiento paso a paso.</p>
            <div className="portal-shortcuts">
              <Link className="portal-link portal-link-secondary" to="/">
                <IconoInicio />
                <span>Inicio</span>
              </Link>
              <Link className="portal-link portal-link-primary" to="/cuadrante">
                <IconoCuadrante />
                <span>Consultar cuadrante</span>
              </Link>
              {esAdministrador && (
                <Link className="portal-link portal-link-administracion" to="/administracion/manual">
                  <span>Configurar</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* El catálogo solo se muestra mientras no exista una señal seleccionada. */}
        {!senalSeleccionada && (
          <nav className="signal-catalogue" aria-label="Tipos de señal">
            {gruposSenales.map((grupo, indiceGrupo) => (
              <section className="signal-group" key={grupo.title}>
                <div className="signal-group-heading">
                  <h2>{grupo.title}</h2>
                  <p>{grupo.description}</p>
                </div>
                <div className="signal-menu">
                  {grupo.items.map((senal, indiceElemento) => (
                    <button
                      className="signal-button"
                      key={senal.name}
                      onClick={() => seleccionarSenal(senal)}
                      style={{
                        "--signal-color": senal.color,
                        "--signal-delay": `${indiceGrupo * 90 + indiceElemento * 45}ms`,
                      } as React.CSSProperties}
                    >
                      <span className="signal-icon" aria-hidden="true">{senal.icon}</span>
                      <strong>{senal.name}</strong>
                      <small>{slugPorNombreSenal[senal.name] ? "Abrir procedimiento" : "Ver comentarios"}</small>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </nav>
        )}

        {/* Elegimos entre bienvenida, señal pendiente o flujograma funcional. */}
        {!senalSeleccionada ? (
          <section className="flow-welcome">
            <div className="flow-welcome-icon" aria-hidden="true">→</div>
            <h2>Selecciona una señal para comenzar</h2>
            <p>Empezaremos con el procedimiento de robo extraído del manual del operador.</p>
          </section>
        ) : !flujoIniciado ? (
          <section className="flow-shell signal-pending" aria-live="polite">
            <div className="flow-topbar">
              <div>
                <span className="flow-label">Señal activa</span>
                <strong>{senalSeleccionada}</strong>
              </div>
              <button className="reiniciarFlujo-button" onClick={reiniciarFlujo}><span aria-hidden="true">↻</span>Cambiar señal</button>
            </div>
            <div className="pending-content">
              <span aria-hidden="true">✎</span>
              <h2>Comentarios preparados</h2>
              <p>El procedimiento guiado de esta señal se añadirá más adelante. Ya puedes abrir los comentarios frecuentes específicos desde el botón inferior.</p>
              <button onClick={() => establecerComentariosAbiertos(true)}>Abrir comentarios de {senalSeleccionada}</button>
            </div>
          </section>
        ) : (
          <section className="flow-shell" aria-live="polite">
            <div className="flow-topbar">
              <div>
                <span className="flow-label">Señal activa</span>
                <strong>{senalSeleccionada}{esProcesoRobo && modalidad ? ` · ${modalidades[modalidad]}` : ""}</strong>
              </div>
              <div className="flow-topbar-acciones">
                {esProcesoRobo && modalidad && (
                  <button
                    className="map-primary-button"
                    onClick={() => establecerVistaFlujo((vista) => vista === "guided" ? "map" : "guided")}
                  >
                    {vistaFlujo === "guided" ? `▦ Ver mapa · ${modalidades[modalidad]}` : "← Volver al paso a paso"}
                  </button>
                )}
                <button className="reiniciarFlujo-button" onClick={reiniciarFlujo}><span aria-hidden="true">↻</span>Reiniciar</button>
              </div>
            </div>

            {esProcesoRobo && <div className="flow-view-switch" aria-label="Vista del procedimiento">
              <button className={vistaFlujo === "guided" ? "active" : ""} onClick={() => establecerVistaFlujo("guided")}>
                Paso a paso
              </button>
              <button
                className={vistaFlujo === "map" ? "active" : ""}
                onClick={() => establecerVistaFlujo("map")}
                disabled={!modalidad}
                title={!modalidad ? "Primero elige la modalidad de robo" : undefined}
              >
                {modalidad ? "Mapa de esta modalidad" : "Elige modalidad"}
              </button>
            </div>}

            {esProcesoRobo && vistaFlujo === "map" && modalidad && mapaActual ? (
              <section className="complete-map" aria-label="Mapa completo del procedimiento de robo">
                <div className="complete-map-heading">
                  <div>
                    <span>Vista general</span>
                    <h2>{modalidades[modalidad]}</h2>
                    <p>Pulsa la imagen para abrirla a tamaño completo y seguir todas las ramas.</p>
                  </div>
                  <a href={mapaActual} target="_blank" rel="noreferrer">Ampliar mapa ↗</a>
                </div>
                <a className="map-image-link" href={mapaActual} target="_blank" rel="noreferrer">
                  <img src={mapaActual} alt={`Flujograma completo: ${modalidades[modalidad]}`} />
                </a>
              </section>
            ) : (
              <>
                {rastro.length > 0 && (
                  <ol className="flow-rastro" aria-label="Decisiones tomadas">
                    {rastro.map((decision, indice) => <li key={`${decision}-${indice}`}>{decision}</li>)}
                  </ol>
                )}

                <article key={pasoActual} className={`flow-card ${(pasoVisible.result || acudaDirecto) ? "result" : ""}`}>
                  <span className="flow-eyebrow">{acudaDirecto ? "Resultado · Alarma no confirmada" : pasoVisible.eyebrow}</span>
                  <h2>{acudaDirecto ? "Envía el acuda" : pasoVisible.title}</h2>
                  <p>{acudaDirecto ? "En robo con acuda sin aviso, si no contestan y la alarma no está confirmada, se envía el servicio de acuda." : pasoVisible.description}</p>

                  {pasoVisible.options && (
                    <div className="decision-grid">
                      {pasoVisible.options.map((opcion) => (
                        <button key={opcion.label} onClick={() => seleccionarOpcion(opcion)}>{opcion.label}</button>
                      ))}
                    </div>
                  )}

                  {acciones.length > 0 && (
                    <div className="accion-sequence">
                      <span>Orden de actuación</span>
                      <ol>{acciones.map((accion) => <li key={accion}>{accion}</li>)}</ol>
                    </div>
                  )}

                  {(pasoVisible.result || acudaDirecto) && (
                    <div className="result-notice">Fin de esta rama · Registra la gestión realizada</div>
                  )}
                </article>

                <div className="flow-controls">
                  <button onClick={volverPaso} disabled={historial.length === 0}>← Volver al paso anterior</button>
                  <span>{historial.length + 1} pasos visualizados</span>
                </div>

                <aside className="operator-reminder">
                  <strong>Recordatorio del manual</strong>
                  <p>Con volumen de trabajo alto, solo se dejan recordatorios en alarmas confirmadas por vídeo o cuando el cliente lo solicita o va a realizar una comprobación.</p>
                </aside>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer"><p>Manual interactivo de apoyo al operador · Prototipo</p></footer>

      <div className={`comments-widget ${comentariosAbiertos ? "open" : ""}`}>
        {/* El panel se monta únicamente cuando está abierto. */}
        {comentariosAbiertos && (
          <section className="comments-panel" aria-label="Comentarios frecuentes">
            <div className="comments-panel-header">
              <div>
                <span>Textos para MasterMind</span>
                <h2>{senalSeleccionada ? `Comentarios · ${senalSeleccionada}` : "Comentarios frecuentes"}</h2>
              </div>
              <button onClick={() => establecerComentariosAbiertos(false)} aria-label="Cerrar comentarios">×</button>
            </div>
            <p className="comments-help">Pulsa un comentario para copiarlo al portapapeles.</p>
            <div className="comments-list">
              {/* Cada comentario completo funciona como botón de copia. */}
              {comentariosVisibles.map((comentario, indice) => (
                <button
                  className={comentarioCopiado === indice ? "copied" : ""}
                  key={comentario}
                  onClick={() => copiarComentario(comentario, indice)}
                >
                  <span>{comentario}</span>
                  <strong>{comentarioCopiado === indice ? "Copiado ✓" : "Copiar"}</strong>
                </button>
              ))}
            </div>
          </section>
        )}
        <button
          className="comments-trigger"
          onClick={() => establecerComentariosAbiertos((abierto) => !abierto)}
          aria-expanded={comentariosAbiertos}
        >
          <span aria-hidden="true">✎</span>
          {comentariosAbiertos ? "Cerrar" : "Comentarios frecuentes"}
        </button>
      </div>
    </div>
  );
};

export default PaginaOperativas;


