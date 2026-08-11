import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";

type EstadoLetra = "exacta" | "presente" | "ausente";
interface Intento { palabra: string; estados: EstadoLetra[]; }
interface EntradaRanking { matricula: string; duracion_segundos: number; intentos: number; }

const NOMBRES_TEMATICAS: Record<string, string> = {
  cra: "CRA y alarmas",
  animales: "Animales",
  naturaleza: "Naturaleza",
  alimentos: "Alimentos",
  objetos: "Objetos cotidianos",
  GOT: "Juego de Tronos",
};

const operadores = Array.from(new Map(
  CUADRANTES.flatMap((cuadrante) => cuadrante.operadores)
    .map((operador) => [operador.matricula, operador])
).values()).sort((a, b) =>
  a.matricula === "RMI" ? -1 : b.matricula === "RMI" ? 1 : a.matricula.localeCompare(b.matricula)
);
const nombreOperador = (matricula: string) =>
  operadores.find((operador) => operador.matricula === matricula)?.nombre ?? "Operador CRA";
const formatearTiempo = (segundos: number) =>
  `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

/** Juego de letras que solo se carga cuando la sesión pertenece al administrador. */
export const JuegoPalabraClave: React.FC<{ esAdministrador: boolean }> = ({ esAdministrador }) => {
  const referenciaEntrada = React.useRef<HTMLInputElement>(null);
  const [matricula, establecerMatricula] = React.useState(() =>
    localStorage.getItem("cra-zona-descanso-matricula") ?? "RMI"
  );
  const [partidaId, establecerPartidaId] = React.useState("");
  const [propuesta, establecerPropuesta] = React.useState("");
  const [intentos, establecerIntentos] = React.useState<Intento[]>([]);
  const [segundos, establecerSegundos] = React.useState(0);
  const [jugando, establecerJugando] = React.useState(false);
  const [pausado, establecerPausado] = React.useState(false);
  const [terminada, establecerTerminada] = React.useState(false);
  const [tematicaPartida, establecerTematicaPartida] = React.useState("");
  const [tematicaElegida, establecerTematicaElegida] = React.useState("cra");
  const [tematicas, establecerTematicas] = React.useState<string[]>([]);
  const [tematicasDisponibles, establecerTematicasDisponibles] = React.useState<string[]>([]);
  const [mensaje, establecerMensaje] = React.useState("Inicia una partida y descubre la palabra de cinco letras.");
  const [ranking, establecerRanking] = React.useState<EntradaRanking[]>([]);
  const [cargando, establecerCargando] = React.useState(false);

  const cargarRanking = React.useCallback(async () => {
    const respuesta = await fetch("/api/palabra-clave", { credentials: "same-origin" });
    if (!respuesta.ok) return;
    const datos = await respuesta.json() as {
      ranking?: EntradaRanking[]; tematicas?: string[]; tematicasDisponibles?: string[];
    };
    establecerRanking(datos.ranking ?? []);
    establecerTematicas(datos.tematicas ?? ["cra"]);
    establecerTematicasDisponibles(datos.tematicasDisponibles ?? Object.keys(NOMBRES_TEMATICAS));
    establecerTematicaElegida((actual) => (datos.tematicas ?? ["cra"]).includes(actual)
      ? actual
      : (datos.tematicas ?? ["cra"])[0]);
  }, []);

  React.useEffect(() => { cargarRanking().catch(() => undefined); }, [cargarRanking]);
  React.useEffect(() => {
    const intervalo = window.setInterval(() => cargarRanking().catch(() => undefined), 5000);
    return () => window.clearInterval(intervalo);
  }, [cargarRanking]);
  React.useEffect(() => { localStorage.setItem("cra-zona-descanso-matricula", matricula); }, [matricula]);
  React.useEffect(() => {
    if (!jugando || pausado || terminada) return undefined;
    const intervalo = window.setInterval(() => establecerSegundos((valor) => valor + 1), 1000);
    return () => window.clearInterval(intervalo);
  }, [jugando, pausado, terminada]);

  const cambiarPausa = async () => {
    if (!partidaId || terminada) return;
    const accion = pausado ? "reanudar" : "pausar";
    try {
      const respuesta = await fetch("/api/palabra-clave", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, partidaId }),
      });
      if (!respuesta.ok) throw new Error();
      establecerPausado(!pausado);
      establecerMensaje(pausado ? "Partida reanudada." : "Partida pausada. El tiempo está detenido.");
    } catch { establecerMensaje("No se pudo cambiar la pausa."); }
  };

  const alternarTematica = async (tematica: string) => {
    const siguientes = tematicas.includes(tematica)
      ? tematicas.filter((valor) => valor !== tematica)
      : [...tematicas, tematica];
    if (!siguientes.length) {
      establecerMensaje("Debe quedar al menos una temática activa.");
      return;
    }
    try {
      const respuesta = await fetch("/api/administracion/palabra-clave", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "configurar", tematicas: siguientes }),
      });
      if (!respuesta.ok) throw new Error();
      establecerTematicas(siguientes);
      establecerMensaje("Temáticas actualizadas. Se aplicarán automáticamente a las nuevas partidas.");
    } catch { establecerMensaje("No se pudieron guardar las temáticas."); }
  };

  const iniciar = async () => {
    establecerCargando(true);
    try {
      const respuesta = await fetch("/api/palabra-clave", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "iniciar", tematica: tematicaElegida }),
      });
      const datos = await respuesta.json() as { partidaId?: string; tematica?: string; error?: string };
      if (!respuesta.ok || !datos.partidaId) throw new Error(datos.error || "No se pudo iniciar.");
      establecerPartidaId(datos.partidaId);
      establecerPropuesta("");
      establecerIntentos([]);
      establecerSegundos(0);
      establecerTerminada(false);
      establecerPausado(false);
      establecerTematicaPartida(datos.tematica ?? "");
      establecerJugando(true);
      establecerMensaje("Escribe una palabra de cinco letras.");
      window.setTimeout(() => {
        referenciaEntrada.current?.focus();
        referenciaEntrada.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    } catch (error) {
      establecerMensaje(error instanceof Error ? error.message : "No se pudo iniciar.");
    } finally { establecerCargando(false); }
  };

  const comprobar = async () => {
    if (propuesta.length !== 5 || !partidaId) return;
    establecerCargando(true);
    try {
      const respuesta = await fetch("/api/palabra-clave", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "comprobar", partidaId, matricula, palabra: propuesta }),
      });
      const datos = await respuesta.json() as {
        estados?: EstadoLetra[]; intentos?: number; victoria?: boolean; agotada?: boolean;
        duracionSegundos?: number; palabra?: string; error?: string;
      };
      if (!respuesta.ok || !datos.estados) throw new Error(datos.error || "No se pudo comprobar.");
      establecerIntentos((actuales) => [...actuales, { palabra: propuesta, estados: datos.estados! }]);
      establecerPropuesta("");
      if (datos.victoria || datos.agotada) {
        establecerJugando(false);
        establecerTerminada(true);
        if (datos.duracionSegundos) establecerSegundos(datos.duracionSegundos);
        establecerMensaje(datos.victoria
          ? `¡Palabra descubierta en ${datos.intentos} intentos y ${formatearTiempo(datos.duracionSegundos ?? segundos)}!`
          : `La palabra era ${datos.palabra}. Prueba de nuevo.`);
        if (datos.victoria) cargarRanking().catch(() => undefined);
      } else establecerMensaje("Verde: posición correcta · Amarillo: letra desplazada.");
    } catch (error) {
      establecerMensaje(error instanceof Error ? error.message : "No se pudo comprobar.");
    } finally { establecerCargando(false); }
  };

  return (
    <>
      <div className={`codigo-secreto-juego palabra-clave-juego ${jugando && !terminada ? "partida-activa" : ""}`}>
        <header className="codigo-secreto-titulo">
          <div><span>Juego de letras · Cinco letras</span><h2>Palabra clave</h2></div>
          <div className="murdoku-controles-tiempo">
            <strong>{formatearTiempo(segundos)}</strong>
            {jugando && !terminada && <button type="button" onClick={cambiarPausa}>{pausado ? "Reanudar" : "Pausar"}</button>}
          </div>
        </header>
        <div className="codigo-secreto-identificacion">
          <label>Jugador
            <select value={matricula} disabled={jugando} onChange={(e) => establecerMatricula(e.target.value)}>
              {operadores.map((operador) => (
                <option value={operador.matricula} key={operador.matricula}>
                  {operador.matricula} · {operador.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>Temática de la partida
            <select
              value={tematicaElegida}
              disabled={jugando || !tematicas.length}
              onChange={(e) => establecerTematicaElegida(e.target.value)}
            >
              {tematicas.map((tematica) => (
                <option value={tematica} key={tematica}>{NOMBRES_TEMATICAS[tematica] ?? tematica}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={iniciar} disabled={cargando}>
            {jugando ? "Reiniciar partida" : "Nueva partida"}
          </button>
        </div>
        {esAdministrador && <section className="palabra-clave-tematicas" aria-label="Temáticas de Palabra clave">
          <div><strong>Administrar temáticas</strong><small>Define cuáles pueden elegir los jugadores</small></div>
          <div>{tematicasDisponibles.map((tematica) => (
            <button
              type="button"
              className={tematicas.includes(tematica) ? "activa" : ""}
              aria-pressed={tematicas.includes(tematica)}
              onClick={() => alternarTematica(tematica)}
              key={tematica}
            >{NOMBRES_TEMATICAS[tematica] ?? tematica}</button>
          ))}</div>
        </section>}
        {tematicaPartida && <p className="palabra-clave-tematica-actual">Partida actual: <b>{NOMBRES_TEMATICAS[tematicaPartida] ?? tematicaPartida}</b></p>}
        {pausado && <section className="juego-pausado-capa"><span>Ⅱ</span><h3>Partida en pausa</h3><p>El tablero está oculto y el cronómetro detenido.</p><button type="button" onClick={cambiarPausa}>Reanudar</button></section>}
        <div className="palabra-clave-tablero">
          {Array.from({ length: 6 }, (_, fila) => {
            const intento = intentos[fila];
            const texto = intento?.palabra ?? (jugando && fila === intentos.length ? propuesta : "");
            return (
              <div className="palabra-clave-fila" key={fila}>
                {Array.from({ length: 5 }, (_, columna) => (
                  <span className={`letra-clave ${intento?.estados[columna] ?? ""}`} key={columna}>
                    {texto[columna] ?? ""}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        <div className="palabra-clave-entrada">
          <input
            ref={referenciaEntrada}
            value={propuesta}
            disabled={!jugando || pausado || terminada}
            maxLength={5}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            enterKeyHint="done"
            aria-label="Palabra de cinco letras"
            placeholder="CINCO LETRAS"
            onChange={(e) => establecerPropuesta(e.target.value.toUpperCase().normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") comprobar(); }}
          />
          <button type="button" onClick={comprobar} disabled={propuesta.length !== 5 || cargando}>Comprobar</button>
        </div>
        <p className="codigo-secreto-mensaje" aria-live="polite">{mensaje}</p>
        <p className="codigo-secreto-ayuda"><b>Verde</b>: letra y posición · <b>Amarillo</b>: letra en otra posición</p>
      </div>
      {(!jugando || terminada) && <aside className="codigo-secreto-ranking">
        <header><span>Clasificación privada</span><h2>Mejores palabras</h2></header>
        {ranking.length ? (
          <ol>{ranking.map((entrada, indice) => (
            <li className={entrada.matricula === matricula ? "jugador-actual" : ""} key={entrada.matricula}>
              <span>{indice + 1}</span>
              <div><strong>{entrada.matricula}</strong><small>{nombreOperador(entrada.matricula)}</small></div>
              <p><strong>{formatearTiempo(entrada.duracion_segundos)}</strong><small>{entrada.intentos} intentos</small></p>
            </li>
          ))}</ol>
        ) : <p className="ranking-vacio">Todavía no hay tiempos registrados.</p>}
      </aside>}
    </>
  );
};
