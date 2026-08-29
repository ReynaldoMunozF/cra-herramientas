import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";
import iconoProductividad from "../recursos/herramientas/productividad.svg";

interface RegistroProductividad {
  id: number;
  matricula: string;
  fecha: string;
  total_alarmas: number;
  horas_trabajadas: number;
  citas: number;
  llamadas_entrantes: number;
  gestiones_administrativas: number;
  tramos_email: TramoEmail[];
  actualizado_en: string;
}

interface TramoEmail {
  inicio: string;
  fin: string;
}

interface CantidadesFormulario {
  totalAlarmas: number;
  horasTrabajadas: number;
  citas: number;
  llamadasEntrantes: number;
  gestionesAdministrativas: number;
  tramosEmail: TramoEmail[];
}

const FORMULARIO_VACIO: CantidadesFormulario = {
  totalAlarmas: 0,
  horasTrabajadas: 8,
  citas: 0,
  llamadasEntrantes: 0,
  gestionesAdministrativas: 0,
  tramosEmail: [],
};

/** Escala corporativa facilitada para estimar el bono según las gestiones por hora. */
const ESCALA_BONIFICACION: Array<[number, number]> = [
  [18, 40], [18.2, 45], [18.4, 51], [18.5, 56], [18.7, 61], [18.9, 67],
  [19.1, 72], [19.3, 77], [19.4, 83], [19.6, 88], [19.8, 93], [20, 99],
  [20.2, 104], [20.3, 109], [20.5, 115], [20.7, 120], [20.9, 125],
  [21.1, 131], [21.2, 136], [21.4, 141], [21.6, 147], [21.8, 152],
  [22, 157], [22.1, 163], [22.3, 168], [22.5, 173], [22.7, 179],
  [22.9, 184], [23, 189], [23.2, 195], [23.4, 200], [24, 220],
  [25, 245], [26, 270], [27, 300], [27.5, 310], [28, 320], [28.5, 330],
  [29, 340], [29.5, 350], [30, 360], [30.5, 370], [31, 380],
  [31.5, 390], [32, 400], [32.5, 410], [33, 420], [33.5, 430],
  [34, 440], [34.5, 450], [35, 460], [35.5, 470], [36, 480],
];

const operadores = Array.from(
  new Map(
    CUADRANTES.flatMap((cuadrante) => cuadrante.operadores)
      .map((operador) => [operador.matricula, operador])
  ).values()
).sort((operadorA, operadorB) => {
  if (operadorA.matricula === "RMI") return -1;
  if (operadorB.matricula === "RMI") return 1;
  return operadorA.matricula.localeCompare(operadorB.matricula);
});

const fechaLocalIso = () => {
  const hoy = new Date();
  const parte = (valor: number) => String(valor).padStart(2, "0");
  return `${hoy.getFullYear()}-${parte(hoy.getMonth() + 1)}-${parte(hoy.getDate())}`;
};

const calcularGestionesAjustadas = (cantidades: CantidadesFormulario) => {
  const especiales =
    cantidades.citas + cantidades.llamadasEntrantes + cantidades.gestionesAdministrativas;
  const alarmasOrdinarias = Math.max(0, cantidades.totalAlarmas - especiales);
  return alarmasOrdinarias
    + cantidades.citas * 2.71
    + cantidades.llamadasEntrantes * 1.68
    + cantidades.gestionesAdministrativas * 5;
};

const convertirRegistro = (registro: RegistroProductividad): CantidadesFormulario => ({
  totalAlarmas: registro.total_alarmas,
  horasTrabajadas: registro.horas_trabajadas,
  citas: registro.citas,
  llamadasEntrantes: registro.llamadas_entrantes,
  gestionesAdministrativas: registro.gestiones_administrativas,
  tramosEmail: registro.tramos_email ?? [],
});

const registroCoincide = (registro: RegistroProductividad, formulario: CantidadesFormulario) =>
  registro.total_alarmas === formulario.totalAlarmas
  && registro.horas_trabajadas === formulario.horasTrabajadas
  && registro.citas === formulario.citas
  && registro.llamadas_entrantes === formulario.llamadasEntrantes
  && registro.gestiones_administrativas === formulario.gestionesAdministrativas
  && JSON.stringify(registro.tramos_email ?? []) === JSON.stringify(formulario.tramosEmail);

const minutosHora = (hora: string) => {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
};

/** Calcula también los tramos que cruzan la medianoche, por ejemplo 23:50–00:20. */
const duracionTramoEmail = (tramo: TramoEmail) => {
  const inicio = minutosHora(tramo.inicio);
  const fin = minutosHora(tramo.fin);
  return fin > inicio ? fin - inicio : fin + 24 * 60 - inicio;
};

const minutosEmailFormulario = (cantidades: CantidadesFormulario) =>
  cantidades.tramosEmail.reduce((total, tramo) => total + duracionTramoEmail(tramo), 0);

const horasEfectivasFormulario = (cantidades: CantidadesFormulario) =>
  Math.max(0, cantidades.horasTrabajadas - minutosEmailFormulario(cantidades) / 60);

const formatearNumero = (valor: number) =>
  valor.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const obtenerTramoBono = (productividad: number) =>
  ESCALA_BONIFICACION.reduce<[number, number] | null>(
    (tramo, candidato) => productividad >= candidato[0] ? candidato : tramo,
    null
  );

const obtenerEstadoProductividad = (productividad: number) => {
  if (productividad < 18) return { clase: "roja", texto: "Por debajo del primer tramo" };
  if (productividad < 22) return { clase: "amarilla", texto: "Primer tramo alcanzado" };
  if (productividad < 28) return { clase: "naranja", texto: "Avance favorable" };
  if (productividad <= 36) return { clase: "verde", texto: "Objetivo alto alcanzado" };
  return { clase: "superior", texto: "Superando la escala" };
};

const CLAVE_MATRICULA_PRODUCTIVIDAD = "cra-productividad-matricula";
const CLAVE_RESPALDOS_PRODUCTIVIDAD = "cra-productividad-pendientes-v1";

interface RespaldoProductividad extends CantidadesFormulario {
  matricula: string;
  fecha: string;
  guardadoLocalEn: string;
}

const leerRespaldosProductividad = (): RespaldoProductividad[] => {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_RESPALDOS_PRODUCTIVIDAD) ?? "[]");
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
};

const guardarRespaldoProductividad = (respaldo: RespaldoProductividad) => {
  const restantes = leerRespaldosProductividad()
    .filter((elemento) => elemento.matricula !== respaldo.matricula || elemento.fecha !== respaldo.fecha);
  localStorage.setItem(CLAVE_RESPALDOS_PRODUCTIVIDAD, JSON.stringify([...restantes, respaldo]));
};

const eliminarRespaldoProductividad = (matricula: string, fecha: string) => {
  const restantes = leerRespaldosProductividad()
    .filter((elemento) => elemento.matricula !== matricula || elemento.fecha !== fecha);
  localStorage.setItem(CLAVE_RESPALDOS_PRODUCTIVIDAD, JSON.stringify(restantes));
};

const respuestaJsonSegura = async <T,>(respuesta: Response): Promise<T> => {
  const tipo = respuesta.headers.get("content-type") ?? "";
  if (!tipo.includes("application/json")) {
    throw new Error("La sesión ha caducado. Vuelve a iniciar sesión; el día queda protegido en este equipo.");
  }
  return respuesta.json() as Promise<T>;
};

/** Calculadora diaria editable y sincronizada mediante la base de datos de Cloudflare. */
export const ConsultaProductividadRapida: React.FC = () => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [matricula, establecerMatricula] = React.useState(
    () => localStorage.getItem(CLAVE_MATRICULA_PRODUCTIVIDAD) ?? "RMI"
  );
  const [fecha, establecerFecha] = React.useState(fechaLocalIso);
  const [registros, establecerRegistros] = React.useState<RegistroProductividad[]>([]);
  const [formulario, establecerFormulario] =
    React.useState<CantidadesFormulario>({ ...FORMULARIO_VACIO });
  const [cargando, establecerCargando] = React.useState(false);
  const [guardando, establecerGuardando] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");
  const [inicioEmail, establecerInicioEmail] = React.useState("");
  const [finEmail, establecerFinEmail] = React.useState("");
  const solicitudMesActual = React.useRef(0);

  const mesSeleccionado = fecha.slice(0, 7);
  const registroSeleccionado = registros.find((registro) => registro.fecha === fecha);

  const cargarMes = React.useCallback(async () => {
    const numeroSolicitud = ++solicitudMesActual.current;
    establecerCargando(true);
    establecerMensaje("");
    try {
      const respuesta = await fetch(
        `/api/productividad?matricula=${encodeURIComponent(matricula)}&mes=${mesSeleccionado}`,
        { credentials: "same-origin", cache: "no-store" }
      );
      const datos = await respuestaJsonSegura<{ registros: RegistroProductividad[]; error?: string }>(respuesta);
      if (!respuesta.ok) throw new Error(datos.error || "No se pudieron cargar los registros.");
      if (numeroSolicitud !== solicitudMesActual.current) return;
      establecerRegistros(datos.registros);
    } catch (error) {
      if (numeroSolicitud !== solicitudMesActual.current) return;
      establecerRegistros([]);
      establecerMensaje(error instanceof Error ? error.message : "No se pudieron cargar los registros.");
    } finally {
      if (numeroSolicitud === solicitudMesActual.current) establecerCargando(false);
    }
  }, [matricula, mesSeleccionado]);

  React.useEffect(() => {
    const cerrarAlAbrirOtra = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "productividad") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
  }, []);

  React.useEffect(() => {
    if (abierto) cargarMes();
  }, [abierto, cargarMes]);

  React.useEffect(() => {
    localStorage.setItem(CLAVE_MATRICULA_PRODUCTIVIDAD, matricula);
  }, [matricula]);

  React.useEffect(() => {
    const encontrado = registros.find((registro) => registro.fecha === fecha);
    const respaldo = leerRespaldosProductividad()
      .find((elemento) => elemento.matricula === matricula && elemento.fecha === fecha);
    establecerFormulario(encontrado
      ? convertirRegistro(encontrado)
      : respaldo
        ? { ...respaldo, tramosEmail: respaldo.tramosEmail ?? [] }
        : { ...FORMULARIO_VACIO });
    if (!encontrado && respaldo) establecerMensaje("Día recuperado del respaldo de este equipo. Pulsa guardar para sincronizarlo.");
  }, [fecha, matricula, registros]);

  const alternar = () => {
    const seAbrira = !abierto;
    window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", {
      detail: seAbrira ? "productividad" : "ninguna",
    }));
    establecerAbierto(seAbrira);
  };

  const cambiarCantidad = (
    campo: Exclude<keyof CantidadesFormulario, "tramosEmail">,
    valor: number
  ) => {
    establecerFormulario((actual) => ({
      ...actual,
      [campo]: campo === "horasTrabajadas"
        // El cero temporal permite vaciar el campo antes de escribir 12, 16, etc.
        ? valor === 0 ? 0 : Math.max(0.5, Math.min(24, valor))
        : Math.max(0, Math.round(valor || 0)),
    }));
    establecerMensaje("");
  };

  const incrementar = (
    campo: "citas" | "llamadasEntrantes" | "gestionesAdministrativas",
    cambio: -1 | 1
  ) => cambiarCantidad(campo, formulario[campo] + cambio);

  const agregarTramoEmail = () => {
    if (!inicioEmail || !finEmail || inicioEmail === finEmail) {
      establecerMensaje("Indica una hora de inicio y otra de finalización.");
      return;
    }
    const nuevoTramo = { inicio: inicioEmail, fin: finEmail };
    const minutosNuevos =
      minutosEmailFormulario(formulario) + duracionTramoEmail(nuevoTramo);
    if (minutosNuevos >= formulario.horasTrabajadas * 60) {
      establecerMensaje("El tiempo de email debe ser menor que las horas trabajadas.");
      return;
    }
    establecerFormulario((actual) => ({
      ...actual,
      tramosEmail: [...actual.tramosEmail, nuevoTramo],
    }));
    establecerInicioEmail("");
    establecerFinEmail("");
    establecerMensaje("");
  };

  const eliminarTramoEmail = (indice: number) => {
    establecerFormulario((actual) => ({
      ...actual,
      tramosEmail: actual.tramosEmail.filter((_, posicion) => posicion !== indice),
    }));
    establecerMensaje("");
  };

  const guardar = async () => {
    const totalEspeciales =
      formulario.citas + formulario.llamadasEntrantes + formulario.gestionesAdministrativas;
    if (formulario.horasTrabajadas < 0.5) {
      establecerMensaje("Indica las horas totales trabajadas antes de guardar.");
      return;
    }
    if (horasEfectivasFormulario(formulario) <= 0) {
      establecerMensaje("El tiempo descontado por email deja el día sin horas efectivas.");
      return;
    }
    if (totalEspeciales > formulario.totalAlarmas) {
      establecerMensaje("Las gestiones especiales no pueden superar el total de alarmas.");
      return;
    }

    const respaldo: RespaldoProductividad = {
      matricula,
      fecha,
      ...formulario,
      guardadoLocalEn: new Date().toISOString(),
    };
    guardarRespaldoProductividad(respaldo);
    establecerGuardando(true);
    establecerMensaje("");
    try {
      const respuesta = await fetch("/api/productividad", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula, fecha, ...formulario }),
      });
      const datos = await respuestaJsonSegura<{
        registro?: RegistroProductividad;
        error?: string;
      }>(respuesta);
      if (!respuesta.ok || !datos.registro) {
        throw new Error(datos.error || "No se pudo guardar.");
      }

      // Una segunda lectura confirma que D1 devuelve el registro recién escrito.
      const comprobacion = await fetch(
        `/api/productividad?matricula=${encodeURIComponent(matricula)}&mes=${fecha.slice(0, 7)}&v=${Date.now()}`,
        { credentials: "same-origin", cache: "no-store" }
      );
      const datosComprobacion = await respuestaJsonSegura<{ registros?: RegistroProductividad[]; error?: string }>(comprobacion);
      const confirmado = datosComprobacion.registros?.find((registro) => registro.fecha === fecha);
      if (!comprobacion.ok || !confirmado || !registroCoincide(confirmado, formulario)) {
        throw new Error(datosComprobacion.error || "Cloudflare no confirmó el registro. El día sigue protegido en este equipo.");
      }
      eliminarRespaldoProductividad(matricula, fecha);
      establecerRegistros((actuales) => [
        ...actuales.filter((registro) => registro.fecha !== fecha),
        confirmado,
      ].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      establecerMensaje(registroSeleccionado
        ? "Día actualizado y verificado en Cloudflare."
        : "Día guardado y verificado en Cloudflare.");
    } catch (error) {
      const detalle = error instanceof Error ? error.message : "No se pudo guardar el día.";
      establecerMensaje(`${detalle} No cierres este navegador: conservamos una copia local para recuperarlo.`);
    } finally {
      establecerGuardando(false);
    }
  };

  const gestionesHoy = calcularGestionesAjustadas(formulario);
  const minutosEmailHoy = minutosEmailFormulario(formulario);
  const horasEfectivasHoy = horasEfectivasFormulario(formulario);
  const productividadHoy = horasEfectivasHoy > 0 ? gestionesHoy / horasEfectivasHoy : 0;

  /** Sustituye en directo el día seleccionado para previsualizar el acumulado antes de guardarlo. */
  const formulariosMes = registros
    .filter((registro) => registro.fecha !== fecha)
    .map(convertirRegistro)
    .concat(
      formulario.totalAlarmas > 0 && formulario.horasTrabajadas > 0 ? [formulario] : []
    );
  const horasMes = formulariosMes.reduce(
    (total, dia) => total + horasEfectivasFormulario(dia),
    0
  );
  const gestionesMes = formulariosMes.reduce(
    (total, dia) => total + calcularGestionesAjustadas(dia),
    0
  );
  const productividadMes = horasMes > 0 ? gestionesMes / horasMes : 0;
  const tramoBono = obtenerTramoBono(productividadMes);
  const estadoProductividad = obtenerEstadoProductividad(productividadHoy);
  const avanceProductividad = Math.min(100, (productividadHoy / 36) * 100);

  return (
    <aside className={`productividad-rapida ${abierto ? "abierta" : ""}`}>
      <button
        className="productividad-rapida-activador"
        data-nombre="Productividad"
        type="button"
        onClick={alternar}
        title="Productividad"
        aria-label={abierto ? "Cerrar productividad" : "Abrir productividad"}
        aria-expanded={abierto}
      >
        <span className="herramienta-menu-icono" aria-hidden="true">
          <img src={iconoProductividad} alt="" />
        </span>
        <strong>Productividad</strong>
      </button>

      {abierto && (
        <section className="productividad-rapida-panel">
          <header>
            <div><small>Cálculo diario</small><h2>Productividad</h2></div>
            <div className="productividad-resultado-cabecera">
              <strong>{formatearNumero(productividadHoy)}</strong>
              <span>gestiones/h</span>
            </div>
            <button type="button" onClick={alternar} aria-label="Cerrar">×</button>
          </header>

          <div className="productividad-contenido">
            <div className="productividad-identificacion">
              <label>
                Matrícula
                <select
                  value={matricula}
                  onChange={(evento) => {
                    establecerMatricula(evento.target.value);
                    establecerRegistros([]);
                  }}
                >
                  {operadores.map((operador) => (
                    <option key={operador.matricula} value={operador.matricula}>
                      {operador.matricula} · {operador.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Día
                <input
                  type="date"
                  value={fecha}
                  onChange={(evento) => establecerFecha(evento.target.value)}
                />
              </label>
            </div>

            <div className="productividad-estado">
              <strong>{registroSeleccionado ? "Registro guardado · editable" : "Día sin guardar"}</strong>
              {cargando && <span>Cargando…</span>}
            </div>

            <div className="productividad-datos-base">
              <label>
                Total de alarmas
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={formulario.totalAlarmas || ""}
                  placeholder="0"
                  onChange={(evento) => cambiarCantidad("totalAlarmas", Number(evento.target.value))}
                />
              </label>
              <label>
                Horas totales
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="1"
                  inputMode="decimal"
                  value={formulario.horasTrabajadas || ""}
                  placeholder="8"
                  onChange={(evento) => cambiarCantidad("horasTrabajadas", Number(evento.target.value))}
                />
              </label>
            </div>

            <div className="productividad-contadores">
              {([
                ["citas", "Citas", "2,71"],
                ["llamadasEntrantes", "Llamadas entrantes", "1,68"],
                ["gestionesAdministrativas", "Gestión administrativa", "5"],
              ] as const).map(([campo, etiqueta, ponderacion]) => (
                <div className="productividad-contador" key={campo}>
                  <button type="button" onClick={() => incrementar(campo, -1)} aria-label={`Quitar ${etiqueta}`}>−</button>
                  <button type="button" onClick={() => incrementar(campo, 1)}>
                    <span>{etiqueta}<small>× {ponderacion}</small></span>
                    <strong>{formulario[campo]}</strong>
                    <b aria-hidden="true">+</b>
                  </button>
                </div>
              ))}
            </div>

            <section className="productividad-email">
              <div className="productividad-email-titulo">
                <div>
                  <strong>Gestiones largas por email</strong>
                  <span>Se descuentan del tiempo trabajado</span>
                </div>
                <b>{minutosEmailHoy} min</b>
              </div>
              <div className="productividad-email-formulario">
                <label>
                  Inicio
                  <input
                    type="time"
                    value={inicioEmail}
                    onChange={(evento) => establecerInicioEmail(evento.target.value)}
                  />
                </label>
                <label>
                  Final
                  <input
                    type="time"
                    value={finEmail}
                    onChange={(evento) => establecerFinEmail(evento.target.value)}
                  />
                </label>
                <button type="button" onClick={agregarTramoEmail}>Añadir</button>
              </div>
              {formulario.tramosEmail.length > 0 && (
                <div className="productividad-email-lista">
                  {formulario.tramosEmail.map((tramo, indice) => (
                    <div key={`${tramo.inicio}-${tramo.fin}-${indice}`}>
                      <span>
                        {tramo.inicio}–{tramo.fin}
                        <small>{duracionTramoEmail(tramo)} min</small>
                      </span>
                      <button
                        type="button"
                        onClick={() => eliminarTramoEmail(indice)}
                        aria-label={`Eliminar tramo ${tramo.inicio} a ${tramo.fin}`}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <p>
                Tiempo efectivo: <strong>{formatearNumero(horasEfectivasHoy)} h</strong>
                {" "}de {formulario.horasTrabajadas || 0} h totales
              </p>
            </section>

            <section
              className={`productividad-progreso ${estadoProductividad.clase}`}
              aria-label={`Productividad diaria: ${formatearNumero(productividadHoy)} gestiones por hora. ${estadoProductividad.texto}`}
            >
              <div>
                <strong>Progreso de hoy</strong>
                <span>{estadoProductividad.texto}</span>
              </div>
              <div className="productividad-progreso-pista">
                <span style={{ width: `${avanceProductividad}%` }} />
              </div>
              <div className="productividad-progreso-marcas" aria-hidden="true">
                <span>0</span><span>18</span><span>22</span><span>28</span><span>36+</span>
              </div>
            </section>

            <div className="productividad-resumen">
              <div>
                <span>Acumulado del mes</span>
                <strong>{formatearNumero(productividadMes)} gestiones/h</strong>
              </div>
              <div>
                <span>Bono aproximado</span>
                <strong>{tramoBono ? `${tramoBono[1]} €` : "0 €"}</strong>
                <small>
                  {tramoBono
                    ? `Tramo de ${tramoBono[0].toLocaleString("es-ES")} gestiones/h`
                    : "Primer tramo: 18 gestiones/h"}
                </small>
              </div>
            </div>

            {mensaje && <p className="productividad-mensaje" role="status">{mensaje}</p>}
            <button
              className="productividad-guardar"
              type="button"
              onClick={guardar}
              disabled={guardando || cargando}
            >
              {guardando ? "Guardando…" : registroSeleccionado ? "Actualizar este día" : "Guardar este día"}
            </button>
          </div>
        </section>
      )}
    </aside>
  );
};
