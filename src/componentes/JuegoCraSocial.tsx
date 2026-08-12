import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";

interface MensajeChat {
  autor: string;
  texto: string;
}

interface Jugador {
  id: string;
  nombre: string;
  x: number;
  y: number;
}

/**
 * Lista de operadores disponibles.
 * Se genera a partir de los cuadrantes y elimina matrículas duplicadas.
 */
const operadores = Array.from(
  new Map(
    CUADRANTES.reduce(
      (todos, cuadrante) => [...todos, ...cuadrante.operadores],
      [] as (typeof CUADRANTES)[number]["operadores"],
    ).map((operador) => [operador.matricula, operador]),
  ).values(),
);

export const JuegoCraSocial: React.FC = () => {
  // ─────────────────────────────────────────────
  // JUGADOR LOCAL
  // ─────────────────────────────────────────────

  const [x, establecerX] = React.useState(100);
  const [y, establecerY] = React.useState(100);
  const [matricula, establecerMatricula] = React.useState("RMI");

  // ─────────────────────────────────────────────
  // WEBSOCKET
  // ─────────────────────────────────────────────

  const [conectado, establecerConectado] = React.useState(false);

  const [jugadoresConectados, establecerJugadoresConectados] =
    React.useState<string[]>([]);

  const [posicionesRemotas, establecerPosicionesRemotas] = React.useState<
    Record<string, { x: number; y: number }>
  >({});

  const socketRef = React.useRef<WebSocket | null>(null);

  /**
   * Convierte las posiciones recibidas por WebSocket
   * en jugadores que podemos utilizar dentro del mapa.
   */
  const otrosJugadores: Jugador[] = Object.keys(posicionesRemotas).map(
    (nombre) => ({
      id: nombre,
      nombre,
      x: posicionesRemotas[nombre].x,
      y: posicionesRemotas[nombre].y,
    }),
  );

  /**
   * Abre la conexión WebSocket.
   */
  const conectar = () => {
    if (socketRef.current) {
      return;
    }

    const socket = new WebSocket("ws://localhost:8787");

    socketRef.current = socket;

    socket.onopen = () => {
      establecerConectado(true);

      socket.send(
        JSON.stringify({
          tipo: "entrar",
          nombre: matricula,
        }),
      );
    };

    socket.onmessage = (evento) => {
      const datos = JSON.parse(String(evento.data));

      // Lista de jugadores conectados.
      if (datos.tipo === "jugadores") {
        establecerJugadoresConectados(datos.jugadores);
        return;
      }

      // Movimiento de otro jugador.
      if (datos.tipo === "mover") {
        // No necesitamos guardar nuestro propio movimiento.
        if (datos.nombre === matricula) {
          return;
        }

        establecerPosicionesRemotas((anteriores) => ({
          ...anteriores,

          [datos.nombre]: {
            x: datos.x,
            y: datos.y,
          },
        }));
      }
    };

    socket.onclose = () => {
      establecerConectado(false);
      socketRef.current = null;
    };
  };

  /**
   * Envía nuestra posición actual al servidor.
   */
  const enviarPosicion = (nuevaX: number, nuevaY: number) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        tipo: "mover",
        nombre: matricula,
        x: nuevaX,
        y: nuevaY,
      }),
    );
  };

  // ─────────────────────────────────────────────
  // PROXIMIDAD ENTRE JUGADORES
  // ─────────────────────────────────────────────

  const jugadorCercano = otrosJugadores.find((jugadorRemoto) => {
    const distancia = Math.sqrt(
      Math.pow(x - jugadorRemoto.x, 2) +
        Math.pow(y - jugadorRemoto.y, 2),
    );

    return distancia < 100;
  });

  // ─────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────

  const [chatAbierto, establecerChatAbierto] = React.useState(false);

  const [jugadorEnChat, establecerJugadorEnChat] =
    React.useState<Jugador | null>(null);

  const [mensaje, establecerMensaje] = React.useState("");

  const [mensajesPorJugador, establecerMensajesPorJugador] = React.useState<
    Record<string, MensajeChat[]>
  >({});

  const mensajesActuales = jugadorEnChat
    ? (mensajesPorJugador[jugadorEnChat.id] ?? [])
    : [];

  const nombreJugador = matricula;

  const enviarMensaje = () => {
    const texto = mensaje.trim();

    if (texto === "" || !jugadorEnChat) {
      return;
    }

    establecerMensajesPorJugador((anteriores) => ({
      ...anteriores,

      [jugadorEnChat.id]: [
        ...(anteriores[jugadorEnChat.id] ?? []),

        {
          autor: nombreJugador,
          texto,
        },
      ],
    }));

    establecerMensaje("");
  };

  // ─────────────────────────────────────────────
  // COLISIONES DEL MAPA
  // ─────────────────────────────────────────────

  const puedeMoverse = (nuevoX: number, nuevoY: number) => {
    const tamanoJugador = 40;

    // Pared vertical que separa Control CRA de Descanso.
    const tocaParedVertical =
      nuevoX < 356 &&
      nuevoX + tamanoJugador > 350 &&
      nuevoY < 240;

    // Puerta de acceso a Sala Técnica.
    const estaEnPuertaHorizontal =
      nuevoX >= 300 &&
      nuevoX + tamanoJugador <= 400;

    // Pared horizontal.
    const tocaParedHorizontal =
      nuevoY < 306 &&
      nuevoY + tamanoJugador > 300 &&
      !estaEnPuertaHorizontal;

    return !tocaParedVertical && !tocaParedHorizontal;
  };

  // ─────────────────────────────────────────────
  // TECLADO
  // ─────────────────────────────────────────────

  React.useEffect(() => {
    const manejarTecla = (evento: KeyboardEvent) => {
      const velocidad = 10;

      // Mientras escribimos en el chat no movemos al personaje.
      if (chatAbierto) {
        return;
      }

      // ARRIBA
      if (evento.key === "w" || evento.key === "W") {
        establecerY((actual) => {
          const nuevoY = Math.max(0, actual - velocidad);

          if (puedeMoverse(x, nuevoY)) {
            enviarPosicion(x, nuevoY);
            return nuevoY;
          }

          return actual;
        });
      }

      // ABAJO
      if (evento.key === "s" || evento.key === "S") {
        establecerY((actual) => {
          const nuevoY = Math.min(410, actual + velocidad);

          if (puedeMoverse(x, nuevoY)) {
            enviarPosicion(x, nuevoY);
            return nuevoY;
          }

          return actual;
        });
      }

      // IZQUIERDA
      if (evento.key === "a" || evento.key === "A") {
        establecerX((actual) => {
          const nuevoX = Math.max(0, actual - velocidad);

          if (puedeMoverse(nuevoX, y)) {
            enviarPosicion(nuevoX, y);
            return nuevoX;
          }

          return actual;
        });
      }

      // DERECHA
      if (evento.key === "d" || evento.key === "D") {
        establecerX((actual) => {
          const nuevoX = Math.min(660, actual + velocidad);

          if (puedeMoverse(nuevoX, y)) {
            enviarPosicion(nuevoX, y);
            return nuevoX;
          }

          return actual;
        });
      }

      // HABLAR
      if (
        (evento.key === "e" || evento.key === "E") &&
        jugadorCercano
      ) {
        establecerJugadorEnChat(jugadorCercano);
        establecerChatAbierto(true);
      }
    };

    window.addEventListener("keydown", manejarTecla);

    return () => {
      window.removeEventListener("keydown", manejarTecla);
    };
  }, [
    x,
    y,
    chatAbierto,
    jugadorCercano?.id,
    conectado,
    matricula,
  ]);

  return (
    <section>
      <h2>CRA Social</h2>

      <p>Muévete con WASD · Pulsa E cerca de otro operador</p>

      {/* ESTADO DEL SERVIDOR */}
      <p>
        {conectado
          ? "🟢 Conectado al servidor"
          : "🔴 Desconectado"}
      </p>

      <p>
        👥 Conectados:{" "}
        {jugadoresConectados.length > 0
          ? jugadoresConectados.join(", ")
          : "ninguno"}
      </p>

      {/* SELECCIÓN DEL JUGADOR */}
      <label>
        Jugador:{" "}
        <select
          disabled={conectado}
          value={matricula}
          onChange={(evento) =>
            establecerMatricula(evento.target.value)
          }
        >
          {operadores.map((operador) => (
            <option
              key={operador.matricula}
              value={operador.matricula}
            >
              {operador.matricula} - {operador.nombre}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={conectar}
        disabled={conectado}
      >
        {conectado
          ? "Conectado"
          : "Entrar a CRA Social"}
      </button>

      {/* MAPA */}
      <div
        style={{
          width: "700px",
          height: "450px",
          backgroundColor: "#182337",
          border: "3px solid #4b6584",
          position: "relative",
        }}
      >
        {/* NOMBRES DE LAS ESTANCIAS */}

        <span
          style={{
            position: "absolute",
            left: "120px",
            top: "20px",
            color: "white",
          }}
        >
          CONTROL CRA
        </span>

        <span
          style={{
            position: "absolute",
            left: "500px",
            top: "20px",
            color: "white",
          }}
        >
          DESCANSO
        </span>

        <span
          style={{
            position: "absolute",
            left: "300px",
            top: "330px",
            color: "white",
          }}
        >
          SALA TÉCNICA
        </span>

        {/* PARED VERTICAL */}

        <div
          style={{
            position: "absolute",
            left: "350px",
            top: "0px",
            width: "6px",
            height: "240px",
            backgroundColor: "#94a3b8",
          }}
        />

        {/* PARED HORIZONTAL IZQUIERDA */}

        <div
          style={{
            position: "absolute",
            left: "0px",
            top: "300px",
            width: "300px",
            height: "6px",
            backgroundColor: "#94a3b8",
          }}
        />

        {/* PARED HORIZONTAL DERECHA */}

        <div
          style={{
            position: "absolute",
            left: "400px",
            top: "300px",
            width: "300px",
            height: "6px",
            backgroundColor: "#94a3b8",
          }}
        />

        {/* JUGADORES REMOTOS REALES */}

        {otrosJugadores.map((jugadorRemoto) => (
          <div
            key={jugadorRemoto.id}
            style={{
              position: "absolute",
              left: `${jugadorRemoto.x}px`,
              top: `${jugadorRemoto.y}px`,
              width: "40px",
              height: "40px",
              transition:
                "left 0.08s linear, top 0.08s linear",
            }}
          >
            <span
              style={{
                position: "absolute",
                bottom: "45px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "white",
                fontSize: "12px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}
            >
              {jugadorRemoto.nombre}
            </span>

            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "#f472b6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              👩‍💻
            </div>
          </div>
        ))}

        {/* AVISO PARA HABLAR */}

        {jugadorCercano && !chatAbierto && (
          <div
            style={{
              position: "absolute",
              left: `${jugadorCercano.x}px`,
              top: `${jugadorCercano.y - 50}px`,
              backgroundColor: "white",
              color: "#182337",
              padding: "6px 10px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "bold",
              zIndex: 5,
            }}
          >
            💬 Pulsa E para hablar con{" "}
            {jugadorCercano.nombre}
          </div>
        )}

        {/* JUGADOR LOCAL */}

        <div
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: "40px",
            height: "40px",
          }}
        >
          <span
            style={{
              position: "absolute",
              bottom: "45px",
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fontSize: "12px",
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            {nombreJugador}
          </span>

          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              backgroundColor: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            👨‍💻
          </div>
        </div>

        {/* CHAT */}

        {chatAbierto && jugadorEnChat && (
          <div
            style={{
              position: "absolute",
              left: "170px",
              top: "100px",
              width: "360px",
              backgroundColor: "#ffffff",
              color: "#182337",
              padding: "20px",
              borderRadius: "12px",
              zIndex: 10,
            }}
          >
            <h3>💬 {jugadorEnChat.nombre}</h3>

            <p>
              Conversación con {jugadorEnChat.nombre}
            </p>

            <div>
              {mensajesActuales.map(
                (mensajeChat, indice) => (
                  <p
                    key={indice}
                    style={{
                      textAlign:
                        mensajeChat.autor === nombreJugador
                          ? "right"
                          : "left",
                    }}
                  >
                    <strong>{mensajeChat.autor}:</strong>{" "}
                    {mensajeChat.texto}
                  </p>
                ),
              )}
            </div>

            <input
              type="text"
              value={mensaje}
              onChange={(evento) =>
                establecerMensaje(evento.target.value)
              }
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  enviarMensaje();
                }
              }}
              placeholder="Escribe un mensaje..."
            />

            <button
              type="button"
              onClick={enviarMensaje}
            >
              Enviar
            </button>

            <button
              type="button"
              onClick={() => {
                establecerChatAbierto(false);
                establecerJugadorEnChat(null);
                establecerMensaje("");
              }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </section>
  );
};