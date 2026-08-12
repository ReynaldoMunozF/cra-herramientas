import { DurableObject } from "cloudflare:workers";

/**
 * Variables disponibles dentro de nuestro Worker.
 *
 * SALA_CRA es el Durable Object configurado
 * en wrangler.jsonc.
 */
interface Env {
  SALA_CRA: DurableObjectNamespace;
}

/**
 * Información que guardamos asociada a cada WebSocket.
 *
 * Gracias a serializeAttachment podemos saber posteriormente
 * qué matrícula pertenece a cada conexión.
 */
interface DatosJugador {
  nombre?: string;
}

/**
 * Mensaje enviado cuando un jugador entra.
 */
interface MensajeEntrar {
  tipo: "entrar";
  nombre: string;
}

/**
 * Mensaje enviado cada vez que un jugador se mueve.
 */
interface MensajeMover {
  tipo: "mover";
  nombre: string;
  x: number;
  y: number;
}

/**
 * Mensaje privado entre dos jugadores.
 */
interface MensajeChat {
  tipo: "chat";

  // Jugador que envía el mensaje.
  de: string;

  // Jugador que debe recibirlo.
  para: string;

  texto: string;
}

/**
 * Todos los mensajes que actualmente acepta el servidor.
 */
type MensajeCliente =
  | MensajeEntrar
  | MensajeMover
  | MensajeChat;

/**
 * Sala multijugador de CRA Social.
 *
 * Todos los jugadores están actualmente dentro
 * de una única sala llamada "sala-principal".
 */
export class SalaCra extends DurableObject {
  /**
   * Se ejecuta cuando un navegador solicita
   * conectarse mediante WebSocket.
   */
  async fetch(): Promise<Response> {
    /**
     * Creamos el par de WebSockets:
     *
     * cliente  → navegador
     * servidor → Durable Object
     */
    const par = new WebSocketPair();

    const [cliente, servidor] = Object.values(par);

    /**
     * Cloudflare empieza a gestionar
     * el WebSocket del servidor.
     */
    this.ctx.acceptWebSocket(servidor);

    /**
     * Devolvemos el otro extremo al navegador.
     */
    return new Response(null, {
      status: 101,
      webSocket: cliente,
    });
  }

  /**
   * Cloudflare ejecuta automáticamente esta función
   * cuando recibe un mensaje de cualquier jugador.
   */
  webSocketMessage(
    webSocket: WebSocket,
    mensaje: string | ArrayBuffer,
  ) {
    const textoMensaje = String(mensaje);

    console.log("Mensaje recibido:", textoMensaje);

    let datos: MensajeCliente;

    /**
     * Intentamos convertir el mensaje recibido
     * desde JSON.
     *
     * Si llega algo que no sea JSON válido,
     * simplemente lo ignoramos.
     */
    try {
      datos = JSON.parse(textoMensaje) as MensajeCliente;
    } catch {
      console.log("Mensaje JSON no válido");
      return;
    }

    // =====================================================
    // JUGADOR ENTRA EN CRA SOCIAL
    // =====================================================

    if (datos.tipo === "entrar") {
      /**
       * Asociamos la matrícula con este WebSocket.
       *
       * Por ejemplo:
       *
       * WebSocket #1 → RMI
       * WebSocket #2 → PMA
       */
      webSocket.serializeAttachment({
        nombre: datos.nombre,
      });

      /**
       * Avisamos a todos de la nueva lista
       * de jugadores conectados.
       */
      this.enviarListaJugadores();

      console.log(
        `${datos.nombre} ha entrado en CRA Social`,
      );

      return;
    }

    // =====================================================
    // MOVIMIENTO
    // =====================================================

    if (datos.tipo === "mover") {
      console.log(
        `${datos.nombre} se mueve → x: ${datos.x}, y: ${datos.y}`,
      );

      /**
       * Obtenemos todas las conexiones
       * actualmente abiertas.
       */
      const conexiones = this.ctx.getWebSockets();

      /**
       * Enviamos el movimiento a todos.
       *
       * El navegador que originó el movimiento
       * lo ignorará posteriormente.
       */
      for (const conexion of conexiones) {
        conexion.send(
          JSON.stringify({
            tipo: "mover",
            nombre: datos.nombre,
            x: datos.x,
            y: datos.y,
          }),
        );
      }

      return;
    }

    // =====================================================
    // CHAT PRIVADO
    // =====================================================

    if (datos.tipo === "chat") {
      console.log(
        `💬 ${datos.de} → ${datos.para}: ${datos.texto}`,
      );

      const conexiones = this.ctx.getWebSockets();

      /**
       * Buscamos el WebSocket que pertenece
       * al destinatario.
       */
      for (const conexion of conexiones) {
        const datosJugador =
          conexion.deserializeAttachment() as
            | DatosJugador
            | null;

        /**
         * Si esta conexión pertenece al destinatario,
         * le enviamos el mensaje.
         */
        if (datosJugador?.nombre === datos.para) {
          conexion.send(
            JSON.stringify({
              tipo: "chat",
              de: datos.de,
              para: datos.para,
              texto: datos.texto,
            }),
          );
        }
      }

      return;
    }
  }

  /**
   * Envía a todos los navegadores la lista
   * actual de jugadores conectados.
   */
  enviarListaJugadores() {
    const conexiones = this.ctx.getWebSockets();

    /**
     * Convertimos:
     *
     * WebSockets
     *
     * en:
     *
     * ["RMI", "PMA", "ABC"]
     */
    const jugadoresConectados = conexiones
      .map((conexion) => {
        const datosJugador =
          conexion.deserializeAttachment() as
            | DatosJugador
            | null;

        return datosJugador?.nombre;
      })
      .filter(
        (nombre): nombre is string =>
          Boolean(nombre),
      );

    /**
     * Mandamos la lista a todos.
     */
    for (const conexion of conexiones) {
      conexion.send(
        JSON.stringify({
          tipo: "jugadores",
          jugadores: jugadoresConectados,
        }),
      );
    }
  }

  /**
   * Cloudflare ejecuta esta función cuando
   * un WebSocket se cierra.
   *
   * La usamos para actualizar la lista
   * de jugadores conectados.
   */
  webSocketClose() {
    this.enviarListaJugadores();
  }
}

/**
 * Worker principal.
 *
 * Su trabajo es decidir si la petición es:
 *
 * HTTP normal
 *
 * o
 *
 * WebSocket.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const upgradeHeader =
      request.headers.get("Upgrade");

    /**
     * Si abrimos localhost:8787 directamente
     * en el navegador veremos este mensaje.
     */
    if (upgradeHeader !== "websocket") {
      return new Response(
        "CRA Social Server funcionando",
      );
    }

    /**
     * Todos los jugadores entran actualmente
     * en la misma sala.
     *
     * Más adelante podríamos tener:
     *
     * sala-turno-mañana
     * sala-turno-tarde
     * sala-turno-noche
     */
    const idSala =
      env.SALA_CRA.idFromName("sala-principal");

    const sala = env.SALA_CRA.get(idSala);

    return sala.fetch(request);
  },
};