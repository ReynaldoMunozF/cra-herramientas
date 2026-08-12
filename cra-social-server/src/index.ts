import { DurableObject } from "cloudflare:workers";

interface Env {
  SALA_CRA: DurableObjectNamespace;
}

interface DatosJugador {
  nombre?: string;
}

interface MensajeEntrar {
  tipo: "entrar";
  nombre: string;
}

interface MensajeMover {
  tipo: "mover";
  nombre: string;
  x: number;
  y: number;
}

type MensajeCliente = MensajeEntrar | MensajeMover;

export class SalaCra extends DurableObject {
  async fetch(): Promise<Response> {
    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);

    this.ctx.acceptWebSocket(servidor);

    return new Response(null, {
      status: 101,
      webSocket: cliente,
    });
  }

  webSocketMessage(
    webSocket: WebSocket,
    mensaje: string | ArrayBuffer
  ) {
    const textoMensaje = String(mensaje);

    console.log("Mensaje recibido:", textoMensaje);

    let datos: MensajeCliente;

    try {
      datos = JSON.parse(textoMensaje) as MensajeCliente;
    } catch {
      console.log("Mensaje JSON no válido");
      return;
    }

    // ─────────────────────────────────
    // JUGADOR ENTRA EN CRA SOCIAL
    // ─────────────────────────────────

    if (datos.tipo === "entrar") {
      webSocket.serializeAttachment({
        nombre: datos.nombre,
      });

      const conexiones = this.ctx.getWebSockets();

      const jugadoresConectados = conexiones
        .map((conexion) => {
          const datosJugador =
            conexion.deserializeAttachment() as DatosJugador | null;

          return datosJugador?.nombre;
        })
        .filter(
          (nombre): nombre is string =>
            Boolean(nombre)
        );

      for (const conexion of conexiones) {
        conexion.send(
          JSON.stringify({
            tipo: "jugadores",
            jugadores: jugadoresConectados,
          })
        );
      }

      console.log(
        `${datos.nombre} ha entrado en CRA Social`
      );

      return;
    }

    // ─────────────────────────────────
    // MOVIMIENTO DE UN JUGADOR
    // ─────────────────────────────────

    if (datos.tipo === "mover") {
      console.log(
        `${datos.nombre} se mueve → x: ${datos.x}, y: ${datos.y}`
      );

      const conexiones = this.ctx.getWebSockets();

      for (const conexion of conexiones) {
        conexion.send(
          JSON.stringify({
            tipo: "mover",
            nombre: datos.nombre,
            x: datos.x,
            y: datos.y,
          })
        );
      }

      return;
    }
  }
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const upgradeHeader =
      request.headers.get("Upgrade");

    // Petición HTTP normal
    if (upgradeHeader !== "websocket") {
      return new Response(
        "CRA Social Server funcionando"
      );
    }

    // Todos los jugadores entran por ahora
    // en la misma sala.
    const idSala =
      env.SALA_CRA.idFromName("sala-principal");

    const sala = env.SALA_CRA.get(idSala);

    return sala.fetch(request);
  },
};