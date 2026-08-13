import { DurableObject } from "cloudflare:workers";

/**
 * Variables disponibles dentro de nuestro Worker.
 *
 * SALA_CRA es el Durable Object configurado
 * en wrangler.jsonc.
 */
interface Env {
  SALA_CRA: DurableObjectNamespace;
  ORIGEN_PERMITIDO?: string;
}

/**
 * Información que guardamos asociada a cada WebSocket.
 *
 * Gracias a serializeAttachment podemos saber posteriormente
 * qué matrícula pertenece a cada conexión.
 */
interface DatosJugador {
  nombre?: string;
  color?: string;
  x?: number;
  y?: number;
  eliminado?: boolean;
  rol?: "impostor" | "operador";
  tareasCompletadas?: string[];
}

/**
 * Mensaje enviado cuando un jugador entra.
 */
interface MensajeEntrar {
  tipo: "entrar";
  nombre: string;
  color: string;
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

interface MensajeEliminar {
  tipo: "eliminar";
  para: string;
}

interface MensajeIniciarReunion { tipo: "iniciar_reunion"; }
interface MensajeIniciarPartida { tipo: "iniciar_partida"; }
interface MensajeInformar { tipo: "informar"; nombre: string; }
interface MensajeChatGlobal { tipo: "chat_global"; texto: string; }
interface MensajeVotar { tipo: "votar"; para: string; }
interface MensajeCompletarTarea { tipo: "completar_tarea"; tarea: string; }
interface MensajeSabotear { tipo: "sabotear"; sabotaje: "luces" | "comunicaciones"; }
interface MensajeRepararSabotaje { tipo: "reparar_sabotaje"; sabotaje: "luces" | "comunicaciones"; }

interface EstadoReunion {
  activa: boolean;
  iniciadaPor: string;
  terminaEn: number;
  participantes: string[];
  votos: Record<string, string>;
  informado?: string;
}

/**
 * Todos los mensajes que actualmente acepta el servidor.
 */
type MensajeCliente = MensajeEntrar | MensajeMover | MensajeChat | MensajeEliminar | MensajeIniciarReunion | MensajeIniciarPartida | MensajeInformar | MensajeChatGlobal | MensajeVotar | MensajeCompletarTarea | MensajeSabotear | MensajeRepararSabotaje;

const NOMBRE_VALIDO = /^[A-Z0-9_-]{1,20}$/;
const COLORES_VALIDOS = new Set(["cyan", "naranja", "verde", "violeta", "rosa", "amarillo"]);
const COLORES_HEX: Record<string, string> = {
  cyan: "#25c7e8", naranja: "#ff9d24", verde: "#8fdc35",
  violeta: "#a86cf1", rosa: "#ff557c", amarillo: "#ffd23f",
};
const LONGITUD_MAXIMA_MENSAJE = 500;
const TAREAS_VALIDAS = new Set(["gestores-expedientes", "cra-pantallas", "str-diagnostico", "office-cafetera", "restringida-acceso"]);
const POSICIONES_TAREAS: Record<string, { x: number; y: number }> = {
  "gestores-expedientes": { x: 70, y: 790 }, "cra-pantallas": { x: 740, y: 325 },
  "str-diagnostico": { x: 1120, y: 570 }, "office-cafetera": { x: 1140, y: 260 },
  "restringida-acceso": { x: 1530, y: 440 },
};

const esRegistro = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null;

const enviar = (socket: WebSocket, mensaje: Record<string, unknown>) => {
  try {
    socket.send(JSON.stringify(mensaje));
  } catch {
    // La conexión puede haberse cerrado entre getWebSockets() y send().
  }
};

/**
 * Sala multijugador de CRA Social.
 *
 * Todos los jugadores están actualmente dentro
 * de una única sala llamada "sala-principal".
 */
export class SalaCra extends DurableObject {
  private async obtenerReunion(): Promise<EstadoReunion | null> {
    const reunion = await this.ctx.storage.get<EstadoReunion>("reunion");
    return reunion?.activa && reunion.terminaEn > Date.now() ? reunion : null;
  }

  private difundir(mensaje: Record<string, unknown>) {
    for (const conexion of this.ctx.getWebSockets()) enviar(conexion, mensaje);
  }

  private async enviarEstadoSala() {
    const creador = await this.ctx.storage.get<string>("creador");
    const partidaIniciada = (await this.ctx.storage.get<boolean>("partidaIniciada")) ?? false;
    this.difundir({ tipo: "estado_sala", creador, partidaIniciada });
  }

  private async crearReunion(convocante: DatosJugador & { nombre: string }, informado?: string) {
    const participantes = this.ctx.getWebSockets()
      .map((conexion) => conexion.deserializeAttachment() as DatosJugador | null)
      .filter((jugador): jugador is DatosJugador & { nombre: string } => Boolean(jugador?.nombre && !jugador.eliminado))
      .map((jugador) => jugador.nombre);
    const reunion: EstadoReunion = { activa: true, iniciadaPor: convocante.nombre, terminaEn: Date.now() + 30_000, participantes, votos: {}, informado };
    await this.ctx.storage.put("reunion", reunion);
    await this.ctx.storage.setAlarm(reunion.terminaEn);
    this.difundir({ tipo: "reunion_iniciada", ...reunion });
  }

  private async finalizarReunion(reunion: EstadoReunion) {
    const conteo: Record<string, number> = {};
    for (const elegido of Object.values(reunion.votos)) conteo[elegido] = (conteo[elegido] ?? 0) + 1;
    const orden = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    const mayoria = Math.floor(reunion.participantes.length / 2) + 1;
    const expulsado = orden[0] && orden[0][0] !== "__pasar__" && orden[0][1] >= mayoria && (!orden[1] || orden[0][1] > orden[1][1]) ? orden[0][0] : null;
    if (expulsado) {
      const conexion = this.ctx.getWebSockets().find((socket) => (socket.deserializeAttachment() as DatosJugador | null)?.nombre === expulsado);
      if (conexion) {
        const jugador = conexion.deserializeAttachment() as DatosJugador;
        conexion.serializeAttachment({ ...jugador, eliminado: true });
      }
    }
    await this.ctx.storage.delete("reunion");
    this.difundir({ tipo: "reunion_finalizada", expulsado, conteo, mayoria });
    this.enviarListaJugadores();
    if (expulsado) await this.comprobarVictoria();
  }

  private async comprobarVictoria() {
    if (!(await this.ctx.storage.get<boolean>("partidaIniciada"))) return;
    const jugadores = this.ctx.getWebSockets().map((conexion) => conexion.deserializeAttachment() as DatosJugador | null);
    const impostor = jugadores.find((jugador) => jugador?.rol === "impostor");
    if (!impostor || impostor.eliminado) {
      await this.finalizarPartida("operadores", "El impostor ha sido eliminado.");
      return;
    }
    const operadoresVivos = jugadores.filter((jugador) => jugador?.rol === "operador" && !jugador.eliminado).length;
    if (operadoresVivos <= 1) await this.finalizarPartida("impostor", "Solo queda un operador con vida.");
  }

  private async finalizarPartida(ganador: "impostor" | "operadores", motivo: string) {
    const impostor = await this.ctx.storage.get<string>("impostor");
    await this.ctx.storage.put("partidaIniciada", false);
    await this.ctx.storage.delete("reunion");
    await this.ctx.storage.delete(["sabotaje", "reparacionesSabotaje"]);
    this.difundir({ tipo: "partida_finalizada", ganador, motivo, impostor });
    await this.enviarEstadoSala();
  }

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
  async webSocketMessage(
    webSocket: WebSocket,
    mensaje: string | ArrayBuffer,
  ) {
    const textoMensaje = String(mensaje);

    if (textoMensaje.length > 10_000) {
      webSocket.close(1009, "Mensaje demasiado grande");
      return;
    }

    console.log("Mensaje recibido:", textoMensaje);

    let datos: unknown;

    /**
     * Intentamos convertir el mensaje recibido
     * desde JSON.
     *
     * Si llega algo que no sea JSON válido,
     * simplemente lo ignoramos.
     */
    try {
      datos = JSON.parse(textoMensaje);
    } catch {
      console.log("Mensaje JSON no válido");
      return;
    }

    if (!esRegistro(datos) || typeof datos.tipo !== "string") return;

    // =====================================================
    // JUGADOR ENTRA EN CRA SOCIAL
    // =====================================================

    if (datos.tipo === "entrar") {
      if (
        typeof datos.nombre !== "string" || !NOMBRE_VALIDO.test(datos.nombre) ||
        typeof datos.color !== "string" || !COLORES_VALIDOS.has(datos.color)
      ) {
        enviar(webSocket, {
          tipo: "error",
          mensaje: "La matrícula no es válida.",
        });
        webSocket.close(1008, "Matrícula no válida");
        return;
      }

      const nombreOcupado = this.ctx.getWebSockets().some((conexion) => {
        if (conexion === webSocket) return false;
        const jugador = conexion.deserializeAttachment() as DatosJugador | null;
        return jugador?.nombre === datos.nombre;
      });
      const colorOcupado = this.ctx.getWebSockets().some((conexion) => {
        if (conexion === webSocket) return false;
        const jugador = conexion.deserializeAttachment() as DatosJugador | null;
        return jugador?.color === COLORES_HEX[datos.color as string];
      });

      if (nombreOcupado || colorOcupado) {
        enviar(webSocket, {
          tipo: "error",
          mensaje: nombreOcupado
            ? `La matrícula ${datos.nombre} ya está conectada.`
            : "Ese color ya lo está usando otro operador.",
        });
        webSocket.close(1008, "Matrícula duplicada");
        return;
      }
      /**
       * Asociamos la matrícula con este WebSocket.
       *
       * Por ejemplo:
       *
       * WebSocket #1 → RMI
       * WebSocket #2 → PMA
       */
      const primeraConexion = !this.ctx.getWebSockets().some((conexion) => {
        const jugador = conexion.deserializeAttachment() as DatosJugador | null;
        return conexion !== webSocket && Boolean(jugador?.nombre);
      });
      if (primeraConexion) {
        await this.ctx.storage.put("creador", datos.nombre);
        await this.ctx.storage.put("partidaIniciada", false);
        await this.ctx.storage.delete("reunion");
      }
      webSocket.serializeAttachment({
        nombre: datos.nombre,
        color: COLORES_HEX[datos.color],
      });

      // El jugador que entra recibe inmediatamente las posiciones conocidas.
      for (const conexion of this.ctx.getWebSockets()) {
        if (conexion === webSocket) continue;
        const conectado = conexion.deserializeAttachment() as DatosJugador | null;
        if (
          conectado?.nombre &&
          typeof conectado.x === "number" &&
          typeof conectado.y === "number"
        ) {
          enviar(webSocket, {
            tipo: "mover",
            nombre: conectado.nombre,
            color: conectado.color,
            x: conectado.x,
            y: conectado.y,
          });
        }
      }

      /**
       * Avisamos a todos de la nueva lista
       * de jugadores conectados.
       */
      this.enviarListaJugadores();
      await this.enviarEstadoSala();

      const reunion = await this.obtenerReunion();
      if (reunion) enviar(webSocket, { tipo: "reunion_iniciada", ...reunion });
      const sabotaje = await this.ctx.storage.get<string>("sabotaje");
      if (sabotaje) enviar(webSocket, { tipo: "sabotaje_activado", sabotaje, reparaciones: (await this.ctx.storage.get<string[]>("reparacionesSabotaje")) ?? [] });

      console.log(
        `${datos.nombre} ha entrado en CRA Social`,
      );

      return;
    }

    // =====================================================
    // MOVIMIENTO
    // =====================================================

    if (datos.tipo === "mover") {
      const jugador = webSocket.deserializeAttachment() as DatosJugador | null;
      if (await this.obtenerReunion()) return;
      if (
        !jugador?.nombre ||
        jugador.eliminado ||
        typeof datos.x !== "number" ||
        typeof datos.y !== "number" ||
        !Number.isFinite(datos.x) ||
        !Number.isFinite(datos.y)
      ) {
        return;
      }

      const x = Math.max(28, Math.min(1530, datos.x));
      const y = Math.max(38, Math.min(820, datos.y));
      webSocket.serializeAttachment({ ...jugador, x, y });
      console.log(
        `${jugador.nombre} se mueve → x: ${x}, y: ${y}`,
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
        enviar(conexion, {
          tipo: "mover",
          nombre: jugador.nombre,
          color: jugador.color,
          x,
          y,
        });
      }

      return;
    }

    if (datos.tipo === "iniciar_partida") {
      const jugador = webSocket.deserializeAttachment() as DatosJugador | null;
      const creador = await this.ctx.storage.get<string>("creador");
      if (!jugador?.nombre || jugador.nombre !== creador || await this.ctx.storage.get<boolean>("partidaIniciada")) return;
      const conexiones = this.ctx.getWebSockets().filter((conexion) => Boolean((conexion.deserializeAttachment() as DatosJugador | null)?.nombre));
      if (conexiones.length < 3) {
        enviar(webSocket, { tipo: "error", mensaje: "Se necesitan al menos 3 jugadores para iniciar la partida." });
        return;
      }
      const aleatorio = new Uint32Array(1);
      crypto.getRandomValues(aleatorio);
      const indiceImpostor = aleatorio[0] % conexiones.length;
      conexiones.forEach((conexion, indice) => {
        const conectado = conexion.deserializeAttachment() as DatosJugador;
        const rol = indice === indiceImpostor ? "impostor" : "operador";
        conexion.serializeAttachment({ ...conectado, eliminado: false, rol, tareasCompletadas: [] });
        enviar(conexion, { tipo: "rol_asignado", rol });
      });
      const datosImpostor = conexiones[indiceImpostor].deserializeAttachment() as DatosJugador;
      await this.ctx.storage.put("impostor", datosImpostor.nombre as string);
      await this.ctx.storage.delete("sabotaje");
      await this.ctx.storage.delete(["ultimoSabotaje", "reparacionesSabotaje"]);
      await this.ctx.storage.put("partidaIniciada", true);
      await this.enviarEstadoSala();
      this.difundir({ tipo: "partida_iniciada", por: jugador.nombre });
      this.enviarListaJugadores();
      return;
    }

    if (datos.tipo === "completar_tarea") {
      const jugador = webSocket.deserializeAttachment() as DatosJugador | null;
      if ((await this.ctx.storage.get<string>("sabotaje")) === "comunicaciones") return;
      if (!jugador?.nombre || jugador.rol !== "operador" || jugador.eliminado || typeof datos.tarea !== "string" || !TAREAS_VALIDAS.has(datos.tarea)) return;
      const posicion = POSICIONES_TAREAS[datos.tarea];
      if (typeof jugador.x !== "number" || typeof jugador.y !== "number" || Math.hypot(jugador.x - posicion.x, jugador.y - posicion.y) > 105) return;
      const completadas = Array.from(new Set([...(jugador.tareasCompletadas ?? []), datos.tarea]));
      webSocket.serializeAttachment({ ...jugador, tareasCompletadas: completadas });
      enviar(webSocket, { tipo: "tarea_completada", tarea: datos.tarea, completadas: completadas.length, total: TAREAS_VALIDAS.size });
      if (completadas.length >= TAREAS_VALIDAS.size) await this.finalizarPartida("operadores", `${jugador.nombre} ha completado las cinco tareas.`);
      return;
    }

    if (datos.tipo === "sabotear") {
      const jugador = webSocket.deserializeAttachment() as DatosJugador | null;
      if (!jugador?.nombre || jugador.rol !== "impostor" || jugador.eliminado || !(await this.ctx.storage.get<boolean>("partidaIniciada")) || (datos.sabotaje !== "luces" && datos.sabotaje !== "comunicaciones")) return;
      if (await this.ctx.storage.get<string>("sabotaje")) return;
      const ultimoSabotaje = (await this.ctx.storage.get<number>("ultimoSabotaje")) ?? 0;
      const restante = Math.max(0, 15_000 - (Date.now() - ultimoSabotaje));
      if (restante > 0) {
        enviar(webSocket, { tipo: "sabotaje_enfriamiento", restante });
        return;
      }
      await this.ctx.storage.put("sabotaje", datos.sabotaje);
      await this.ctx.storage.put("reparacionesSabotaje", []);
      this.difundir({ tipo: "sabotaje_activado", sabotaje: datos.sabotaje, reparaciones: [] });
      return;
    }

    if (datos.tipo === "reparar_sabotaje") {
      const jugador = webSocket.deserializeAttachment() as DatosJugador | null;
      const activo = await this.ctx.storage.get<string>("sabotaje");
      if (!jugador?.nombre || jugador.eliminado || datos.sabotaje !== activo || typeof jugador.x !== "number" || typeof jugador.y !== "number") return;
      const sitio = activo === "luces"
        ? (Math.hypot(jugador.x - 1450, jugador.y - 270) <= 105 ? "electricidad" : "")
        : Math.hypot(jugador.x - 560, jugador.y - 790) <= 105 ? "via-a"
          : Math.hypot(jugador.x - 1510, jugador.y - 790) <= 105 ? "via-b" : "";
      if (!sitio) return;
      const reparaciones = Array.from(new Set([...(await this.ctx.storage.get<string[]>("reparacionesSabotaje") ?? []), sitio]));
      const terminado = activo === "luces" || (reparaciones.includes("via-a") && reparaciones.includes("via-b"));
      if (!terminado) {
        await this.ctx.storage.put("reparacionesSabotaje", reparaciones);
        this.difundir({ tipo: "sabotaje_progreso", sabotaje: activo, reparaciones });
        return;
      }
      await this.ctx.storage.delete("sabotaje");
      await this.ctx.storage.delete("reparacionesSabotaje");
      const cooldownHasta = Date.now() + 15_000;
      await this.ctx.storage.put("ultimoSabotaje", Date.now());
      this.difundir({ tipo: "sabotaje_reparado", sabotaje: activo, por: jugador.nombre, cooldownHasta });
      return;
    }

    if (datos.tipo === "iniciar_reunion") {
      const convocante = webSocket.deserializeAttachment() as DatosJugador | null;
      if (!convocante?.nombre || convocante.eliminado || !(await this.ctx.storage.get<boolean>("partidaIniciada")) || await this.obtenerReunion()) return;
      if (typeof convocante.x !== "number" || typeof convocante.y !== "number" || Math.hypot(convocante.x - 720, convocante.y - 425) > 140) return;
      await this.crearReunion(convocante as DatosJugador & { nombre: string });
      return;
    }

    if (datos.tipo === "informar") {
      const informante = webSocket.deserializeAttachment() as DatosJugador | null;
      if (!informante?.nombre || informante.eliminado || !(await this.ctx.storage.get<boolean>("partidaIniciada")) || await this.obtenerReunion() || typeof datos.nombre !== "string") return;
      const cuerpo = this.ctx.getWebSockets().map((conexion) => conexion.deserializeAttachment() as DatosJugador | null).find((jugador) => jugador?.nombre === datos.nombre && jugador.eliminado);
      if (!cuerpo || typeof informante.x !== "number" || typeof informante.y !== "number" || typeof cuerpo.x !== "number" || typeof cuerpo.y !== "number" || Math.hypot(informante.x - cuerpo.x, informante.y - cuerpo.y) > 115) return;
      await this.crearReunion(informante as DatosJugador & { nombre: string }, cuerpo.nombre);
      return;
    }

    if (datos.tipo === "chat_global") {
      const remitente = webSocket.deserializeAttachment() as DatosJugador | null;
      const reunion = await this.obtenerReunion();
      if (!remitente?.nombre || remitente.eliminado || !reunion?.participantes.includes(remitente.nombre) || typeof datos.texto !== "string") return;
      const texto = datos.texto.trim().slice(0, LONGITUD_MAXIMA_MENSAJE);
      if (texto) this.difundir({ tipo: "chat_global", de: remitente.nombre, texto });
      return;
    }

    if (datos.tipo === "votar") {
      const votante = webSocket.deserializeAttachment() as DatosJugador | null;
      const reunion = await this.obtenerReunion();
      if (!votante?.nombre || votante.eliminado || !reunion || typeof datos.para !== "string") return;
      const destinoValido = datos.para === "__pasar__" || reunion.participantes.includes(datos.para);
      if (!reunion.participantes.includes(votante.nombre) || !destinoValido || datos.para === votante.nombre || reunion.votos[votante.nombre]) return;
      reunion.votos[votante.nombre] = datos.para;
      await this.ctx.storage.put("reunion", reunion);
      this.difundir({ tipo: "voto_registrado", votante: votante.nombre, total: Object.keys(reunion.votos).length });
      if (Object.keys(reunion.votos).length >= reunion.participantes.length) await this.finalizarReunion(reunion);
      return;
    }

    if (datos.tipo === "eliminar") {
      const atacante = webSocket.deserializeAttachment() as DatosJugador | null;
      if (await this.obtenerReunion()) return;
      if (!atacante?.nombre || atacante.rol !== "impostor" || atacante.eliminado || !(await this.ctx.storage.get<boolean>("partidaIniciada")) || typeof datos.para !== "string") return;
      const conexiones = this.ctx.getWebSockets();
      const objetivo = conexiones.find((conexion) => {
        const jugador = conexion.deserializeAttachment() as DatosJugador | null;
        return jugador?.nombre === datos.para && !jugador.eliminado;
      });
      if (!objetivo) return;
      const victima = objetivo.deserializeAttachment() as DatosJugador;
      if (
        typeof atacante.x !== "number" || typeof atacante.y !== "number" ||
        typeof victima.x !== "number" || typeof victima.y !== "number" ||
        Math.hypot(atacante.x - victima.x, atacante.y - victima.y) > 115
      ) return;

      objetivo.serializeAttachment({ ...victima, eliminado: true });
      for (const conexion of conexiones) {
        enviar(conexion, { tipo: "eliminado", nombre: victima.nombre, por: atacante.nombre });
      }
      await this.comprobarVictoria();
      return;
    }

    // =====================================================
    // CHAT PRIVADO
    // =====================================================

    if (datos.tipo === "chat") {
      const remitente = webSocket.deserializeAttachment() as DatosJugador | null;
      if (
        !remitente?.nombre ||
        typeof datos.para !== "string" ||
        !NOMBRE_VALIDO.test(datos.para) ||
        typeof datos.texto !== "string"
      ) {
        return;
      }

      const texto = datos.texto.trim().slice(0, LONGITUD_MAXIMA_MENSAJE);
      if (!texto) return;

      console.log(`Mensaje privado: ${remitente.nombre} → ${datos.para}`);

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
          enviar(conexion, {
            tipo: "chat",
            de: remitente.nombre,
            para: datos.para,
            texto,
          });
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
    const jugadoresConectados = Array.from(
      new Set(
        conexiones.map((conexion) => {
        const datosJugador =
          conexion.deserializeAttachment() as
            | DatosJugador
            | null;

        return datosJugador?.nombre;
        }).filter((nombre): nombre is string => Boolean(nombre)),
      ),
    );
    const jugadoresEliminados = conexiones
      .map((conexion) => conexion.deserializeAttachment() as DatosJugador | null)
      .filter((jugador) => jugador?.nombre && jugador.eliminado)
      .map((jugador) => jugador.nombre as string);
    const coloresJugadores = Object.fromEntries(
      conexiones
        .map((conexion) => conexion.deserializeAttachment() as DatosJugador | null)
        .filter((jugador): jugador is DatosJugador & { nombre: string; color: string } =>
          Boolean(jugador?.nombre && jugador.color),
        )
        .map((jugador) => [jugador.nombre, jugador.color]),
    );

    /**
     * Mandamos la lista a todos.
     */
    for (const conexion of conexiones) {
      enviar(conexion, {
        tipo: "jugadores",
        jugadores: jugadoresConectados,
        eliminados: jugadoresEliminados,
        colores: coloresJugadores,
      });
    }
  }

  /**
   * Cloudflare ejecuta esta función cuando
   * un WebSocket se cierra.
   *
   * La usamos para actualizar la lista
   * de jugadores conectados.
   */
  async webSocketClose() {
    this.enviarListaJugadores();
    const restantes = this.ctx.getWebSockets()
      .map((conexion) => conexion.deserializeAttachment() as DatosJugador | null)
      .filter((jugador): jugador is DatosJugador & { nombre: string } => Boolean(jugador?.nombre));
    if (!restantes.length) {
      await this.ctx.storage.delete(["creador", "partidaIniciada", "reunion", "impostor"]);
      return;
    }
    const creador = await this.ctx.storage.get<string>("creador");
    if (!restantes.some((jugador) => jugador.nombre === creador)) await this.ctx.storage.put("creador", restantes[0].nombre);
    await this.enviarEstadoSala();
    await this.comprobarVictoria();
  }

  async alarm() {
    const reunion = await this.ctx.storage.get<EstadoReunion>("reunion");
    if (!reunion?.activa) return;
    await this.finalizarReunion(reunion);
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

    const origen = request.headers.get("Origin");
    if (env.ORIGEN_PERMITIDO && origen !== env.ORIGEN_PERMITIDO) {
      return new Response("Origen no permitido", { status: 403 });
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
