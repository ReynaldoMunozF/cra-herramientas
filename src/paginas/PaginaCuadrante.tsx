import React from "react";
import { Link } from "react-router-dom";
import { CalendarioMensual } from "../cuadrante/componentes/CalendarioMensual";
import { CUADRANTES, FECHA_ACTUALIZACION_CUADRANTES } from "../cuadrante/constantes";
import { OperadorCuadrante } from "../cuadrante/tipos";
import { calcularRecomendaciones, normalizarTexto } from "../cuadrante/utilidades";
import { usarCuadrantesActualizados } from "../cuadrante/usarCuadrantesActualizados";
import { registrarUso } from "../servicios/estadisticasUso";

export const PaginaCuadrante: React.FC = () => {
  const cuadrantes = usarCuadrantesActualizados();
  React.useEffect(() => {
    registrarUso("uso_cuadrante");
  }, []);

  // Abre el mes actual cuando está disponible y usa el más reciente como respaldo.
  const [idCuadrante, establecerIdCuadrante] = React.useState(() => {
    const ahora = new Date();
    return CUADRANTES.find(
      (mes) => mes.numeroMes === ahora.getMonth() + 1 && mes.anio === ahora.getFullYear()
    )?.id ?? CUADRANTES[0].id;
  });
  const cuadrante = cuadrantes.find((mes) => mes.id === idCuadrante) ?? cuadrantes[0];
  const operadoresMes = cuadrante.operadores;
  const partesHoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const valorFecha = (tipo: Intl.DateTimeFormatPartTypes) => Number(partesHoy.find((parte) => parte.type === tipo)?.value);
  const diaActual = valorFecha("year") === cuadrante.anio && valorFecha("month") === cuadrante.numeroMes ? valorFecha("day") - 1 : null;
  // Texto controlado del buscador de matrículas.
  const [consulta, establecerConsulta] = React.useState("");

  // Código interno del operador cuyo cuadrante actúa como referencia.
  const [codigoSeleccionado, establecerCodigoSeleccionado] = React.useState<string | null>(null);

  // Índice base cero del día que el operador principal desea librar.
  const [diaSeleccionado, establecerDiaSeleccionado] = React.useState<number | null>(null);

  // Código del segundo operador elegido para comparar ambos calendarios.
  const [codigoComparacion, establecerCodigoComparacion] = React.useState<string | null>(null);

  // Día recomendado en el que el operador principal devolverá el turno.
  const [diaDevolucion, establecerDiaDevolucion] = React.useState<number | null>(null);

  // Estados puramente visuales del generador de correo.
  const [mostrarCorreo, establecerMostrarCorreo] = React.useState(false);
  const [correoCopiado, establecerCorreoCopiado] = React.useState(false);

  const consultaNormalizada = normalizarTexto(consulta);
  const operadorSeleccionado = operadoresMes.find((operador) => operador.codigo === codigoSeleccionado) ?? null;
  const operadorComparado = operadoresMes.find((operador) => operador.codigo === codigoComparacion) ?? null;

  // La matrícula es el único dato necesario para localizar a un operador.
  // No buscamos por nombre para proteger la identidad del resto del equipo.
  const resultados = consultaNormalizada
    ? operadoresMes
        .filter((operador) => normalizarTexto(operador.matricula).includes(consultaNormalizada))
        .slice(0, 10)
    : [];

  /** Abre un cuadrante como referencia y limpia cualquier comparación anterior. */
  const seleccionarOperador = (operador: OperadorCuadrante) => {
    establecerCodigoSeleccionado(operador.codigo);
    establecerConsulta(operador.matricula);
    establecerDiaSeleccionado(null);
    establecerCodigoComparacion(null);
    establecerDiaDevolucion(null);
    establecerMostrarCorreo(false);
  };

  /** Cambia el mes y limpia selecciones que pertenecían al cuadrante anterior. */
  const cambiarCuadrante = (nuevoId: string) => {
    establecerIdCuadrante(nuevoId);
    establecerConsulta("");
    establecerCodigoSeleccionado(null);
    establecerDiaSeleccionado(null);
    establecerCodigoComparacion(null);
    establecerDiaDevolucion(null);
    establecerMostrarCorreo(false);
  };

  /** Añade el segundo cuadrante sin sustituir el calendario del operador principal. */
  const abrirCuadranteCandidato = (operador: OperadorCuadrante) => {
    establecerCodigoComparacion(operador.codigo);
    establecerDiaDevolucion(null);
    establecerMostrarCorreo(false);
    // Conservamos el cuadrante original y desplazamos la vista a la comparación.
    window.requestAnimationFrame(() => {
      document.querySelector(".comparison-schedule")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const diasTrabajados = operadorSeleccionado
    ? operadorSeleccionado.dias.filter((codigo) => codigo && codigo !== "VC" && codigo !== "VAC" && codigo !== "BJ").length
    : 0;
  const diasVacaciones = operadorSeleccionado?.dias.filter((codigo) => codigo === "VC" || codigo === "VAC").length ?? 0;
  const diasLibres = operadorSeleccionado?.dias.filter((codigo) => !codigo).length ?? 0;

  // Para facilitar un cambio, buscamos compañeros que estén LIBRES en la fecha
  // elegida y que pertenezcan al mismo grupo horario (mañana, tarde o noche).
  // Los nombres permanecen anonimizados y se utiliza la matrícula para identificarlos.
  const turnoSeleccionado = diaSeleccionado !== null && operadorSeleccionado ? operadorSeleccionado.dias[diaSeleccionado] : "";
  const candidatosCambio = turnoSeleccionado
    ? operadoresMes.filter(
        (operador) =>
          operador.codigo !== operadorSeleccionado?.codigo && !operador.dias[diaSeleccionado as number]
          && operador.grupo === operadorSeleccionado?.grupo
      )
    : [];

  // Simulamos todos los días en los que el operador principal libra y el
  // candidato trabaja. La puntuación premia descansos largos y penaliza las
  // rachas de trabajo excesivas después del intercambio.
  const recomendaciones = calcularRecomendaciones(
    operadorSeleccionado,
    operadorComparado,
    diaSeleccionado
  );

  const recomendacionElegida = recomendaciones.find((recomendacion) => recomendacion.indiceDia === diaDevolucion) ?? null;
  const asuntoCorreo = operadorSeleccionado && operadorComparado && diaSeleccionado !== null && recomendacionElegida
    ? `CAMBIO DE TURNO ${operadorSeleccionado.matricula} - ${operadorComparado.matricula} | Días ${diaSeleccionado + 1} y ${recomendacionElegida.indiceDia + 1} de ${cuadrante.mes}`
    : "";
  const cuerpoCorreo = operadorSeleccionado && operadorComparado && diaSeleccionado !== null && recomendacionElegida
    ? `Buenos días:

Se solicita el siguiente cambio de turno, por favor:

${operadorSeleccionado.matricula}:
Hará el día ${recomendacionElegida.indiceDia + 1} DE ${cuadrante.mesMayusculas} el turno ${recomendacionElegida.turno}, correspondiente a ${operadorComparado.matricula}.

${operadorComparado.matricula}:
Hará el día ${diaSeleccionado + 1} DE ${cuadrante.mesMayusculas} el turno ${turnoSeleccionado}, correspondiente a ${operadorSeleccionado.matricula}.

Quedamos pendientes de confirmación.

Muchas gracias.
Un saludo,

${operadorSeleccionado.nombre === "Operador CRA" ? operadorSeleccionado.matricula : operadorSeleccionado.nombre}
Operador CRA`
    : "";

  /**
   * Construye el texto final y usa la API del portapapeles del navegador.
   * La vista previa permanece disponible si el navegador bloquea el copiado automático.
   */
  const generarYCopiarCorreo = async () => {
    if (!asuntoCorreo || !cuerpoCorreo) return;
    establecerMostrarCorreo(true);
    try {
      await navigator.clipboard.writeText(`ASUNTO: ${asuntoCorreo}\n\n${cuerpoCorreo}`);
      establecerCorreoCopiado(true);
      window.setTimeout(() => establecerCorreoCopiado(false), 2600);
    } catch {
      establecerCorreoCopiado(false);
    }
  };

  return (
    <div className="schedule-page">
      <header className="schedule-header">
        <div>
          <span>Central Receptora de Alarmas</span>
          <h1>Cuadrante de {cuadrante.mes} {cuadrante.anio}</h1>
          <p>Introduce tu matrícula y consulta el horario mensual desde cualquier dispositivo.</p>
        </div>
        <div className="schedule-header-actions"><label htmlFor="selector-mes">Mes disponible</label><select id="selector-mes" value={idCuadrante} onChange={(evento) => cambiarCuadrante(evento.target.value)}>{cuadrantes.map((mes) => <option value={mes.id} key={mes.id}>{mes.mes.charAt(0).toUpperCase() + mes.mes.slice(1)} {mes.anio}</option>)}</select><Link to="/">← Volver al inicio</Link></div>
      </header>
      <p className="cuadrante-fecha-actualizacion">
        <span aria-hidden="true">✓</span>
        Cuadrantes actualizados al {FECHA_ACTUALIZACION_CUADRANTES}
      </p>

      <main className="schedule-main">
        <section className="operator-search" aria-label="Buscar operador">
          <label htmlFor="operador-consulta">Matrícula del operador</label>
          <div className="operator-search-box">
            <span aria-hidden="true">⌕</span>
            <input
              id="operador-consulta"
              value={consulta}
              onChange={(evento) => {
                establecerConsulta(evento.target.value);
                establecerCodigoSeleccionado(null);
                establecerDiaSeleccionado(null);
              }}
              placeholder="Ejemplo: RMI"
              autoComplete="off"
            />
            {consulta && (
              <button
                type="button"
                onClick={() => {
                  establecerConsulta("");
                  establecerCodigoSeleccionado(null);
                  establecerDiaSeleccionado(null);
                }}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          {!operadorSeleccionado && consulta && (
            <div className="operator-results">
              {resultados.length > 0 ? (
                resultados.map((operador) => (
                  <button key={operador.codigo} onClick={() => seleccionarOperador(operador)}>
                    <strong>{operador.matricula}</strong>
                    <span>{operador.nombre}</span>
                    <small>Ver cuadrante</small>
                  </button>
                ))
              ) : (
                <p>No se encontró ningún operador con ese texto.</p>
              )}
            </div>
          )}
        </section>

        {!operadorSeleccionado ? (
          <section className="schedule-empty">
            <div aria-hidden="true">31</div>
            <h2>Consulta tu cuadrante individual</h2>
            <p>Introduce tu matrícula de CRA y selecciona el resultado para abrir el calendario.</p>
          </section>
        ) : (
          <section className="operator-schedule" aria-live="polite">
            <div className="operator-summary">
              <div className="operator-identity">
                <span>{operadorSeleccionado.matricula}</span>
                <div>
                  <h2>{operadorSeleccionado.nombre}</h2>
                  <p>Matrícula {operadorSeleccionado.matricula}</p>
                </div>
              </div>
              <div className="schedule-stats">
                <div><strong>{operadorSeleccionado.horas}</strong><span>Horas</span></div>
                <div><strong>{diasTrabajados}</strong><span>Turnos</span></div>
                <div><strong>{diasLibres}</strong><span>Libres</span></div>
                <div><strong>{diasVacaciones}</strong><span>Vacaciones</span></div>
              </div>
            </div>

            <div className="schedule-legend" aria-label="Leyenda de turnos">
              <span className="morning">Mañana</span>
              <span className="afternoon">Tarde</span>
              <span className="night">Noche</span>
              <span className="vacation">Vacaciones</span>
              <span className="leave">Baja</span>
              <span className="off">Libre</span>
            </div>

            <CalendarioMensual
              dias={operadorSeleccionado.dias}
              nombreAccesible={`Horario de ${operadorSeleccionado.nombre} en ${cuadrante.mes} de ${cuadrante.anio}`}
              desplazamientoPrimerDia={cuadrante.desplazamientoPrimerDia}
              diaActual={diaActual}
              diaSolicitado={diaSeleccionado}
              diaDevolucion={diaDevolucion}
              permitirSeleccion
              alSeleccionarDia={(indiceDia) => {
                establecerDiaSeleccionado(indiceDia);
                establecerCodigoComparacion(null);
                establecerDiaDevolucion(null);
                establecerMostrarCorreo(false);
              }}
            />

            {diaSeleccionado !== null && turnoSeleccionado && (
              <aside className="swap-panel" aria-live="polite">
                <div className="swap-panel-heading">
                  <div>
                    <span>Posible cambio de turno</span>
                    <h3>Día {diaSeleccionado + 1} · Turno {turnoSeleccionado}</h3>
                    <p>Operadores libres ese día y de tu mismo grupo horario.</p>
                  </div>
                  <button type="button" onClick={() => establecerDiaSeleccionado(null)} aria-label="Cerrar candidatos">×</button>
                </div>

                {candidatosCambio.length ? (
                  <div className="swap-candidates">
                    {candidatosCambio.map((operador) => (
                      <button
                        type="button"
                        key={operador.codigo}
                        onClick={() => abrirCuadranteCandidato(operador)}
                        aria-label={`Ver cuadrante de la matrícula ${operador.matricula}`}
                      >
                        <strong>{operador.matricula}</strong>
                        <span>Operador CRA</span>
                        <small>LIBRE</small>
                        <em>Ver cuadrante →</em>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="swap-empty">No hay operadores de tu mismo horario que estén libres ese día.</p>
                )}
              </aside>
            )}

            {operadorComparado && diaSeleccionado !== null && (
              <section className="comparison-schedule" aria-label={`Comparación con ${operadorComparado.matricula}`}>
                <div className="comparison-heading">
                  <div>
                    <span>Comparando cuadrantes</span>
                    <h3>{operadorSeleccionado?.matricula} ↔ {operadorComparado.matricula}</h3>
                    <p>El día {diaSeleccionado + 1} aparece resaltado en ambos calendarios.</p>
                  </div>
                  <button type="button" onClick={() => { establecerCodigoComparacion(null); establecerDiaDevolucion(null); establecerMostrarCorreo(false); }}>Cerrar comparación</button>
                </div>

                <div className="comparison-operator">
                  <strong>{operadorComparado.matricula}</strong>
                  <div>
                    <h4>{operadorComparado.nombre}</h4>
                    <p>Matrícula {operadorComparado.matricula} · {operadorComparado.horas} horas</p>
                  </div>
                </div>

                <div className="recommendations-panel">
                  <div className="recommendations-intro">
                    <span>Asistente de intercambio</span>
                    <h4>Mejores días para devolver el turno</h4>
                    <p>
                      Tú libras esos días y {operadorComparado.matricula} trabaja. Se priorizan las opciones
                      que alargan los descansos y evitan rachas excesivas.
                    </p>
                  </div>

                  {recomendaciones.length ? (
                    <div className="recommendations-list">
                      {recomendaciones.map((recomendacion, posicion) => (
                        <button
                          type="button"
                          key={recomendacion.indiceDia}
                          className={diaDevolucion === recomendacion.indiceDia ? "selected" : ""}
                          onClick={() => {
                            establecerDiaDevolucion(recomendacion.indiceDia);
                            establecerMostrarCorreo(false);
                            establecerCorreoCopiado(false);
                          }}
                        >
                          <span className={`recommendation-rank rank-${posicion + 1}`}>{posicion + 1}</span>
                          <div>
                            <strong>Día {recomendacion.indiceDia + 1} · {recomendacion.turno}</strong>
                            <small>
                              Descanso de {operadorComparado.matricula}: {recomendacion.descansoCandidato} días ·
                              Tu descanso: {recomendacion.descansoPropio} días
                            </small>
                          </div>
                          <em>{posicion === 0 ? "Recomendado" : posicion < 3 ? "Buena opción" : "Posible"}</em>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="recommendations-empty">No existe un día compatible para devolver este cambio dentro del mes.</p>
                  )}
                  <p className="recommendations-warning">Orientación automática: el cambio debe revisarse y aprobarse según las normas internas.</p>

                  {recomendacionElegida && (
                    <div className="email-generator">
                      <button type="button" onClick={generarYCopiarCorreo}>
                        <span aria-hidden="true">✉</span>
                        {correoCopiado ? "Correo copiado" : "Generar y copiar correo de cambio"}
                      </button>
                      <small>Genera una propuesta para jefatura y la copia al portapapeles.</small>
                    </div>
                  )}

                  {mostrarCorreo && recomendacionElegida && (
                    <div className="email-preview" aria-live="polite">
                      <div className="email-preview-heading">
                        <div>
                          <span>Vista previa del correo</span>
                          <strong>{correoCopiado ? "Copiado al portapapeles ✓" : "Selecciona el texto si deseas copiarlo manualmente"}</strong>
                        </div>
                        <button type="button" onClick={() => establecerMostrarCorreo(false)} aria-label="Cerrar correo">×</button>
                      </div>
                      <div className="email-subject"><strong>Asunto:</strong> {asuntoCorreo}</div>
                      <pre>{cuerpoCorreo}</pre>
                    </div>
                  )}
                </div>

                <div className="comparison-calendar">
                  <CalendarioMensual
                    dias={operadorComparado.dias}
                    nombreAccesible={`Horario comparado de ${operadorComparado.matricula}`}
                    desplazamientoPrimerDia={cuadrante.desplazamientoPrimerDia}
                    diaActual={diaActual}
                    diaSolicitado={diaSeleccionado}
                    diaDevolucion={diaDevolucion}
                    prefijoClave="comparacion"
                  />
                </div>
              </section>
            )}

            <p className="schedule-note">
              La aplicación reproduce el cuadrante oficial de {cuadrante.mes} de {cuadrante.anio}. Ante una modificación posterior,
              prevalece siempre el cuadrante oficial más reciente.
            </p>
          </section>
        )}
      </main>
    </div>
  );
};



