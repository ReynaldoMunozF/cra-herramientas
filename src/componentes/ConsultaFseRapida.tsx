import React from "react";
import { LocalizacionPostal, localizarCodigoPostal } from "../servicios/localizacionPostal";
import { registrarUso } from "../servicios/estadisticasUso";
import iconoFse from "../recursos/herramientas/fse.svg";

interface OrientacionFse {
  principal: string;
  concurrentes: string[];
  criterio: string;
  confianza: "alta" | "media" | "baja";
}

const cuerposFse = [
  "Policía Nacional",
  "Guardia Civil",
  "Mossos d’Esquadra",
  "Ertzaintza",
  "Policía Foral de Navarra",
  "Otro / requiere revisión",
];

/** Capital de cada provincia, indexada por los dos primeros dígitos postales. */
const capitalesProvincia: Record<string, string> = {
  "01": "Vitoria-Gasteiz", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Palma", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón de la Plana",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Donostia-San Sebastián",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León", "25": "Lleida",
  "26": "Logroño", "27": "Lugo", "28": "Madrid", "29": "Málaga", "30": "Murcia",
  "31": "Pamplona", "32": "Ourense", "33": "Oviedo", "34": "Palencia",
  "35": "Las Palmas de Gran Canaria", "36": "Pontevedra", "37": "Salamanca",
  "38": "Santa Cruz de Tenerife", "39": "Santander", "40": "Segovia", "41": "Sevilla",
  "42": "Soria", "43": "Tarragona", "44": "Teruel", "45": "Toledo", "46": "Valencia",
  "47": "Valladolid", "48": "Bilbao", "49": "Zamora", "50": "Zaragoza",
  "51": "Ceuta", "52": "Melilla",
};

/** Simplifica acentos y variantes para comparar nombres obtenidos de servicios externos. */
const normalizar = (texto = "") => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Demarcaciones confirmadas mediante fuentes oficiales.
 * Se identifican por municipio y provincia para que la corrección se aplique a
 * todos los códigos postales de la localidad, no únicamente a uno concreto.
 */
const demarcacionesVerificadas: Record<string, string> = {
  "pozuelo de alarcon|madrid": "Policía Nacional",
  "parla|madrid": "Policía Nacional",
};

/**
 * Genera una orientación, no una asignación operativa. Las policías autonómicas
 * con despliegue integral se priorizan; en el resto se aplica una aproximación
 * capital/no capital que siempre debe verificarse con la demarcación oficial.
 */
const calcularOrientacion = (codigoPostal: string, ubicacion: LocalizacionPostal): OrientacionFse => {
  const comunidad = normalizar(ubicacion.comunidad);
  const claveMunicipio = `${normalizar(ubicacion.nombre)}|${normalizar(ubicacion.provincia)}`;
  const cuerpoVerificado = demarcacionesVerificadas[claveMunicipio];

  if (comunidad.includes("catalu") || comunidad.includes("catalon")) {
    return { principal: "Mossos d’Esquadra", concurrentes: ["Policía Nacional", "Guardia Civil"], criterio: "Policía autonómica con despliegue territorial en Cataluña.", confianza: "media" };
  }
  if (comunidad.includes("pais vasco") || comunidad.includes("euskadi") || comunidad.includes("basque")) {
    return { principal: "Ertzaintza", concurrentes: ["Policía Nacional", "Guardia Civil"], criterio: "Policía autonómica con despliegue territorial en el País Vasco.", confianza: "media" };
  }
  if (comunidad.includes("navarra") || comunidad.includes("navarre")) {
    return { principal: "Policía Foral de Navarra", concurrentes: ["Policía Nacional", "Guardia Civil"], criterio: "En Navarra existen competencias concurrentes que dependen del servicio y la demarcación.", confianza: "baja" };
  }
  if (cuerpoVerificado) {
    return {
      principal: cuerpoVerificado,
      concurrentes: cuerpoVerificado === "Policía Nacional" ? ["Guardia Civil"] : ["Policía Nacional"],
      criterio: "Demarcación del municipio contrastada mediante fuentes oficiales.",
      confianza: "media",
    };
  }

  const capital = capitalesProvincia[codigoPostal.slice(0, 2)];
  const pareceCapital = capital && (
    normalizar(ubicacion.nombre).includes(normalizar(capital)) ||
    normalizar(capital).includes(normalizar(ubicacion.nombre))
  );

  if (pareceCapital) {
    return { principal: "Policía Nacional", concurrentes: ["Guardia Civil"], criterio: "Orientación basada en que la localidad coincide con una capital de provincia.", confianza: "media" };
  }

  return { principal: "Guardia Civil", concurrentes: ["Policía Nacional"], criterio: "Orientación aproximada para una localidad no identificada como capital; existen municipios urbanos con Policía Nacional.", confianza: "baja" };
};

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
      const orientacionCalculada = calcularOrientacion(codigoPostal, ubicacionEncontrada);
      const respuestaCorreccion = await fetch(`/api/validaciones-fse?codigoPostal=${encodeURIComponent(codigoPostal)}`);
      const correccionGuardada = respuestaCorreccion.ok
        ? await respuestaCorreccion.json() as {
          resultadoCorregido?: string | null;
          resultadoConfirmado?: string | null;
        }
        : { resultadoCorregido: null, resultadoConfirmado: null };

      establecerUbicacion(ubicacionEncontrada);
      const orientacionPersistida = correccionGuardada.resultadoCorregido ? {
        ...orientacionCalculada,
        principal: correccionGuardada.resultadoCorregido,
        concurrentes: orientacionCalculada.principal === correccionGuardada.resultadoCorregido
          ? orientacionCalculada.concurrentes
          : [orientacionCalculada.principal, ...orientacionCalculada.concurrentes.filter(
            (cuerpo) => cuerpo !== correccionGuardada.resultadoCorregido,
        )],
        criterio: "Resultado actualizado con la última corrección registrada para este código postal.",
      } : orientacionCalculada;
      establecerOrientacion(
        correccionGuardada.resultadoConfirmado === orientacionPersistida.principal
          ? {
            ...orientacionPersistida,
            confianza: "alta",
            criterio: "Resultado confirmado previamente como correcto por un operador.",
          }
          : orientacionPersistida,
      );
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
