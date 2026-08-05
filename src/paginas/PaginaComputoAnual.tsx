import React from "react";
import { Link } from "react-router-dom";
import { CUADRANTES } from "../cuadrante/constantes";

interface TurnoGuardado {
  fecha: string;
  codigo: CodigoTurno;
  actualizado_en: string;
}

type CodigoTurno = "" | "M" | "T" | "N" | "1" | "2" | "B" | "P" | "V";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS_CORTOS = ["D", "L", "M", "X", "J", "V", "S"];
const CODIGOS: CodigoTurno[] = ["", "M", "T", "N", "1", "2", "B", "P", "V"];
const OBJETIVO_MENSUAL = 162;
const OBJETIVO_ANUAL = OBJETIVO_MENSUAL * 12;
const CLAVE_MATRICULA = "cra-computo-anual-matricula";

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

const fechaClave = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const diasDelMes = (anio: number, mes: number) => new Date(anio, mes, 0).getDate();

const horasCodigo = (codigo: CodigoTurno) => {
  if (["M", "T", "N", "P", "B"].includes(codigo)) return 8;
  if (codigo === "1" || codigo === "2") return 12;
  if (codigo === "V") return 5.32;
  return 0;
};

const horasNocturnasCodigo = (codigo: CodigoTurno) =>
  codigo === "N" || codigo === "2" ? 8 : 0;

const formatearHoras = (horas: number) =>
  horas.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** Editor anual inspirado en la hoja Excel original, con guardado por matrícula. */
export const PaginaComputoAnual: React.FC = () => {
  const hoy = new Date();
  const [matricula, establecerMatricula] = React.useState(
    () => localStorage.getItem(CLAVE_MATRICULA) ?? "RMI"
  );
  const [anio, establecerAnio] = React.useState(
    Math.max(2025, Math.min(2035, hoy.getFullYear()))
  );
  const [mes, establecerMes] = React.useState(hoy.getMonth() + 1);
  const [turnos, establecerTurnos] = React.useState<Record<string, CodigoTurno>>({});
  const [cargando, establecerCargando] = React.useState(false);
  const [guardando, establecerGuardando] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");

  const operador = operadores.find((elemento) => elemento.matricula === matricula);
  const cantidadDias = diasDelMes(anio, mes);
  const prefijoMes = `${anio}-${String(mes).padStart(2, "0")}-`;

  const cargarAnio = React.useCallback(async () => {
    establecerCargando(true);
    establecerMensaje("");
    try {
      const respuesta = await fetch(
        `/api/computo-anual?matricula=${encodeURIComponent(matricula)}&anio=${anio}`,
        { credentials: "same-origin" }
      );
      const datos = await respuesta.json() as { turnos?: TurnoGuardado[]; error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo cargar el cómputo.");
      const nuevosTurnos: Record<string, CodigoTurno> = {};
      (datos.turnos ?? []).forEach((turno) => {
        nuevosTurnos[turno.fecha] = turno.codigo;
      });
      establecerTurnos(nuevosTurnos);
    } catch (error) {
      establecerTurnos({});
      establecerMensaje(error instanceof Error ? error.message : "No se pudo cargar el cómputo.");
    } finally {
      establecerCargando(false);
    }
  }, [matricula, anio]);

  React.useEffect(() => {
    localStorage.setItem(CLAVE_MATRICULA, matricula);
    cargarAnio();
  }, [matricula, anio, cargarAnio]);

  const cambiarTurno = (dia: number, codigo: CodigoTurno) => {
    const fecha = fechaClave(anio, mes, dia);
    establecerTurnos((actuales) => ({ ...actuales, [fecha]: codigo }));
    establecerMensaje("");
  };

  const guardarMes = async () => {
    establecerGuardando(true);
    establecerMensaje("");
    const turnosMes = Object.entries(turnos)
      .filter(([fecha, codigo]) => fecha.startsWith(prefijoMes) && codigo)
      .map(([fecha, codigo]) => ({ dia: Number(fecha.slice(-2)), codigo }));

    try {
      const respuesta = await fetch("/api/computo-anual", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula, anio, mes, turnos: turnosMes }),
      });
      const datos = await respuesta.json() as { guardado?: boolean; error?: string };
      if (!respuesta.ok || !datos.guardado) {
        throw new Error(datos.error || "No se pudo guardar el mes.");
      }
      establecerMensaje(`${MESES[mes - 1]} guardado correctamente.`);
    } catch (error) {
      establecerMensaje(error instanceof Error ? error.message : "No se pudo guardar el mes.");
    } finally {
      establecerGuardando(false);
    }
  };

  const codigosMes = Array.from({ length: cantidadDias }, (_, indice) =>
    turnos[fechaClave(anio, mes, indice + 1)] ?? ""
  );
  const horasMes = codigosMes.reduce((total, codigo) => total + horasCodigo(codigo), 0);
  const nocturnasMes = codigosMes.reduce(
    (total, codigo) => total + horasNocturnasCodigo(codigo),
    0
  );
  const diferenciaMes = horasMes - OBJETIVO_MENSUAL;

  const codigosAnio = Object.entries(turnos)
    .filter(([fecha]) => fecha.startsWith(`${anio}-`))
    .map(([, codigo]) => codigo);
  const horasAnio = codigosAnio.reduce((total, codigo) => total + horasCodigo(codigo), 0);
  const nocturnasAnio = codigosAnio.reduce(
    (total, codigo) => total + horasNocturnasCodigo(codigo),
    0
  );
  const diferenciaAnio = horasAnio - OBJETIVO_ANUAL;

  return (
    <main className="pagina-computo-anual">
      <header className="computo-cabecera">
        <div>
          <span>Gestión personal de turnos</span>
          <h1>Cómputo anual CRA</h1>
          <p>Introduce el código de cada turno igual que en el Excel y guarda el mes.</p>
        </div>
        <Link to="/">← Volver al inicio</Link>
      </header>

      <section className="computo-panel" aria-label="Editor del cómputo anual">
        <div className="computo-selectores">
          <label>
            Operador
            <select value={matricula} onChange={(evento) => establecerMatricula(evento.target.value)}>
              {operadores.map((elemento) => (
                <option value={elemento.matricula} key={elemento.matricula}>
                  {elemento.matricula} · {elemento.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Año
            <select value={anio} onChange={(evento) => establecerAnio(Number(evento.target.value))}>
              {Array.from({ length: 11 }, (_, indice) => 2025 + indice).map((valor) => (
                <option value={valor} key={valor}>{valor}</option>
              ))}
            </select>
          </label>
          <label>
            Mes
            <select value={mes} onChange={(evento) => establecerMes(Number(evento.target.value))}>
              {MESES.map((nombre, indice) => (
                <option value={indice + 1} key={nombre}>
                  {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="computo-identidad">
          <strong>{operador?.nombre ?? "Operador CRA"}</strong>
          <span>{matricula} · {anio}</span>
        </div>

        <div className="computo-leyenda">
          <strong>Códigos:</strong>
          <span>M · Mañana</span><span>T · Tarde</span><span>N · Noche</span>
          <span>1 · 12 h día</span><span>2 · 12 h noche</span>
          <span>B · Baja</span><span>P · Permiso</span><span>V · Vacaciones</span>
        </div>

        <section className="computo-mes" aria-label={`Cómputo de ${MESES[mes - 1]}`}>
          <header>
            <h2>{MESES[mes - 1].toUpperCase()} {anio}</h2>
            <span>Objetivo mensual: {OBJETIVO_MENSUAL} h</span>
          </header>

          <div className="computo-tabla-contenedor">
            <table className="computo-tabla">
              <tbody>
                <tr>
                  <th>Día</th>
                  {Array.from({ length: cantidadDias }, (_, indice) => (
                    <td key={`dia-${indice + 1}`}>{indice + 1}</td>
                  ))}
                </tr>
                <tr>
                  <th>Semana</th>
                  {Array.from({ length: cantidadDias }, (_, indice) => {
                    const fecha = new Date(anio, mes - 1, indice + 1);
                    const esFinSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
                    return (
                      <td className={esFinSemana ? "fin-semana" : ""} key={`semana-${indice + 1}`}>
                        {DIAS_CORTOS[fecha.getDay()]}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th>Turno</th>
                  {codigosMes.map((codigo, indice) => (
                    <td className={`celda-turno turno-${codigo || "libre"}`} key={`turno-${indice + 1}`}>
                      <select
                        aria-label={`Turno del día ${indice + 1}`}
                        value={codigo}
                        onChange={(evento) =>
                          cambiarTurno(indice + 1, evento.target.value as CodigoTurno)
                        }
                      >
                        {CODIGOS.map((opcion) => (
                          <option value={opcion} key={opcion || "libre"}>
                            {opcion || "—"}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="computo-totales-mes">
            <div><span>Horas</span><strong>{formatearHoras(horasMes)} h</strong></div>
            <div><span>Nocturnas</span><strong>{formatearHoras(nocturnasMes)} h</strong></div>
            <div>
              <span>Diferencia</span>
              <strong className={diferenciaMes < 0 ? "saldo-negativo" : "saldo-positivo"}>
                {diferenciaMes > 0 ? "+" : ""}{formatearHoras(diferenciaMes)} h
              </strong>
            </div>
            <div><span>Horas nómina</span><strong>{formatearHoras(Math.max(0, diferenciaMes))} h</strong></div>
          </div>

          <footer className="computo-acciones">
            <p className={mensaje.toLowerCase().includes("no se") ? "mensaje-error" : ""}>
              {cargando ? "Cargando datos…" : mensaje}
            </p>
            <button type="button" onClick={guardarMes} disabled={cargando || guardando}>
              {guardando ? "Guardando…" : "Guardar mes"}
            </button>
          </footer>
        </section>

        <section className="computo-resumen-anual" aria-labelledby="titulo-resumen-anual">
          <header>
            <div>
              <span>Resumen automático</span>
              <h2 id="titulo-resumen-anual">Acumulado de {anio}</h2>
            </div>
            <strong>{formatearHoras(horasAnio)} / {OBJETIVO_ANUAL} h</strong>
          </header>
          <div className="computo-progreso">
            <span style={{ width: `${Math.min(100, (horasAnio / OBJETIVO_ANUAL) * 100)}%` }} />
          </div>
          <div className="computo-resumen-datos">
            <p><span>Horas registradas</span><strong>{formatearHoras(horasAnio)} h</strong></p>
            <p><span>Horas nocturnas</span><strong>{formatearHoras(nocturnasAnio)} h</strong></p>
            <p>
              <span>Saldo anual</span>
              <strong className={diferenciaAnio < 0 ? "saldo-negativo" : "saldo-positivo"}>
                {diferenciaAnio > 0 ? "+" : ""}{formatearHoras(diferenciaAnio)} h
              </strong>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
};
