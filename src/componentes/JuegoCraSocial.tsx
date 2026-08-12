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

export const JuegoCraSocial: React.FC = () => {
  const [x, establecerX] = React.useState(100);
  const [y, establecerY] = React.useState(100);
  const [chatAbierto, establecerChatAbierto] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");
  const [mensajes, establecerMensajes] = React.useState<MensajeChat[]>([]);
  const [matricula, establecerMatricula] = React.useState("RMI");

  const otrosJugadores: Jugador[] = [
    {
      id: "jugador-2",
      nombre: "PMA",
      x: 520,
      y: 120,
    },
    {
      id: "jugador-3",
      nombre: "ABC",
      x: 150,
      y: 350,
    },
  ];
  // const otroJugador = otrosJugadores[0];

  const jugadorCercano = otrosJugadores.find((jugadorRemoto) => {
    const distancia = Math.sqrt(
      Math.pow(x - jugadorRemoto.x, 2) + Math.pow(y - jugadorRemoto.y, 2),
    );

    return distancia < 100;
  });

  const cercaDeOtroJugador = jugadorCercano !== undefined;

  const puedeMoverse = (nuevoX: number, nuevoY: number) => {
    const tamanoJugador = 40;

    const tocaParedVertical =
      nuevoX < 356 && nuevoX + tamanoJugador > 350 && nuevoY < 240;
    const estaEnPuertaHorizontal =
      nuevoX >= 300 && nuevoX + tamanoJugador <= 400;

    const tocaParedHorizontal =
      nuevoY < 306 && nuevoY + tamanoJugador > 300 && !estaEnPuertaHorizontal;

    if (tocaParedVertical || tocaParedHorizontal) {
      return false;
    }
    return true;
  };

  React.useEffect(() => {
    const manejarTecla = (evento: KeyboardEvent) => {
      const velocidad = 10;
      if (chatAbierto) {
        return;
      }

      if (evento.key === "w" || evento.key === "W") {
        establecerY((actual) => {
          const nuevoY = Math.max(0, actual - velocidad);

          if (puedeMoverse(x, nuevoY)) {
            return nuevoY;
          }

          return actual;
        });
      }

      if (evento.key === "s" || evento.key === "S") {
        establecerY((actual) => {
          const nuevoY = Math.min(410, actual + velocidad);

          if (puedeMoverse(x, nuevoY)) {
            return nuevoY;
          }

          return actual;
        });
      }

      if (evento.key === "a" || evento.key === "A") {
        establecerX((actual) => {
          const nuevoX = Math.max(0, actual - velocidad);

          if (puedeMoverse(nuevoX, y)) {
            return nuevoX;
          }

          return actual;
        });
      }

      if (evento.key === "d" || evento.key === "D") {
        establecerX((actual) => {
          const nuevoX = Math.min(660, actual + velocidad);

          if (puedeMoverse(nuevoX, y)) {
            return nuevoX;
          }

          return actual;
        });
      }
      if ((evento.key === "e" || evento.key === "E") && cercaDeOtroJugador) {
        establecerChatAbierto(true);
      }
    };

    window.addEventListener("keydown", manejarTecla);

    return () => {
      window.removeEventListener("keydown", manejarTecla);
    };
  }, [x, y, chatAbierto, cercaDeOtroJugador]);

  const enviarMensaje = () => {
    if (mensaje.trim() === "") {
      return;
    }

    establecerMensajes((anteriores) => [
      ...anteriores,
      {
        autor: nombreJugador,
        texto: mensaje,
      },
    ]);

    establecerMensaje("");

    // setTimeout(() => {
    //   establecerMensajes((anteriores) => [
    //     ...anteriores,
    //     {
    //       autor: "Paula",
    //       texto: "¡Hola! Te he leído 👋",
    //     },
    //   ]);
    // }, 1000);
  };

  const operadores = Array.from(
    new Map(
      CUADRANTES.reduce(
        (todos, cuadrante) => [...todos, ...cuadrante.operadores],
        [] as (typeof CUADRANTES)[number]["operadores"],
      ).map((operador) => [operador.matricula, operador]),
    ).values(),
  );
  const operadorActual = operadores.find(
    (operador) => operador.matricula === matricula,
  );

  const nombreJugador = matricula;

  return (
    <section>
      <h2>CRA Social</h2>
      <p>Muévete con WASD</p>
      <label>
        Jugador:{" "}
        <select
          value={matricula}
          onChange={(evento) => establecerMatricula(evento.target.value)}
        >
          {operadores.map((operador) => (
            <option key={operador.matricula} value={operador.matricula}>
              {operador.matricula} - {operador.nombre}
            </option>
          ))}
        </select>
      </label>

      <div
        style={{
          width: "700px",
          height: "450px",
          backgroundColor: "#182337",
          border: "3px solid #4b6584",
          position: "relative",
        }}
      >
        {/* Nombres de las estancias */}
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
        {/* Pared vertical */}
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

        {/* Pared horizontal */}
        {/* Pared horizontal izquierda */}
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
        {/* Pared horizontal derecha */}
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
        {/* Otros jugadores */}
        {otrosJugadores.map((jugadorRemoto) => (
          <div
            key={jugadorRemoto.id}
            style={{
              position: "absolute",
              left: `${jugadorRemoto.x}px`,
              top: `${jugadorRemoto.y}px`,
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
        {cercaDeOtroJugador && (
          <div
            style={{
              position: "absolute",
              left: `${jugadorCercano?.x ?? 0}px`,
              top: `${(jugadorCercano?.y ?? 0) - 50}px`,
              backgroundColor: "white",
              color: "#182337",
              padding: "6px 10px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            💬 Pulsa E para hablar con {jugadorCercano?.nombre}
          </div>
        )}
        {/* JUGADOR: tiene que estar DENTRO de este div */}
        <div
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: "40px",
            height: "40px",
          }}
        >
          {/* Nombre del jugador */}
          <span
            style={{
              position: "absolute",
              bottom: "45px",
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
          >
            {nombreJugador}
          </span>

          {/* Personaje */}
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
          {chatAbierto && (
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
              <h3>💬 {jugadorCercano?.nombre}</h3>

              <p>Conversación con {jugadorCercano?.nombre} </p>
              <div>
                {mensajes.map((mensajeChat, indice) => (
                  <p
                    key={indice}
                    style={{
                      textAlign:
                        mensajeChat.autor === nombreJugador ? "right" : "left",
                    }}
                  >
                    <strong>{mensajeChat.autor}:</strong> {mensajeChat.texto}
                  </p>
                ))}
              </div>
              <input
                type="text"
                value={mensaje}
                onChange={(evento) => establecerMensaje(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") {
                    enviarMensaje();
                  }
                }}
                placeholder="Escribe un mensaje..."
              />
              <button type="button" onClick={enviarMensaje}>
                Enviar
              </button>

              <button
                type="button"
                onClick={() => establecerChatAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
