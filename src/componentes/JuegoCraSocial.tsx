import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";

/**
 * Representa un mensaje dentro de una conversación.
 */
interface MensajeChat {
  autor: string;
  texto: string;
}

/**
 * Representa un jugador que vemos dentro del mapa.
 */
interface Jugador {
  id: string;
  nombre: string;
  x: number;
  y: number;
}

/**
 * Generamos una lista única de operadores
 * utilizando los datos de los cuadrantes.
 */
const operadores = Array.from(
  new Map(
    CUADRANTES.reduce(
      (todos, cuadrante) => [
        ...todos,
        ...cuadrante.operadores,
      ],
      [] as (typeof CUADRANTES)[number]["operadores"],
    ).map((operador) => [
      operador.matricula,
      operador,
    ]),
  ).values(),
);

export const JuegoCraSocial: React.FC = () => {
  // =====================================================
  // JUGADOR LOCAL
  // =====================================================

  /**
   * Posición de nuestro personaje.
   */
  const [x, establecerX] = React.useState(100);
  const [y, establecerY] = React.useState(100);

  /**
   * Matrícula que representa al jugador.
   */
  const [matricula, establecerMatricula] =
    React.useState("RMI");

  const nombreJugador = matricula;

  // =====================================================
  // WEBSOCKET
  // =====================================================

  /**
   * Nos indica si actualmente estamos conectados.
   */
  const [conectado, establecerConectado] =
    React.useState(false);

  /**
   * Lista de matrículas conectadas.
   */
  const [
    jugadoresConectados,
    establecerJugadoresConectados,
  ] = React.useState<string[]>([]);

  /**
   * Posiciones conocidas de los demás jugadores.
   *
   * Ejemplo:
   *
   * {
   *   PMA: { x: 200, y: 150 },
   *   ABC: { x: 500, y: 300 }
   * }
   */
  const [
    posicionesRemotas,
    establecerPosicionesRemotas,
  ] = React.useState<
    Record<string, { x: number; y: number }>
  >({});

  /**
   * Guardamos el WebSocket sin provocar renders
   * de React cada vez que cambia.
   */
  const socketRef =
    React.useRef<WebSocket | null>(null);

  /**
   * Convertimos las posiciones remotas
   * en jugadores que podemos dibujar.
   */
  const otrosJugadores: Jugador[] =
    Object.keys(posicionesRemotas).map(
      (nombre) => ({
        id: nombre,
        nombre,
        x: posicionesRemotas[nombre].x,
        y: posicionesRemotas[nombre].y,
      }),
    );

  // =====================================================
  // CHAT
  // =====================================================

  const [
    chatAbierto,
    establecerChatAbierto,
  ] = React.useState(false);

  /**
   * Jugador con el que estamos hablando.
   */
  const [
    jugadorEnChat,
    establecerJugadorEnChat,
  ] = React.useState<Jugador | null>(null);

  /**
   * Texto actualmente escrito en el input.
   */
  const [mensaje, establecerMensaje] =
    React.useState("");

  /**
   * Guardamos una conversación diferente
   * para cada jugador.
   *
   * Ejemplo:
   *
   * {
   *   PMA: [...mensajes],
   *   ABC: [...mensajes]
   * }
   */
  const [
    mensajesPorJugador,
    establecerMensajesPorJugador,
  ] = React.useState<
    Record<string, MensajeChat[]>
  >({});

  /**
   * Conversación que debemos mostrar actualmente.
   */
  const mensajesActuales = jugadorEnChat
    ? (mensajesPorJugador[jugadorEnChat.id] ?? [])
    : [];

  // =====================================================
  // CONEXIÓN
  // =====================================================

  const conectar = () => {
    /**
     * Evitamos abrir dos conexiones.
     */
    if (socketRef.current) {
      return;
    }

    const socket = new WebSocket(
      "ws://localhost:8787",
    );

    socketRef.current = socket;

    /**
     * Cuando Cloudflare acepta la conexión.
     */
    socket.onopen = () => {
      establecerConectado(true);

      /**
       * Nos identificamos ante el servidor.
       */
      socket.send(
        JSON.stringify({
          tipo: "entrar",
          nombre: matricula,
        }),
      );

      /**
       * Enviamos también nuestra posición inicial.
       *
       * Así los demás pueden vernos sin necesidad
       * de que primero tengamos que movernos.
       */
      socket.send(
        JSON.stringify({
          tipo: "mover",
          nombre: matricula,
          x,
          y,
        }),
      );
    };

    /**
     * Aquí recibimos TODOS los mensajes
     * procedentes del servidor.
     */
    socket.onmessage = (evento) => {
      const datos = JSON.parse(
        String(evento.data),
      );

      // -----------------------------------------
      // LISTA DE JUGADORES
      // -----------------------------------------

      if (datos.tipo === "jugadores") {
        establecerJugadoresConectados(
          datos.jugadores,
        );

        return;
      }

      // -----------------------------------------
      // MOVIMIENTO REMOTO
      // -----------------------------------------

      if (datos.tipo === "mover") {
        /**
         * Ignoramos nuestro propio movimiento.
         */
        if (datos.nombre === matricula) {
          return;
        }

        establecerPosicionesRemotas(
          (anteriores) => ({
            ...anteriores,

            [datos.nombre]: {
              x: datos.x,
              y: datos.y,
            },
          }),
        );

        return;
      }

      // -----------------------------------------
      // CHAT RECIBIDO
      // -----------------------------------------

      if (datos.tipo === "chat") {
        /**
         * datos.de contiene la matrícula
         * del jugador que nos escribió.
         *
         * Guardamos el mensaje dentro de
         * su conversación correspondiente.
         */
        establecerMensajesPorJugador(
          (anteriores) => ({
            ...anteriores,

            [datos.de]: [
              ...(anteriores[datos.de] ?? []),

              {
                autor: datos.de,
                texto: datos.texto,
              },
            ],
          }),
        );

        return;
      }
    };

    /**
     * Si se pierde o cierra la conexión.
     */
    socket.onclose = () => {
      establecerConectado(false);
      socketRef.current = null;

      establecerJugadoresConectados([]);
      establecerPosicionesRemotas({});
    };

    /**
     * Nos ayuda a detectar problemas
     * con el WebSocket.
     */
    socket.onerror = () => {
      console.error(
        "Error en WebSocket de CRA Social",
      );
    };
  };

  // =====================================================
  // ENVIAR POSICIÓN
  // =====================================================

  const enviarPosicion = (
    nuevaX: number,
    nuevaY: number,
  ) => {
    /**
     * Solo enviamos si el WebSocket está abierto.
     */
    if (
      socketRef.current?.readyState !==
      WebSocket.OPEN
    ) {
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

  // =====================================================
  // JUGADOR CERCANO
  // =====================================================

  /**
   * Buscamos si existe algún jugador
   * a menos de 100 píxeles.
   */
  const jugadorCercano =
    otrosJugadores.find((jugadorRemoto) => {
      const distancia = Math.sqrt(
        Math.pow(
          x - jugadorRemoto.x,
          2,
        ) +
          Math.pow(
            y - jugadorRemoto.y,
            2,
          ),
      );

      return distancia < 100;
    });

  // =====================================================
  // ENVIAR MENSAJE DE CHAT
  // =====================================================

  const enviarMensaje = () => {
    const texto = mensaje.trim();

    if (
      texto === "" ||
      !jugadorEnChat
    ) {
      return;
    }

    /**
     * Primero mostramos nuestro mensaje
     * inmediatamente en nuestro navegador.
     */
    establecerMensajesPorJugador(
      (anteriores) => ({
        ...anteriores,

        [jugadorEnChat.id]: [
          ...(anteriores[
            jugadorEnChat.id
          ] ?? []),

          {
            autor: nombreJugador,
            texto,
          },
        ],
      }),
    );

    /**
     * Después lo mandamos al servidor.
     */
    if (
      socketRef.current?.readyState ===
      WebSocket.OPEN
    ) {
      socketRef.current.send(
        JSON.stringify({
          tipo: "chat",
          de: matricula,
          para: jugadorEnChat.nombre,
          texto,
        }),
      );
    }

    /**
     * Limpiamos el input.
     */
    establecerMensaje("");
  };

  // =====================================================
  // COLISIONES
  // =====================================================

  const puedeMoverse = (
    nuevoX: number,
    nuevoY: number,
  ) => {
    const tamanoJugador = 40;

    /**
     * Pared vertical.
     */
    const tocaParedVertical =
      nuevoX < 356 &&
      nuevoX + tamanoJugador > 350 &&
      nuevoY < 240;

    /**
     * Hueco de la puerta hacia
     * la sala técnica.
     */
    const estaEnPuertaHorizontal =
      nuevoX >= 300 &&
      nuevoX + tamanoJugador <= 400;

    /**
     * Pared horizontal.
     */
    const tocaParedHorizontal =
      nuevoY < 306 &&
      nuevoY + tamanoJugador > 300 &&
      !estaEnPuertaHorizontal;

    return (
      !tocaParedVertical &&
      !tocaParedHorizontal
    );
  };

  // =====================================================
  // TECLADO
  // =====================================================

  React.useEffect(() => {
    const manejarTecla = (
      evento: KeyboardEvent,
    ) => {
      const velocidad = 10;

      /**
       * Si tenemos el chat abierto,
       * WASD no debe mover al personaje
       * mientras escribimos.
       */
      if (chatAbierto) {
        return;
      }

      // ------------------------------
      // W - ARRIBA
      // ------------------------------

      if (
        evento.key === "w" ||
        evento.key === "W"
      ) {
        establecerY((actual) => {
          const nuevoY = Math.max(
            0,
            actual - velocidad,
          );

          if (
            puedeMoverse(x, nuevoY)
          ) {
            enviarPosicion(
              x,
              nuevoY,
            );

            return nuevoY;
          }

          return actual;
        });
      }

      // ------------------------------
      // S - ABAJO
      // ------------------------------

      if (
        evento.key === "s" ||
        evento.key === "S"
      ) {
        establecerY((actual) => {
          const nuevoY = Math.min(
            410,
            actual + velocidad,
          );

          if (
            puedeMoverse(x, nuevoY)
          ) {
            enviarPosicion(
              x,
              nuevoY,
            );

            return nuevoY;
          }

          return actual;
        });
      }

      // ------------------------------
      // A - IZQUIERDA
      // ------------------------------

      if (
        evento.key === "a" ||
        evento.key === "A"
      ) {
        establecerX((actual) => {
          const nuevoX = Math.max(
            0,
            actual - velocidad,
          );

          if (
            puedeMoverse(nuevoX, y)
          ) {
            enviarPosicion(
              nuevoX,
              y,
            );

            return nuevoX;
          }

          return actual;
        });
      }

      // ------------------------------
      // D - DERECHA
      // ------------------------------

      if (
        evento.key === "d" ||
        evento.key === "D"
      ) {
        establecerX((actual) => {
          const nuevoX = Math.min(
            660,
            actual + velocidad,
          );

          if (
            puedeMoverse(nuevoX, y)
          ) {
            enviarPosicion(
              nuevoX,
              y,
            );

            return nuevoX;
          }

          return actual;
        });
      }

      // ------------------------------
      // E - HABLAR
      // ------------------------------

      if (
        (evento.key === "e" ||
          evento.key === "E") &&
        jugadorCercano
      ) {
        establecerJugadorEnChat(
          jugadorCercano,
        );

        establecerChatAbierto(true);
      }
    };

    window.addEventListener(
      "keydown",
      manejarTecla,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        manejarTecla,
      );
    };
  }, [
    x,
    y,
    chatAbierto,
    jugadorCercano?.id,
    matricula,
    conectado,
  ]);

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <section>
      <h2>CRA Social</h2>

      <p>
        Muévete con WASD · Pulsa E cerca
        de otro operador
      </p>

      {/* ESTADO DE CONEXIÓN */}

      <p>
        {conectado
          ? "🟢 Conectado al servidor"
          : "🔴 Desconectado"}
      </p>

      {/* JUGADORES CONECTADOS */}

      <p>
        👥 Conectados:{" "}
        {jugadoresConectados.length > 0
          ? jugadoresConectados.join(", ")
          : "ninguno"}
      </p>

      {/* SELECTOR DE OPERADOR */}

      <label>
        Jugador:{" "}
        <select
          disabled={conectado}
          value={matricula}
          onChange={(evento) =>
            establecerMatricula(
              evento.target.value,
            )
          }
        >
          {operadores.map(
            (operador) => (
              <option
                key={
                  operador.matricula
                }
                value={
                  operador.matricula
                }
              >
                {operador.matricula} -{" "}
                {operador.nombre}
              </option>
            ),
          )}
        </select>
      </label>

      {/* BOTÓN DE CONEXIÓN */}

      <button
        type="button"
        onClick={conectar}
        disabled={conectado}
      >
        {conectado
          ? "Conectado"
          : "Entrar a CRA Social"}
      </button>

      {/* =================================================
          MAPA
      ================================================= */}

      <div
        style={{
          width: "700px",
          height: "450px",
          backgroundColor: "#182337",
          border: "3px solid #4b6584",
          position: "relative",
        }}
      >
        {/* NOMBRES DE LAS SALAS */}

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

        {/* =================================================
            JUGADORES REMOTOS
        ================================================= */}

        {otrosJugadores.map(
          (jugadorRemoto) => (
            <div
              key={jugadorRemoto.id}
              style={{
                position: "absolute",
                left: `${jugadorRemoto.x}px`,
                top: `${jugadorRemoto.y}px`,
                width: "40px",
                height: "40px",

                /**
                 * Hace que el movimiento remoto
                 * se vea algo más suave.
                 */
                transition:
                  "left 0.08s linear, top 0.08s linear",
              }}
            >
              {/* MATRÍCULA */}

              <span
                style={{
                  position: "absolute",
                  bottom: "45px",
                  left: "50%",
                  transform:
                    "translateX(-50%)",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                }}
              >
                {jugadorRemoto.nombre}
              </span>

              {/* AVATAR */}

              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor:
                    "#f472b6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  fontSize: "24px",
                }}
              >
                👩‍💻
              </div>
            </div>
          ),
        )}

        {/* =================================================
            AVISO DE PROXIMIDAD
        ================================================= */}

        {jugadorCercano &&
          !chatAbierto && (
            <div
              style={{
                position: "absolute",
                left: `${jugadorCercano.x}px`,
                top: `${
                  jugadorCercano.y - 50
                }px`,
                backgroundColor:
                  "white",
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

        {/* =================================================
            NUESTRO JUGADOR
        ================================================= */}

        <div
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: "40px",
            height: "40px",
          }}
        >
          {/* MATRÍCULA */}

          <span
            style={{
              position: "absolute",
              bottom: "45px",
              left: "50%",
              transform:
                "translateX(-50%)",
              color: "white",
              fontSize: "12px",
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            {nombreJugador}
          </span>

          {/* AVATAR */}

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

        {/* =================================================
            VENTANA DE CHAT
        ================================================= */}

        {chatAbierto &&
          jugadorEnChat && (
            <div
              style={{
                position: "absolute",
                left: "170px",
                top: "100px",
                width: "360px",
                backgroundColor:
                  "#ffffff",
                color: "#182337",
                padding: "20px",
                borderRadius: "12px",
                zIndex: 10,
              }}
            >
              <h3>
                💬 {jugadorEnChat.nombre}
              </h3>

              <p>
                Conversación con{" "}
                {jugadorEnChat.nombre}
              </p>

              {/* MENSAJES */}

              <div>
                {mensajesActuales.map(
                  (
                    mensajeChat,
                    indice,
                  ) => (
                    <p
                      key={indice}
                      style={{
                        textAlign:
                          mensajeChat.autor ===
                          nombreJugador
                            ? "right"
                            : "left",
                      }}
                    >
                      <strong>
                        {
                          mensajeChat.autor
                        }
                        :
                      </strong>{" "}
                      {
                        mensajeChat.texto
                      }
                    </p>
                  ),
                )}
              </div>

              {/* INPUT */}

              <input
                type="text"
                value={mensaje}
                onChange={(evento) =>
                  establecerMensaje(
                    evento.target
                      .value,
                  )
                }
                onKeyDown={(evento) => {
                  if (
                    evento.key ===
                    "Enter"
                  ) {
                    enviarMensaje();
                  }
                }}
                placeholder="Escribe un mensaje..."
              />

              {/* ENVIAR */}

              <button
                type="button"
                onClick={
                  enviarMensaje
                }
              >
                Enviar
              </button>

              {/* CERRAR */}

              <button
                type="button"
                onClick={() => {
                  establecerChatAbierto(
                    false,
                  );

                  establecerJugadorEnChat(
                    null,
                  );

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