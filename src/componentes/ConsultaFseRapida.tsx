import React from "react";
import { LocalizacionPostal, localizarCodigoPostal } from "../servicios/localizacionPostal";
import { registrarUso } from "../servicios/estadisticasUso";
import { OrientacionFse, consultarOrientacionFse } from "../servicios/orientacionFse";
import iconoFse from "../recursos/herramientas/fse.svg";

const cuerposFse = [
  "Policía Nacional",
  "Guardia Civil",
  "Mossos d’Esquadra",
  "Ertzaintza",
  "Policía Foral de Navarra",
  "Otro / requiere revisión",
];

/** Panel flotante para consultar de forma orientativa el cuerpo territorial. */
export const ConsultaFseRapida: React.FC = () => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [codigoPostal, establecerCodigoPostal] = React.useState("");
  const [ubicacion, establecerUbicacion] = React.useState<LocalizacionPostal | null>(null);
  const [orientacion, establecerOrientacion] = React.useState<OrientacionFse | null>(null);
  const [cargando, establecerCargando] = React.useState(false);
  const [error, establecerError] = React.useState("");
  const [mostrarCorreccion, establecerMostrarCorreccion] = React.useState(false);
  const [cuerpoCorregido, establecerCuerpoCorregido] = React.useState("");
  const [enviandoValidacion, establecerEnviandoValidacion] = React.useState(false);
  const [validacionEnviada, establecerValidacionEnviada] = React.useState(false);
  const [errorValidacion, establecerErrorValidacion] = React.useState("");

  // Solo se mantiene abierta una herramienta flotante cada vez.
  React.useEffect(() => {
    const cerrarAnteOtraHerramienta = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "fse") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAnteOtraHerramienta);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAnteOtraHerramienta);
  }, []);

  const alternarPanel = () => {
    if (abierto) {
      establecerAbierto(false);
      window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "ninguna" }));
    } else {
      window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "fse" }));
      establecerAbierto(true);
    }
  };

  const cerrarPanel = () => {
    establecerAbierto(false);
    window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "ninguna" }));
  };

  const consultarFse = async (evento: React.FormEvent) => {
    evento.preventDefault();
    establecerError("");
    establecerUbicacion(null);
    establecerOrientacion(null);
    establecerMostrarCorreccion(false);
    establecerCuerpoCorregido("");
    establecerValidacionEnviada(false);
    establecerErrorValidacion("");
    if (!/^\d{5}$/.test(codigoPostal)) {
      establecerError("Introduce un código postal español de cinco cifras.");
      return;
    }

    establecerCargando(true);
    try {
      const ubicacionEncontrada = await localizarCodigoPostal(codigoPostal);
      const resultado = await consultarOrientacionFse(codigoPostal, ubicacionEncontrada);
      establecerUbicacion(ubicacionEncontrada);
      establecerOrientacion(resultado.orientacion);
      registrarUso("consulta_fse");
    } catch (errorConsulta) {
      establecerError(errorConsulta instanceof Error ? errorConsulta.message : "Ha ocurrido un error.");
    } finally {
      establecerCargando(false);
    }
  };

  /** Envía una comprobación anónima para poder mejorar la tabla de demarcaciones. */
  const enviarValidacion = async (esCorrecto: boolean) => {
    if (!ubicacion || !orientacion || enviandoValidacion || validacionEnviada) return;
    if (!esCorrecto && !cuerpoCorregido) {
      establecerErrorValidacion("Selecciona el cuerpo correcto.");
      return;
    }

    establecerEnviandoValidacion(true);
    establecerErrorValidacion("");
    try {
      const respuesta = await fetch("/api/validaciones-fse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoPostal,
          municipio: ubicacion.nombre,
          provincia: ubicacion.provincia || "",
          resultadoMostrado: orientacion.principal,
          esCorrecto,
          resultadoCorregido: esCorrecto ? "" : cuerpoCorregido,
        }),
      });
      const resultado = await respuesta.json() as { error?: string };
      if (!respuesta.ok) throw new Error(resultado.error || "No se ha podido guardar la comprobación.");
      if (!esCorrecto) {
        establecerOrientacion((orientacionActual) => orientacionActual ? {
          ...orientacionActual,
          principal: cuerpoCorregido,
          concurrentes: orientacionActual.principal === cuerpoCorregido
            ? orientacionActual.concurrentes
            : [orientacionActual.principal, ...orientacionActual.concurrentes.filter((cuerpo) => cuerpo !== cuerpoCorregido)],
          criterio: "Resultado corregido por el operador durante esta consulta.",
        } : null);
      } else {
        establecerOrientacion((orientacionActual) => orientacionActual ? {
          ...orientacionActual,
          confianza: "alta",
          criterio: "Resultado confirmado como correcto por el operador.",
        } : null);
      }
      establecerValidacionEnviada(true);
      establecerMostrarCorreccion(false);
    } catch (errorEnvio) {
      establecerErrorValidacion(errorEnvio instanceof Error ? errorEnvio.message : "No se ha podido guardar.");
    } finally {
      establecerEnviandoValidacion(false);
    }
  };

  return (
    <aside className={`fse-rapido ${abierto ? "abierto" : ""}`}>
      {abierto && (
        <section className={`fse-rapido-panel ${ubicacion && orientacion ? "con-resultado" : ""}`} aria-label="Orientación rápida de fuerzas de seguridad">
          <header>
            <div><span>Consulta referencial</span><h2>Fuerza de seguridad</h2></div>
            <button onClick={cerrarPanel} aria-label="Cerrar consulta">×</button>
          </header>
          <div className="fse-advertencia"><strong>No es una asignación definitiva.</strong> Confirma siempre la demarcación mediante el procedimiento y las fuentes corporativas.</div>
          <form onSubmit={consultarFse}>
            <label htmlFor="codigo-postal-fse">Código postal</label>
            <div>
              <input id="codigo-postal-fse" value={codigoPostal} onChange={(evento) => establecerCodigoPostal(evento.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" autoComplete="postal-code" placeholder="Ejemplo: 28001" autoFocus />
              <button type="submit" disabled={cargando}>{cargando ? "…" : "Consultar"}</button>
            </div>
            {error && <p className="fse-error" role="alert">{error}</p>}
          </form>

          {ubicacion && orientacion && (
            <section className="fse-validacion" aria-label="Comprobar resultado">
              {validacionEnviada ? (
                <p className="fse-validacion-exito" role="status">
                  {cuerpoCorregido
                    ? `Corregido: ahora se muestra ${cuerpoCorregido}.`
                    : "Gracias. La comprobación se ha guardado."}
                </p>
              ) : (
                <>
                  <strong>¿Es correcto este resultado?</strong>
                  <div className="fse-validacion-botones">
                    <button type="button" onClick={() => enviarValidacion(true)} disabled={enviandoValidacion}>
                      Sí
                    </button>
                    <button type="button" className="incorrecto" onClick={() => establecerMostrarCorreccion(true)} disabled={enviandoValidacion}>
                      Corregir
                    </button>
                  </div>
                  {mostrarCorreccion && (
                    <div className="fse-correccion">
                      <label htmlFor="cuerpo-fse-correcto">Cuerpo correcto</label>
                      <select id="cuerpo-fse-correcto" value={cuerpoCorregido} onChange={(evento) => establecerCuerpoCorregido(evento.target.value)}>
                        <option value="">Selecciona una opción</option>
                        {cuerposFse.filter((cuerpo) => cuerpo !== orientacion.principal).map((cuerpo) => (
                          <option key={cuerpo} value={cuerpo}>{cuerpo}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => enviarValidacion(false)} disabled={enviandoValidacion}>
                        {enviandoValidacion ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                  )}
                  {errorValidacion && <p className="fse-validacion-error" role="alert">{errorValidacion}</p>}
                </>
              )}
            </section>
          )}

          {ubicacion && orientacion && (
            <div className="fse-resultado" aria-live="polite">
              <span className={`fse-confianza ${orientacion.confianza}`}>Fiabilidad {orientacion.confianza}</span>
              <small>{codigoPostal} · {ubicacion.nombre}{ubicacion.provincia ? ` · ${ubicacion.provincia}` : ""}</small>
              <h3>{orientacion.principal}</h3>
              <p>{orientacion.criterio}</p>
              <div><strong>También puede intervenir:</strong> {orientacion.concurrentes.join(" · ")}</div>
              <p className="fse-exclusion">Policía Local excluida de esta consulta.</p>
            </div>
          )}
        </section>
      )}
      <button className="fse-activador" data-nombre="Fuerzas de seguridad" onClick={alternarPanel} aria-expanded={abierto} aria-label="Fuerzas de seguridad" title="Fuerzas de seguridad">
        <span className="fse-activador-icono herramienta-menu-icono" aria-hidden="true">
          <img src={iconoFse} alt="" />
        </span>
        <span className="fse-activador-texto"><small>Consulta orientativa</small><strong>Fuerzas de seguridad</strong></span>
      </button>
    </aside>
  );
};
