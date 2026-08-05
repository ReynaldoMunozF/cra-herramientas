import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";
import { JuegoPalabraClave } from "../componentes/JuegoPalabraClave";
import { JuegoCasoAsesino } from "../componentes/JuegoCasoAsesino";
import { JuegoHundirFlota } from "../componentes/JuegoHundirFlota";
import { JuegoDesactivarPanel } from "../componentes/JuegoDesactivarPanel";

interface Pistas {
  exactas: number;
  colores: number;
}

interface Intento {
  jugada: number[];
  pistas: Pistas;
}

interface EntradaRanking {
  matricula: string;
  duracion_segundos: number;
  intentos: number;
  finalizada_en: number;
}

interface RespuestaComprobacion {
  pistas?: Pistas;
  intentos?: number;
  victoria?: boolean;
  agotada?: boolean;
  duracionSegundos?: number | null;
  secreto?: number[] | null;
  error?: string;
}

const COLORES = [
  { nombre: "Azul", clase: "azul" },
  { nombre: "Amarillo", clase: "amarillo" },
  { nombre: "Verde", clase: "verde" },
  { nombre: "Rojo", clase: "rojo" },
  { nombre: "Morado", clase: "morado" },
  { nombre: "Turquesa", clase: "turquesa" },
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

const CLAVE_MATRICULA_JUEGO = "cra-zona-descanso-matricula";

const nombreOperador = (matricula: string) =>
  operadores.find((operador) => operador.matricula === matricula)?.nombre ?? "Operador CRA";

const formatearTiempo = (segundos: number) => {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
};

/** Primer juego de la zona de descanso: descubre cuatro colores en ocho intentos. */
export const PaginaZonaDescanso: React.FC = () => {
  const [esAdministrador, establecerEsAdministrador] = React.useState(false);
  const [juegosInvitados, establecerJuegosInvitados] = React.useState<string[]>(["codigo", "palabra", "asesino", "flota"]);
  const [juegoActivo, establecerJuegoActivo] = React.useState<"codigo" | "palabra" | "asesino" | "flota" | "panel">("codigo");
  const [matricula, establecerMatricula] = React.useState(
    () => localStorage.getItem(CLAVE_MATRICULA_JUEGO) ?? "RMI"
  );
  const [partidaId, establecerPartidaId] = React.useState("");
  const [jugada, establecerJugada] = React.useState<number[]>([]);
  const [intentos, establecerIntentos] = React.useState<Intento[]>([]);
  const [segundos, establecerSegundos] = React.useState(0);
  const [jugando, establecerJugando] = React.useState(false);
  const [pausado, establecerPausado] = React.useState(false);
  const [terminada, establecerTerminada] = React.useState(false);
  const [secretoVisible, establecerSecretoVisible] = React.useState<number[] | null>(null);
  const [mensaje, establecerMensaje] = React.useState("Selecciona tu matrícula y comienza.");
  const [cargando, establecerCargando] = React.useState(false);
  const [ranking, establecerRanking] = React.useState<EntradaRanking[]>([]);

  const cargarRanking = React.useCallback(async () => {
    try {
      const respuesta = await fetch("/api/codigo-secreto", { credentials: "same-origin" });
      const datos = await respuesta.json() as { ranking?: EntradaRanking[] };
      if (respuesta.ok) establecerRanking(datos.ranking ?? []);
    } catch {
      // El juego sigue disponible aunque el ranking no pueda cargarse.
    }
  }, []);

  React.useEffect(() => {
    cargarRanking();
  }, [cargarRanking]);

  React.useEffect(() => {
    fetch("/api/sesion", { credentials: "same-origin" })
      .then((respuesta) => respuesta.json())
      .then((sesion: { rol?: string }) => establecerEsAdministrador(sesion.rol === "administrador"))
      .catch(() => establecerEsAdministrador(false));
  }, []);

  React.useEffect(() => {
    const cargarJuegos = () => fetch("/api/juegos-disponibles", { credentials: "same-origin", cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((datos: { juegos?: string[] }) => establecerJuegosInvitados(datos.juegos ?? ["codigo"]))
      .catch(() => establecerJuegosInvitados(["codigo", "palabra", "asesino", "flota"]));
    cargarJuegos();
    window.addEventListener("focus", cargarJuegos);
    const actualizarAlVolver = () => { if (document.visibilityState === "visible") cargarJuegos(); };
    document.addEventListener("visibilitychange", actualizarAlVolver);
    return () => { window.removeEventListener("focus", cargarJuegos); document.removeEventListener("visibilitychange", actualizarAlVolver); };
  }, []);

  React.useEffect(() => {
    if (esAdministrador || juegosInvitados.includes(juegoActivo)) return;
    establecerJuegoActivo((juegosInvitados[0] ?? "codigo") as "codigo" | "palabra" | "asesino" | "flota" | "panel");
  }, [esAdministrador, juegoActivo, juegosInvitados]);

  React.useEffect(() => {
    localStorage.setItem(CLAVE_MATRICULA_JUEGO, matricula);
  }, [matricula]);

  React.useEffect(() => {
    if (!jugando || pausado || terminada) return undefined;
    const intervalo = window.setInterval(() => {
      establecerSegundos((actual) => actual + 1);
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [jugando, pausado, terminada]);

  const cambiarPausa = async () => {
    if (!partidaId || terminada) return;
    const accion = pausado ? "reanudar" : "pausar";
    try {
      const respuesta = await fetch("/api/codigo-secreto", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, partidaId }),
      });
      if (!respuesta.ok) throw new Error();
      establecerPausado(!pausado);
      establecerMensaje(pausado ? "Partida reanudada." : "Partida pausada. El tiempo está detenido.");
    } catch { establecerMensaje("No se pudo cambiar la pausa."); }
  };

  const iniciarPartida = async () => {
    establecerCargando(true);
    establecerMensaje("Preparando una nueva combinación…");
    try {
      const respuesta = await fetch("/api/codigo-secreto", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "iniciar" }),
      });
      const datos = await respuesta.json() as { partidaId?: string; error?: string };
      if (!respuesta.ok || !datos.partidaId) {
        throw new Error(datos.error || "No se pudo iniciar la partida.");
      }
      establecerPartidaId(datos.partidaId);
      establecerJugada([]);
      establecerIntentos([]);
      establecerSegundos(0);
      establecerTerminada(false);
      establecerPausado(false);
      establecerSecretoVisible(null);
      establecerJugando(true);
      establecerMensaje("El cronómetro está en marcha. Elige cuatro colores.");
    } catch (error) {
      establecerJugando(false);
      establecerMensaje(error instanceof Error ? error.message : "No se pudo iniciar.");
    } finally {
      establecerCargando(false);
    }
  };

  const agregarColor = (color: number) => {
    if (!jugando || terminada || jugada.length >= 4) return;
    establecerJugada((actual) => [...actual, color]);
    establecerMensaje("");
  };

  const quitarUltimoColor = () => {
    if (!jugando || terminada) return;
    establecerJugada((actual) => actual.slice(0, -1));
    establecerMensaje("");
  };

  const comprobar = async () => {
    if (!partidaId || jugada.length !== 4 || terminada) return;
    establecerCargando(true);
    establecerMensaje("Comprobando la combinación…");
    try {
      const respuesta = await fetch("/api/codigo-secreto", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "comprobar",
          partidaId,
          matricula,
          jugada,
        }),
      });
      const datos = await respuesta.json() as RespuestaComprobacion;
      if (!respuesta.ok || !datos.pistas) {
        throw new Error(datos.error || "No se pudo comprobar la combinación.");
      }
      establecerIntentos((actuales) => [...actuales, { jugada: [...jugada], pistas: datos.pistas as Pistas }]);
      establecerJugada([]);

      if (datos.victoria) {
        establecerTerminada(true);
        establecerJugando(false);
        establecerSecretoVisible(datos.secreto ?? null);
        establecerSegundos(datos.duracionSegundos ?? segundos);
        establecerMensaje(
          `¡Código descubierto en ${datos.intentos} intentos y ${formatearTiempo(datos.duracionSegundos ?? segundos)}!`
        );
        cargarRanking();
      } else if (datos.agotada) {
        establecerTerminada(true);
        establecerJugando(false);
        establecerSecretoVisible(datos.secreto ?? null);
        establecerMensaje("Se agotaron los ocho intentos. Prueba con una nueva combinación.");
      } else {
        establecerMensaje(
          `${datos.pistas.exactas} en posición correcta y ${datos.pistas.colores} de otro color.`
        );
      }
    } catch (error) {
      establecerMensaje(error instanceof Error ? error.message : "No se pudo comprobar.");
    } finally {
      establecerCargando(false);
    }
  };

  return (
    <main className="zona-descanso">
      <header className="zona-descanso-cabecera">
        <div>
          <span>CRA · Pausa breve</span>
          <h1>Zona de descanso</h1>
          <p>Partidas rápidas para desconectar unos minutos.</p>
        </div>
        <button type="button" onClick={() => window.close()} aria-label="Cerrar ventana">×</button>
      </header>

      <nav className="zona-descanso-selector" aria-label="Juegos disponibles">
        <button
          type="button"
          hidden={!esAdministrador && !juegosInvitados.includes("codigo")}
          className={juegoActivo === "codigo" ? "activo" : ""}
          onClick={() => establecerJuegoActivo("codigo")}
        >
          <span aria-hidden="true">◆</span>
          <div><strong>Código secreto</strong><small>Combinación de colores</small></div>
        </button>
          <button
            type="button"
            hidden={!esAdministrador && !juegosInvitados.includes("palabra")}
            className={juegoActivo === "palabra" ? "activo" : ""}
            onClick={() => establecerJuegoActivo("palabra")}
          >
            <span aria-hidden="true">A</span>
            <div><strong>Palabra clave</strong><small>Cinco letras y temáticas</small></div>
          </button>
          <button
            type="button"
            hidden={!esAdministrador && !juegosInvitados.includes("asesino")}
            className={juegoActivo === "asesino" ? "activo" : ""}
            onClick={() => establecerJuegoActivo("asesino")}
          >
            <span aria-hidden="true">⌕</span>
            <div><strong>Caso del asesino</strong><small>Deducción lógica</small></div>
          </button>
          <button
            type="button"
            hidden={!esAdministrador && !juegosInvitados.includes("flota")}
            className={juegoActivo === "flota" ? "activo" : ""}
            onClick={() => establecerJuegoActivo("flota")}
          >
            <span aria-hidden="true">⚓</span>
            <div><strong>Hundir la flota</strong><small>Nuevo · Dos jugadores</small></div>
          </button>
          {(esAdministrador || juegosInvitados.includes("panel")) && <button
            type="button"
            className={juegoActivo === "panel" ? "activo" : ""}
            onClick={() => establecerJuegoActivo("panel")}
          >
            <span aria-hidden="true">⚡</span>
            <div><strong>Desactivar el panel</strong><small>Nuevo · Solo administrador</small></div>
          </button>}
      </nav>

      <section className={`zona-descanso-contenido ${juegoActivo === "asesino" ? "modo-murdoku" : ""} ${juegoActivo === "flota" ? "modo-flota" : ""}`}>
        {juegoActivo === "panel" ? <JuegoDesactivarPanel /> : juegoActivo === "palabra" ? <JuegoPalabraClave esAdministrador={esAdministrador} /> :
          juegoActivo === "asesino" ? <JuegoCasoAsesino /> : (
          juegoActivo === "flota" ? <JuegoHundirFlota /> : (
          <>
        <div className={`codigo-secreto-juego ${jugando && !terminada ? "partida-activa" : ""}`}>
          <header className="codigo-secreto-titulo">
            <div>
              <span>Juego de lógica</span>
              <h2>Código secreto</h2>
            </div>
            <div className="murdoku-controles-tiempo">
              <strong>{formatearTiempo(segundos)}</strong>
              {jugando && !terminada && <button type="button" onClick={cambiarPausa}>{pausado ? "Reanudar" : "Pausar"}</button>}
            </div>
          </header>

          <div className="codigo-secreto-identificacion">
            <label>
              Jugador
              <select
                value={matricula}
                disabled={jugando}
                onChange={(evento) => establecerMatricula(evento.target.value)}
              >
                {operadores.map((operador) => (
                  <option value={operador.matricula} key={operador.matricula}>
                    {operador.matricula} · {operador.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={iniciarPartida} disabled={cargando}>
              {jugando ? "Reiniciar partida" : "Nueva partida"}
            </button>
          </div>

          {pausado && <section className="juego-pausado-capa"><span>Ⅱ</span><h3>Partida en pausa</h3><p>La combinación está oculta y el cronómetro detenido.</p><button type="button" onClick={cambiarPausa}>Reanudar</button></section>}

          <div className="codigo-secreto-oculto" aria-label="Código secreto">
            {Array.from({ length: 4 }, (_, indice) => {
              const color = secretoVisible?.[indice];
              return (
                <span
                  className={color === undefined ? "ficha-secreta oculta" : `ficha-secreta color-${color}`}
                  key={indice}
                >
                  {color === undefined ? "?" : ""}
                </span>
              );
            })}
          </div>

          <div className="codigo-secreto-tablero">
            {Array.from({ length: 8 }, (_, indice) => {
              const intento = intentos[indice];
              const esActual = jugando && indice === intentos.length;
              const coloresFila = intento?.jugada ?? (esActual ? jugada : []);
              return (
                <div className={`codigo-secreto-fila ${esActual ? "actual" : ""}`} key={indice}>
                  <span className="codigo-secreto-numero">{indice + 1}</span>
                  <div className="codigo-secreto-fichas">
                    {Array.from({ length: 4 }, (_, posicion) => {
                      const color = coloresFila[posicion];
                      return (
                        <span
                          className={color === undefined ? "ficha-juego vacia" : `ficha-juego color-${color}`}
                          key={posicion}
                        />
                      );
                    })}
                  </div>
                  <div className="codigo-secreto-pistas" aria-label="Pistas">
                    {Array.from({ length: 4 }, (_, posicion) => {
                      const exactas = intento?.pistas.exactas ?? 0;
                      const colores = intento?.pistas.colores ?? 0;
                      const clase = posicion < exactas
                        ? "exacta"
                        : posicion < exactas + colores ? "otro-color" : "";
                      return <span className={clase} key={posicion} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="codigo-secreto-paleta">
            {COLORES.map((color, indice) => (
              <button
                type="button"
                disabled={!jugando || pausado || terminada || jugada.length >= 4}
                onClick={() => agregarColor(indice)}
                aria-label={`Añadir ${color.nombre}`}
                key={color.nombre}
              >
                <span className={`color-${indice}`} />
                {color.nombre}
              </button>
            ))}
          </div>

          <div className="codigo-secreto-acciones">
            <button type="button" className="secundario" onClick={quitarUltimoColor} disabled={!jugada.length}>
              Borrar último
            </button>
            <button type="button" onClick={comprobar} disabled={jugada.length !== 4 || cargando}>
              Comprobar combinación
            </button>
          </div>
          <p className="codigo-secreto-mensaje" aria-live="polite">{mensaje}</p>
          <p className="codigo-secreto-ayuda">
            ● Negra: color y posición correctos · ○ Blanca: color correcto en otra posición
          </p>
        </div>

        {(!jugando || terminada) && <aside className="codigo-secreto-ranking" aria-labelledby="titulo-ranking">
          <header>
            <span>Clasificación compartida</span>
            <h2 id="titulo-ranking">Mejores tiempos</h2>
          </header>
          {ranking.length ? (
            <ol>
              {ranking.map((entrada, indice) => (
                <li className={entrada.matricula === matricula ? "jugador-actual" : ""} key={entrada.matricula}>
                  <span>{indice + 1}</span>
                  <div>
                    <strong>{entrada.matricula}</strong>
                    <small>{nombreOperador(entrada.matricula)}</small>
                  </div>
                  <p>
                    <strong>{formatearTiempo(entrada.duracion_segundos)}</strong>
                    <small>{entrada.intentos} intentos</small>
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ranking-vacio">Todavía no hay tiempos registrados. ¡Puedes ser el primero!</p>
          )}
        </aside>}
          </>
        ))}
      </section>

      <footer className="zona-descanso-pie">
        <span>© 2026 Reynaldo Muñoz</span>
        <span>Próximamente habrá más juegos</span>
      </footer>
    </main>
  );
};
