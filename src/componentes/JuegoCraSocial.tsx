import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";

declare const __CRA_SOCIAL_WS_URL__: string;

const obtenerUrlWebSocket = () => {
  if (__CRA_SOCIAL_WS_URL__) return __CRA_SOCIAL_WS_URL__;
  if (window.location.hostname === "localhost") return "ws://localhost:8787";

  const protocolo = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocolo}//${window.location.host}/cra-social`;
};

const colorOperador = (nombre: string) => {
  const colores = ["#25c7e8", "#ff9d24", "#8fdc35", "#a86cf1", "#ff557c", "#ffd23f"];
  const indice = Array.from(nombre).reduce(
    (total, letra) => total + letra.charCodeAt(0),
    0,
  );
  return colores[indice % colores.length];
};

const COLORES_OPERADOR = [
  { id: "cyan", nombre: "Cian", valor: "#25c7e8" },
  { id: "naranja", nombre: "Naranja", valor: "#ff9d24" },
  { id: "verde", nombre: "Verde", valor: "#8fdc35" },
  { id: "violeta", nombre: "Violeta", valor: "#a86cf1" },
  { id: "rosa", nombre: "Rosa", valor: "#ff557c" },
  { id: "amarillo", nombre: "Amarillo", valor: "#ffd23f" },
];

const TAREAS_CRA = [
  { id: "gestores-expedientes", nombre: "Validar expedientes", x: 70, y: 790, clase: "estacion-gestores", tipo: "clasificar" },
  { id: "cra-pantallas", nombre: "Calibrar pantallas", x: 740, y: 325, clase: "estacion-cra", tipo: "monitores" },
  { id: "str-diagnostico", nombre: "Diagnóstico STR", x: 1120, y: 570, clase: "estacion-str", tipo: "nodos" },
  { id: "office-cafetera", nombre: "Reparar cafetera", x: 1140, y: 260, clase: "estacion-office", tipo: "cafetera" },
  { id: "restringida-acceso", nombre: "Restablecer acceso", x: 1530, y: 440, clase: "estacion-restringida", tipo: "codigo" },
] as const;

const PANELES_SABOTAJE = [
  { id: "electricidad", sabotaje: "luces", x: 1450, y: 270, simbolo: "⚡", nombre: "Cuadro eléctrico" },
  { id: "via-a", sabotaje: "comunicaciones", x: 560, y: 790, simbolo: "A", nombre: "Enlace vía A" },
  { id: "via-b", sabotaje: "comunicaciones", x: 1510, y: 790, simbolo: "B", nombre: "Enlace vía B" },
] as const;

const AvatarOperador: React.FC<{
  nombre: string;
  local?: boolean;
  caminando?: boolean;
  eliminado?: boolean;
  color?: string;
  direccion?: "arriba" | "abajo" | "izquierda" | "derecha";
}> = ({ nombre, local = false, caminando = false, eliminado = false, color, direccion = "abajo" }) => (
  <div
    className={`cra-avatar ${local ? "es-local" : ""} ${caminando ? "caminando" : ""} ${eliminado ? "eliminado" : ""} mira-${direccion}`}
    style={{ "--operador-color": color ?? colorOperador(nombre) } as React.CSSProperties}
  >
    <span className="cra-avatar-nombre">{nombre}</span>
    <span className="cra-avatar-antena" />
    <span className="cra-avatar-cuerpo">
      <span className="cra-avatar-pantalla"><i /><i /></span>
      <span className="cra-avatar-insignia">⚡</span>
    </span>
    <span className="cra-avatar-pierna izquierda" />
    <span className="cra-avatar-pierna derecha" />
  </div>
);

const PuestoCra: React.FC<{ clase: string; monitores?: number }> = ({
  clase,
  monitores = 4,
}) => (
  <div className={`cra-puesto-nuevo ${clase}`}>
    <div className="cra-monitores">
      {Array.from({ length: monitores }, (_, indice) => (
        <span key={indice}><i /><b /></span>
      ))}
    </div>
    <div className="cra-escritorio"><i className="teclado" /><i className="raton" /><b className="torre">PC</b></div>
    <div className="cra-sillas"><i /><i /></div>
  </div>
);

const CamaraCra: React.FC<{ clase: string }> = ({ clase }) => (
  <div className={`cra-camara ${clase}`} aria-hidden="true">
    <b className="cra-camara-soporte" />
    <em className="cra-camara-led" />
    <i className="cra-camara-lente" />
    <span className="cra-camara-cono" />
  </div>
);

type TipoEstacion = "tarea" | "votacion";

const EstacionInteractiva: React.FC<{ id: string; tipo: TipoEstacion; clase: string; titulo: string }> = ({
  id, tipo, clase, titulo,
}) => (
  <div className={`cra-estacion cra-estacion-${tipo} ${clase}`} data-estacion-id={id} data-estacion-tipo={tipo} aria-label={titulo} title={`${titulo} (próximamente)`}>
    <i /><b>{tipo === "votacion" ? "VOTAR" : "TAREA"}</b>
  </div>
);

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

type Estancia = "gestores" | "cra" | "office" | "str" | "banos" | "restringida";

const NOMBRES_ESTANCIAS: Record<Estancia, string> = {
  gestores: "GESTORES", cra: "SALA CRA", office: "OFFICE / COMEDOR",
  str: "STR", banos: "BAÑOS", restringida: "ZONA RESTRINGIDA",
};

const estanciaEnPosicion = (x: number, y: number): Estancia => {
  if (x < 500) return "gestores";
  if (x < 980) return "cra";
  if (x < 1300) return y < 350 ? "office" : "str";
  return y < 350 ? "banos" : "restringida";
};

const estanciasVisibles = (x: number, y: number): Set<Estancia> => {
  const actual = estanciaEnPosicion(x, y);
  const visibles = new Set<Estancia>([actual]);
  if (x >= 470 && x <= 530 && y >= 360 && y <= 500) { visibles.add("gestores"); visibles.add("cra"); }
  if (x >= 950 && x <= 1010 && y >= 400 && y <= 540) { visibles.add("cra"); visibles.add("str"); }
  if (x >= 1080 && x <= 1190 && y >= 320 && y <= 380) { visibles.add("office"); visibles.add("str"); }
  if (x >= 1270 && x <= 1330 && y >= 120 && y <= 260) { visibles.add("office"); visibles.add("banos"); }
  if (x >= 1270 && x <= 1335 && y >= 600 && y <= 740) { visibles.add("str"); visibles.add("restringida"); }
  return visibles;
};

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
  // Aparición en el pasillo, junto a la mesa pero fuera de su colisión.
  const [x, establecerX] = React.useState(735);
  const [y, establecerY] = React.useState(510);
  const posicionRef = React.useRef({ x: 735, y: 510 });
  const teclasPulsadasRef = React.useRef(new Set<string>());
  const jugadorLocalRef = React.useRef<HTMLDivElement | null>(null);
  const marcoMapaRef = React.useRef<HTMLDivElement | null>(null);
  const [escalaMapa, establecerEscalaMapa] = React.useState(1);
  const [direccion, establecerDireccion] = React.useState<
    "arriba" | "abajo" | "izquierda" | "derecha"
  >("abajo");
  const [caminando, establecerCaminando] = React.useState(false);

  /**
   * Matrícula que representa al jugador.
   */
  const [matricula, establecerMatricula] = React.useState("");
  const [colorSeleccionado, establecerColorSeleccionado] = React.useState("");
  const [coloresJugadores, establecerColoresJugadores] = React.useState<Record<string, string>>({});

  const nombreJugador = matricula;

  // =====================================================
  // WEBSOCKET
  // =====================================================

  /**
   * Nos indica si actualmente estamos conectados.
   */
  const [conectado, establecerConectado] =
    React.useState(false);
  const [errorConexion, establecerErrorConexion] = React.useState("");
  const [eliminados, establecerEliminados] = React.useState<string[]>([]);
  const [eliminandose, establecerEliminandose] = React.useState<string[]>([]);
  const [reunion, establecerReunion] = React.useState<{ terminaEn: number; participantes: string[]; iniciadaPor: string; informado?: string } | null>(null);
  const [creadorSala, establecerCreadorSala] = React.useState("");
  const [partidaIniciada, establecerPartidaIniciada] = React.useState(false);
  const [rol, establecerRol] = React.useState<"impostor" | "operador" | "">("");
  const [mostrarRol, establecerMostrarRol] = React.useState(false);
  const [finalPartida, establecerFinalPartida] = React.useState<{ ganador: string; motivo: string; impostor: string } | null>(null);
  const [expulsadoAnimacion, establecerExpulsadoAnimacion] = React.useState("");
  const [tareasCompletadas, establecerTareasCompletadas] = React.useState<string[]>([]);
  const [tareaAbierta, establecerTareaAbierta] = React.useState<(typeof TAREAS_CRA)[number] | null>(null);
  const [pasoTarea, establecerPasoTarea] = React.useState(1);
  const [seleccionTarea, establecerSeleccionTarea] = React.useState<string[]>([]);
  const [errorTarea, establecerErrorTarea] = React.useState(false);
  const [sabotajeActivo, establecerSabotajeActivo] = React.useState<"luces" | "comunicaciones" | "">("");
  const [reparacionesSabotaje, establecerReparacionesSabotaje] = React.useState<string[]>([]);
  const [cooldownSabotajeHasta, establecerCooldownSabotajeHasta] = React.useState(0);
  const [segundosSabotaje, establecerSegundosSabotaje] = React.useState(0);
  const [sonidoActivo, establecerSonidoActivo] = React.useState(true);
  const audioRef = React.useRef<AudioContext | null>(null);
  const reproducirTono = React.useCallback((frecuencia: number, duracion = 0.12, tipo: OscillatorType = "sine", volumen = 0.025, retraso = 0) => {
    if (!sonidoActivo) return;
    const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    const contexto = audioRef.current ?? new Audio();
    audioRef.current = contexto;
    const inicio = contexto.currentTime + retraso;
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();
    oscilador.type = tipo; oscilador.frequency.setValueAtTime(frecuencia, inicio);
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    oscilador.connect(ganancia); ganancia.connect(contexto.destination);
    oscilador.start(inicio); oscilador.stop(inicio + duracion + 0.03);
  }, [sonidoActivo]);
  const reproducirSirena = React.useCallback(() => {
    if (!sonidoActivo) return;
    const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    const contexto = audioRef.current ?? new Audio(); audioRef.current = contexto;
    const inicio = contexto.currentTime;
    const oscilador = contexto.createOscillator(); const ganancia = contexto.createGain();
    oscilador.type = "sawtooth";
    oscilador.frequency.setValueAtTime(430, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(760, inicio + .62);
    oscilador.frequency.exponentialRampToValueAtTime(430, inicio + 1.25);
    ganancia.gain.setValueAtTime(.0001, inicio);
    ganancia.gain.linearRampToValueAtTime(.018, inicio + .08);
    ganancia.gain.setValueAtTime(.018, inicio + 1.1);
    ganancia.gain.linearRampToValueAtTime(.0001, inicio + 1.3);
    oscilador.connect(ganancia); ganancia.connect(contexto.destination);
    oscilador.start(inicio); oscilador.stop(inicio + 1.32);
  }, [sonidoActivo]);
  const reproducirEliminacion = React.useCallback(() => {
    reproducirTono(125, .34, "sawtooth", .032);
    reproducirTono(72, .48, "triangle", .028, .08);
    reproducirTono(620, .16, "square", .012, .03);
  }, [reproducirTono]);
  const [mensajesReunion, establecerMensajesReunion] = React.useState<MensajeChat[]>([]);
  const [mensajeReunion, establecerMensajeReunion] = React.useState("");
  const [votoEmitido, establecerVotoEmitido] = React.useState("");
  const [segundosReunion, establecerSegundosReunion] = React.useState(0);
  const [resultadoReunion, establecerResultadoReunion] = React.useState("");
  const estaEliminado = eliminados.includes(matricula);
  const fueraDeJuego = estaEliminado || eliminandose.includes(matricula);
  const estaEliminadoRef = React.useRef(false);
  React.useEffect(() => { estaEliminadoRef.current = fueraDeJuego; }, [fueraDeJuego]);

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
  const jugadorEnChatRef = React.useRef<Jugador | null>(null);
  React.useEffect(() => { jugadorEnChatRef.current = jugadorEnChat; }, [jugadorEnChat]);

  /**
   * Texto actualmente escrito en el input.
   */
  const [mensaje, establecerMensaje] =
    React.useState("");
  const [mensajesSinLeer, establecerMensajesSinLeer] = React.useState<Record<string, number>>({});
  const [avisoChat, establecerAvisoChat] = React.useState<{ nombre: string; texto: string } | null>(null);
  const [jugadoresHablando, establecerJugadoresHablando] = React.useState<Record<string, string>>({});
  const temporizadoresHablaRef = React.useRef<Record<string, number>>({});

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
    if (socketRef.current || !matricula || !colorSeleccionado) {
      if (!matricula || !colorSeleccionado) {
        establecerErrorConexion("Elige tu operador y un color antes de entrar.");
      }
      return;
    }

    establecerErrorConexion("");
    reproducirTono(440, .06, "sine", .012);
    const socket = new WebSocket(obtenerUrlWebSocket());

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
          color: colorSeleccionado,
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
      let datos: Record<string, unknown>;
      try {
        datos = JSON.parse(String(evento.data)) as Record<string, unknown>;
      } catch {
        return;
      }

      // -----------------------------------------
      // LISTA DE JUGADORES
      // -----------------------------------------

      if (datos.tipo === "jugadores") {
        establecerJugadoresConectados(
          Array.isArray(datos.jugadores)
            ? datos.jugadores.filter(
                (nombre): nombre is string => typeof nombre === "string",
              )
            : [],
        );
        establecerEliminados(
          Array.isArray(datos.eliminados)
            ? datos.eliminados.filter(
                (nombre): nombre is string => typeof nombre === "string",
              )
            : [],
        );
        establecerColoresJugadores(
          datos.colores && typeof datos.colores === "object"
            ? datos.colores as Record<string, string>
            : {},
        );

        const jugadores = new Set(
          Array.isArray(datos.jugadores) ? datos.jugadores : [],
        );
        establecerPosicionesRemotas((anteriores) =>
          Object.keys(anteriores).reduce<
            Record<string, { x: number; y: number }>
          >((actuales, nombre) => {
            if (jugadores.has(nombre)) actuales[nombre] = anteriores[nombre];
            return actuales;
          }, {}),
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
        if (
          typeof datos.nombre !== "string" ||
          typeof datos.x !== "number" ||
          typeof datos.y !== "number" ||
          datos.nombre === matricula
        ) {
          return;
        }
        const nombreRemoto = datos.nombre;
        const xRemota = datos.x;
        const yRemota = datos.y;
        if (typeof datos.color === "string") {
          establecerColoresJugadores((actuales) => ({ ...actuales, [nombreRemoto]: datos.color as string }));
        }

        establecerPosicionesRemotas(
          (anteriores) => ({
            ...anteriores,

            [nombreRemoto]: {
              x: xRemota,
              y: yRemota,
            },
          }),
        );

        return;
      }

      // -----------------------------------------
      // CHAT RECIBIDO
      // -----------------------------------------

      if (datos.tipo === "chat") {
        if (typeof datos.de !== "string" || typeof datos.texto !== "string") {
          return;
        }
        const remitente = datos.de;
        const texto = datos.texto;
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

            [remitente]: [
              ...(anteriores[remitente] ?? []),

              {
                autor: remitente,
                texto,
              },
            ],
          }),
        );
        if (jugadorEnChatRef.current?.nombre !== remitente) {
          establecerMensajesSinLeer((actuales) => ({ ...actuales, [remitente]: (actuales[remitente] ?? 0) + 1 }));
          establecerAvisoChat({ nombre: remitente, texto });
        }
        establecerJugadoresHablando((actuales) => ({ ...actuales, [remitente]: texto }));
        window.clearTimeout(temporizadoresHablaRef.current[remitente]);
        temporizadoresHablaRef.current[remitente] = window.setTimeout(() => {
          establecerJugadoresHablando((actuales) => {
            const siguientes = { ...actuales };
            delete siguientes[remitente];
            return siguientes;
          });
          delete temporizadoresHablaRef.current[remitente];
        }, 6500);

        return;
      }

      if (datos.tipo === "eliminado" && typeof datos.nombre === "string") {
        reproducirEliminacion();
        const nombreEliminado = datos.nombre;
        establecerEliminandose((actuales) =>
          actuales.includes(nombreEliminado) ? actuales : [...actuales, nombreEliminado],
        );
        window.setTimeout(() => {
          establecerEliminandose((actuales) => actuales.filter((nombre) => nombre !== nombreEliminado));
          establecerEliminados((actuales) =>
            actuales.includes(nombreEliminado) ? actuales : [...actuales, nombreEliminado],
          );
        }, 750);
        establecerChatAbierto(false);
        teclasPulsadasRef.current.clear();
        return;
      }

      if (datos.tipo === "reunion_iniciada" && typeof datos.terminaEn === "number") {
        reproducirTono(520, .12, "triangle", .02); reproducirTono(690, .18, "triangle", .02, .14);
        establecerReunion({
          terminaEn: datos.terminaEn,
          iniciadaPor: typeof datos.iniciadaPor === "string" ? datos.iniciadaPor : "CRA",
          participantes: Array.isArray(datos.participantes) ? datos.participantes.filter((nombre): nombre is string => typeof nombre === "string") : [],
          informado: typeof datos.informado === "string" ? datos.informado : undefined,
        });
        establecerMensajesReunion([]);
        establecerVotoEmitido("");
        establecerResultadoReunion("");
        establecerChatAbierto(false);
        teclasPulsadasRef.current.clear();
        return;
      }

      if (datos.tipo === "estado_sala") {
        establecerCreadorSala(typeof datos.creador === "string" ? datos.creador : "");
        establecerPartidaIniciada(datos.partidaIniciada === true);
        return;
      }

      if (datos.tipo === "rol_asignado" && (datos.rol === "impostor" || datos.rol === "operador")) {
        establecerRol(datos.rol);
        establecerTareasCompletadas([]);
        establecerSabotajeActivo("");
        establecerReparacionesSabotaje([]);
        establecerCooldownSabotajeHasta(0);
        establecerMostrarRol(true);
        establecerFinalPartida(null);
        window.setTimeout(() => establecerMostrarRol(false), 6500);
        return;
      }

      if (datos.tipo === "partida_finalizada") {
        establecerPartidaIniciada(false);
        establecerSabotajeActivo("");
        establecerReparacionesSabotaje([]);
        establecerFinalPartida({
          ganador: datos.ganador === "impostor" ? "impostor" : "operadores",
          motivo: typeof datos.motivo === "string" ? datos.motivo : "La partida ha terminado.",
          impostor: typeof datos.impostor === "string" ? datos.impostor : "IMPOSTOR",
        });
        establecerReunion(null);
        teclasPulsadasRef.current.clear();
        return;
      }

      if (datos.tipo === "tarea_completada" && typeof datos.tarea === "string") {
        establecerTareasCompletadas((actuales) => actuales.includes(datos.tarea as string) ? actuales : [...actuales, datos.tarea as string]);
        establecerTareaAbierta(null);
        establecerPasoTarea(1);
        reproducirTono(660, .12, "sine", .025); reproducirTono(880, .18, "sine", .025, .12);
        return;
      }

      if (datos.tipo === "sabotaje_activado" && (datos.sabotaje === "luces" || datos.sabotaje === "comunicaciones")) {
        establecerSabotajeActivo(datos.sabotaje);
        establecerReparacionesSabotaje(Array.isArray(datos.reparaciones) ? datos.reparaciones.filter((sitio): sitio is string => typeof sitio === "string") : []);
        if (typeof datos.cooldownHasta === "number") establecerCooldownSabotajeHasta(datos.cooldownHasta);
        if (datos.sabotaje === "comunicaciones") {
          establecerTareaAbierta(null); establecerSeleccionTarea([]); establecerPasoTarea(1);
        } else reproducirTono(190, .28, "sawtooth", .018);
        return;
      }
      if (datos.tipo === "sabotaje_progreso") {
        establecerReparacionesSabotaje(Array.isArray(datos.reparaciones) ? datos.reparaciones.filter((sitio): sitio is string => typeof sitio === "string") : []);
        return;
      }
      if (datos.tipo === "sabotaje_enfriamiento" && typeof datos.restante === "number") {
        establecerCooldownSabotajeHasta(Date.now() + datos.restante);
        return;
      }
      if (datos.tipo === "sabotaje_reparado") {
        establecerSabotajeActivo("");
        establecerReparacionesSabotaje([]);
        if (typeof datos.cooldownHasta === "number") establecerCooldownSabotajeHasta(datos.cooldownHasta);
        establecerTareaAbierta(null);
        reproducirTono(440, .12, "sine", .022); reproducirTono(660, .18, "sine", .022, .12);
        return;
      }

      if (datos.tipo === "chat_global" && typeof datos.de === "string" && typeof datos.texto === "string") {
        establecerMensajesReunion((actuales) => [...actuales, { autor: datos.de as string, texto: datos.texto as string }]);
        return;
      }

      if (datos.tipo === "reunion_finalizada") {
        const expulsado = typeof datos.expulsado === "string" ? datos.expulsado : "";
        establecerResultadoReunion(expulsado ? `${expulsado} ha sido expulsado por mayoría.` : "No hubo mayoría suficiente. Nadie fue expulsado.");
        if (expulsado) {
          establecerExpulsadoAnimacion(expulsado);
          establecerEliminandose((actuales) => actuales.includes(expulsado) ? actuales : [...actuales, expulsado]);
          window.setTimeout(() => {
            establecerExpulsadoAnimacion("");
            establecerEliminandose((actuales) => actuales.filter((nombre) => nombre !== expulsado));
            establecerEliminados((actuales) => actuales.includes(expulsado) ? actuales : [...actuales, expulsado]);
          }, 2400);
        }
        establecerReunion(null);
        establecerVotoEmitido("");
        window.setTimeout(() => establecerResultadoReunion(""), 6000);
        return;
      }

      if (datos.tipo === "error" && typeof datos.mensaje === "string") {
        establecerErrorConexion(datos.mensaje);
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
      establecerCreadorSala("");
      establecerPartidaIniciada(false);
      establecerReunion(null);
      establecerRol("");
      establecerFinalPartida(null);
    };

    /**
     * Nos ayuda a detectar problemas
     * con el WebSocket.
     */
    socket.onerror = () => {
      establecerErrorConexion(
        "No se pudo conectar con CRA Social. Comprueba que el servidor esté iniciado.",
      );
      console.error(
        "Error en WebSocket de CRA Social",
      );
    };
  };

  React.useEffect(
    () => () => {
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000);
      Object.values(temporizadoresHablaRef.current).forEach((temporizador) => window.clearTimeout(temporizador));
    },
    [],
  );

  React.useEffect(() => {
    if (!reunion) { establecerSegundosReunion(0); return; }
    const actualizar = () => establecerSegundosReunion(Math.max(0, Math.ceil((reunion.terminaEn - Date.now()) / 1000)));
    actualizar();
    const intervalo = window.setInterval(actualizar, 250);
    return () => window.clearInterval(intervalo);
  }, [reunion]);

  React.useEffect(() => {
    const actualizar = () => establecerSegundosSabotaje(Math.max(0, Math.ceil((cooldownSabotajeHasta - Date.now()) / 1000)));
    actualizar();
    const intervalo = window.setInterval(actualizar, 250);
    return () => window.clearInterval(intervalo);
  }, [cooldownSabotajeHasta]);

  React.useEffect(() => {
    if (sabotajeActivo !== "comunicaciones" || !sonidoActivo) return undefined;
    reproducirSirena();
    const intervalo = window.setInterval(reproducirSirena, 1800);
    return () => window.clearInterval(intervalo);
  }, [sabotajeActivo, sonidoActivo, reproducirSirena]);

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
      if (
        !estaEliminado &&
        !estanciasVisibles(x, y).has(estanciaEnPosicion(jugadorRemoto.x, jugadorRemoto.y))
      ) return false;
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
  const cuerpoCercano = otrosJugadores.find((jugador) =>
    eliminados.includes(jugador.nombre) &&
    estanciasVisibles(x, y).has(estanciaEnPosicion(jugador.x, jugador.y)) &&
    Math.hypot(x - jugador.x, y - jugador.y) < 100,
  );
  const jugadorCercanoRef = React.useRef<Jugador | undefined>(undefined);
  const chatAbiertoRef = React.useRef(false);
  React.useEffect(() => {
    jugadorCercanoRef.current = jugadorCercano;
    chatAbiertoRef.current = chatAbierto || Boolean(reunion);
  }, [jugadorCercano, chatAbierto, reunion]);

  // =====================================================
  // ENVIAR MENSAJE DE CHAT
  // =====================================================

  const enviarMensaje = () => {
    const texto = mensaje.trim().slice(0, 500);

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
    const jugador = { x: nuevoX + 5, y: nuevoY + 12, w: 32, h: 38 };
    if (nuevoX < 28 || nuevoY < 38 || nuevoX > 1530 || nuevoY > 820) return false;
    const obstaculos = [
      // Muros: cada tramo deja libre el hueco exacto de su puerta.
      { x: 480, y: 30, w: 30, h: 350 }, { x: 480, y: 500, w: 30, h: 360 },
      { x: 970, y: 30, w: 30, h: 390 }, { x: 970, y: 540, w: 30, h: 320 },
      { x: 1290, y: 30, w: 30, h: 100 }, { x: 1290, y: 250, w: 30, h: 100 },
      // Muro STR-restringida: sólo se atraviesa por la puerta central.
      { x: 1290, y: 370, w: 30, h: 240 }, { x: 1290, y: 730, w: 30, h: 130 },
      { x: 1000, y: 340, w: 100, h: 30 }, { x: 1200, y: 340, w: 90, h: 30 },
      { x: 1320, y: 340, w: 250, h: 30 },
      // Gestores: tres mesas largas, con corredor por todos sus lados.
      { x: 120, y: 155, w: 300, h: 82 }, { x: 120, y: 365, w: 300, h: 82 }, { x: 120, y: 575, w: 300, h: 82 },
      // CRA: cuatro islas, dejando libre el pasillo central y el perímetro.
      { x: 550, y: 165, w: 155, h: 115 }, { x: 800, y: 165, w: 155, h: 115 },
      { x: 550, y: 570, w: 155, h: 115 }, { x: 800, y: 570, w: 155, h: 115 },
      // Mesa de reuniones CRA, accesible por sus cuatro lados.
      { x: 700, y: 400, w: 90, h: 85 },
      // Office, STR, baños y acceso restringido.
      // Office: muebles separados, con paso libre entre máquina, mesa y cocina.
      { x: 1012, y: 90, w: 48, h: 105 },
      { x: 1075, y: 90, w: 46, h: 112 },
      { x: 1180, y: 135, w: 70, h: 56 },
      // STR: la pantalla y el puesto coinciden con su posición visual.
      { x: 1075, y: 455, w: 145, h: 75 },
      { x: 1048, y: 655, w: 220, h: 120 },
      { x: 1238, y: 535, w: 34, h: 70 },
      // Baños: bloque de tres cabinas y encimera de lavabos.
      { x: 1345, y: 82, w: 180, h: 62 },
      { x: 1492, y: 178, w: 48, h: 112 },
      { x: 1380, y: 475, w: 150, h: 220 },
      // Paneles de emergencia, separados de las estaciones de tareas.
      { x: 1426, y: 241, w: 48, h: 58 },
      { x: 536, y: 761, w: 48, h: 58 },
      { x: 1486, y: 761, w: 48, h: 58 },
    ];
    return !obstaculos.some((o) =>
      jugador.x < o.x + o.w && jugador.x + jugador.w > o.x &&
      jugador.y < o.y + o.h && jugador.y + jugador.h > o.y,
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

      const objetivo = evento.target as HTMLElement | null;
      if (
        objetivo instanceof HTMLInputElement ||
        objetivo instanceof HTMLTextAreaElement ||
        objetivo instanceof HTMLSelectElement ||
        objetivo?.isContentEditable
      ) {
        return;
      }

      /**
       * Si tenemos el chat abierto,
       * WASD no debe mover al personaje
       * mientras escribimos.
       */
      if (chatAbiertoRef.current || estaEliminadoRef.current) {
        return;
      }

      const tecla = evento.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(tecla)) {
        evento.preventDefault();
        teclasPulsadasRef.current.add(tecla);
        establecerCaminando(true);
        establecerDireccion(
          tecla === "w"
            ? "arriba"
            : tecla === "s"
              ? "abajo"
              : tecla === "a"
                ? "izquierda"
                : "derecha",
        );
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
        jugadorCercanoRef.current
      ) {
        establecerJugadorEnChat(
          jugadorCercanoRef.current,
        );

        establecerChatAbierto(true);
      }
    };

    window.addEventListener(
      "keydown",
      manejarTecla,
    );
    const terminarMovimiento = (evento: KeyboardEvent) => {
      if (["w", "a", "s", "d"].includes(evento.key.toLowerCase())) {
        teclasPulsadasRef.current.delete(evento.key.toLowerCase());
      }
    };
    window.addEventListener("keyup", terminarMovimiento);

    return () => {
      window.removeEventListener(
        "keydown",
        manejarTecla,
      );
      window.removeEventListener("keyup", terminarMovimiento);
    };
  }, []);

  React.useEffect(() => {
    let fotograma = 0;
    let tiempoAnterior = performance.now();
    let ultimoEnvio = 0;
    let ultimaActualizacionReact = 0;
    const actualizar = (ahora: number) => {
      const delta = Math.min((ahora - tiempoAnterior) / 1000, 0.04);
      tiempoAnterior = ahora;
      const teclas = teclasPulsadasRef.current;
      let dx = (teclas.has("d") ? 1 : 0) - (teclas.has("a") ? 1 : 0);
      let dy = (teclas.has("s") ? 1 : 0) - (teclas.has("w") ? 1 : 0);
      const moviendo = !chatAbiertoRef.current && !estaEliminadoRef.current && (dx !== 0 || dy !== 0);
      establecerCaminando(moviendo);
      if (moviendo) {
        if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) establecerDireccion(dx > 0 ? "derecha" : "izquierda");
        else establecerDireccion(dy > 0 ? "abajo" : "arriba");
        if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
        const actual = posicionRef.current;
        const velocidad = 235;
        let nuevoX = actual.x + dx * velocidad * delta;
        let nuevoY = actual.y + dy * velocidad * delta;
        if (!puedeMoverse(nuevoX, actual.y)) nuevoX = actual.x;
        if (!puedeMoverse(nuevoX, nuevoY)) nuevoY = actual.y;
        if (nuevoX !== actual.x || nuevoY !== actual.y) {
          posicionRef.current = { x: nuevoX, y: nuevoY };
          if (jugadorLocalRef.current) {
            jugadorLocalRef.current.style.transform =
              `translate3d(${nuevoX}px, ${nuevoY}px, 0)`;
          }
          // React solo necesita la posición para proximidad; el DOM se mueve a 60 FPS.
          if (ahora - ultimaActualizacionReact > 90) {
            establecerX(nuevoX);
            establecerY(nuevoY);
            ultimaActualizacionReact = ahora;
          }
          if (ahora - ultimoEnvio > 45 && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ tipo: "mover", nombre: matricula, x: nuevoX, y: nuevoY }));
            ultimoEnvio = ahora;
          }
        }
      }
      fotograma = requestAnimationFrame(actualizar);
    };
    const detener = () => teclasPulsadasRef.current.clear();
    window.addEventListener("blur", detener);
    fotograma = requestAnimationFrame(actualizar);
    return () => { cancelAnimationFrame(fotograma); window.removeEventListener("blur", detener); };
  }, [matricula]);

  React.useEffect(() => {
    const marco = marcoMapaRef.current;
    if (!marco) return undefined;
    const ajustar = () => {
      const anchoDisponible = Math.max(320, marco.clientWidth - 24);
      const altoDisponible = Math.max(390, window.innerHeight - 285);
      establecerEscalaMapa(Math.min(1, anchoDisponible / 1600, altoDisponible / 900));
    };
    const observador = new ResizeObserver(ajustar);
    observador.observe(marco);
    window.addEventListener("resize", ajustar);
    ajustar();
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", ajustar);
    };
  }, []);

  // =====================================================
  // INTERFAZ
  // =====================================================

  const abrirChat = (jugador: Jugador) => {
    if (sabotajeActivo === "comunicaciones") return;
    establecerJugadorEnChat(jugador);
    establecerChatAbierto(true);
    establecerMensajesSinLeer((actuales) => ({ ...actuales, [jugador.nombre]: 0 }));
    establecerAvisoChat((actual) => actual?.nombre === jugador.nombre ? null : actual);
  };

  const abrirChatDesdeAviso = () => {
    if (!avisoChat) return;
    const posicion = posicionesRemotas[avisoChat.nombre] ?? { x, y };
    abrirChat({ id: avisoChat.nombre, nombre: avisoChat.nombre, ...posicion });
  };

  const cerrarChat = () => {
    establecerChatAbierto(false);
    establecerJugadorEnChat(null);
    establecerMensaje("");
  };

  const eliminarJugadorCercano = () => {
    if (!partidaIniciada || rol !== "impostor" || !jugadorCercano || estaEliminado || eliminados.includes(jugadorCercano.nombre)) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ tipo: "eliminar", para: jugadorCercano.nombre }));
    }
  };
  const cercaMesaReunion = Math.hypot(x - 720, y - 425) < 140;
  const iniciarReunion = () => {
    if (!partidaIniciada || !cercaMesaReunion || reunion || fueraDeJuego || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ tipo: "iniciar_reunion" }));
  };
  const iniciarPartida = () => {
    if (matricula !== creadorSala || partidaIniciada || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ tipo: "iniciar_partida" }));
  };
  const informarCuerpo = () => {
    if (!partidaIniciada || !cuerpoCercano || reunion || fueraDeJuego || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ tipo: "informar", nombre: cuerpoCercano.nombre }));
  };
  const enviarMensajeReunion = () => {
    const texto = mensajeReunion.trim().slice(0, 500);
    if (!texto || !reunion || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ tipo: "chat_global", texto }));
    establecerMensajeReunion("");
  };
  const votar = (para: string) => {
    if (!reunion || votoEmitido || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ tipo: "votar", para }));
    establecerVotoEmitido(para);
  };
  const estanciaActual = estanciaEnPosicion(x, y);
  const tareaCercana = TAREAS_CRA.find((tarea) => Math.hypot(x - tarea.x, y - tarea.y) < 78);
  const abrirTarea = () => {
    if (!tareaCercana || rol !== "operador" || sabotajeActivo === "comunicaciones" || tareasCompletadas.includes(tareaCercana.id)) return;
    reproducirTono(520, .09, "sine", .018);
    establecerPasoTarea(1); establecerSeleccionTarea([]); establecerErrorTarea(false); establecerTareaAbierta(tareaCercana);
  };
  const completarTareaActual = () => {
    if (!tareaAbierta) return;
    socketRef.current?.send(JSON.stringify({ tipo: "completar_tarea", tarea: tareaAbierta.id }));
  };
  const pulsarPasoTarea = (valor: string, solucion: string[]) => {
    reproducirTono(360 + seleccionTarea.length * 70, .08, "sine", .016);
    const siguientes = [...seleccionTarea, valor];
    if (valor !== solucion[seleccionTarea.length]) {
      establecerSeleccionTarea([]); establecerPasoTarea(1); establecerErrorTarea(true);
      window.setTimeout(() => establecerErrorTarea(false), 700); return;
    }
    establecerSeleccionTarea(siguientes); establecerPasoTarea(siguientes.length + 1);
    if (siguientes.length === solucion.length) completarTareaActual();
  };
  const alternarOpcionTarea = (valor: string, total: number) => {
    reproducirTono(seleccionTarea.includes(valor) ? 280 : 520, .08, "square", .012);
    const siguientes = seleccionTarea.includes(valor) ? seleccionTarea.filter((item) => item !== valor) : [...seleccionTarea, valor];
    establecerSeleccionTarea(siguientes);
    if (siguientes.length === total) completarTareaActual();
  };
  const activarSabotaje = (sabotaje: "luces" | "comunicaciones") => socketRef.current?.send(JSON.stringify({ tipo: "sabotear", sabotaje }));
  const panelSabotajeCercano = PANELES_SABOTAJE.find((panel) =>
    panel.sabotaje === sabotajeActivo && !reparacionesSabotaje.includes(panel.id) && Math.hypot(x - panel.x, y - panel.y) < 78,
  );
  const puedeRepararSabotaje = Boolean(panelSabotajeCercano);
  const repararSabotaje = () => socketRef.current?.send(JSON.stringify({ tipo: "reparar_sabotaje", sabotaje: sabotajeActivo }));
  const zonasVisibles = estaEliminado
    ? new Set<Estancia>(["gestores", "cra", "office", "str", "banos", "restringida"])
    : estanciasVisibles(x, y);
  const jugadorEsVisible = (jugador: Jugador) =>
    estaEliminado || zonasVisibles.has(estanciaEnPosicion(jugador.x, jugador.y));
  const pulsarControlTactil = (
    tecla: "w" | "a" | "s" | "d",
    evento: React.PointerEvent<HTMLButtonElement>,
  ) => {
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    teclasPulsadasRef.current.add(tecla);
  };
  const soltarControlTactil = (
    tecla: "w" | "a" | "s" | "d",
    evento: React.PointerEvent<HTMLButtonElement>,
  ) => {
    evento.preventDefault();
    teclasPulsadasRef.current.delete(tecla);
  };
  const hablarDesdeTactil = () => {
    if (jugadorCercano && !fueraDeJuego && !eliminados.includes(jugadorCercano.nombre)) {
      abrirChat(jugadorCercano);
    }
  };

  return (
    <section className="cra-social-juego">
      <header className="cra-social-hud">
        <div className="cra-social-marca"><span>⚡</span><strong>CRA <b>SOCIAL</b></strong></div>
        <div className="cra-social-conectados">
          <small>OPERADORES CONECTADOS</small>
          <div className="cra-social-miniaturas">
            {jugadoresConectados.map((nombre) => (
              <span key={nombre} style={{ "--operador-color": coloresJugadores[nombre] ?? colorOperador(nombre) } as React.CSSProperties} title={nombre}>
                {nombre.slice(0, 2)}{Boolean(mensajesSinLeer[nombre]) && <b className="cra-chat-contador">{mensajesSinLeer[nombre] > 9 ? "9+" : mensajesSinLeer[nombre]}</b>}
              </span>
            ))}
            {!jugadoresConectados.length && <em>Ninguno todavía</em>}
          </div>
        </div>
        <div className={`cra-social-estado ${conectado ? "activo" : ""}`}>
          <div><i /> {conectado ? "CONECTADO" : "SIN CONEXIÓN"}</div>
          <small>UBICACIÓN: {NOMBRES_ESTANCIAS[estanciaActual]}</small>
          {partidaIniciada && rol && <small className={`cra-rol-hud ${rol}`}>ROL: {rol.toUpperCase()}</small>}
        </div>
        <button className="cra-control-sonido" type="button" onClick={() => establecerSonidoActivo((activo) => !activo)} aria-label={sonidoActivo ? "Silenciar sonidos" : "Activar sonidos"}>{sonidoActivo ? "🔊" : "🔇"}</button>
      </header>

      <div className="cra-social-acceso">
        <label>
          <span>Tu operador</span>
          <select disabled={conectado} value={matricula} onChange={(e) => establecerMatricula(e.target.value)}>
            <option value="">Selecciona tu operador</option>
            {operadores.map((operador) => (
              <option key={operador.matricula} value={operador.matricula}>
                {operador.matricula} · {operador.nombre}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="cra-selector-color" disabled={conectado}>
          <legend>Elige tu color</legend>
          {COLORES_OPERADOR.map((color) => {
            const ocupado = Object.values(coloresJugadores).includes(color.valor);
            return (
              <label key={color.id} title={ocupado ? `${color.nombre} ocupado` : color.nombre}>
                <input type="radio" name="color-operador" value={color.id} checked={colorSeleccionado === color.id} disabled={ocupado} onChange={() => establecerColorSeleccionado(color.id)} />
                <span style={{ background: color.valor }} />
              </label>
            );
          })}
        </fieldset>
        <button type="button" onClick={conectar} disabled={conectado || !matricula || !colorSeleccionado}>
          {conectado ? "Dentro de la estación" : "Entrar en CRA Social"}
        </button>
        <p>Muévete con <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> y habla con <kbd>E</kbd></p>
      </div>

      {errorConexion && <p className="cra-social-error" role="alert">{errorConexion}</p>}
      {avisoChat && !reunion && <div className="cra-aviso-chat" role="status"><span style={{ "--operador-color": coloresJugadores[avisoChat.nombre] ?? colorOperador(avisoChat.nombre) } as React.CSSProperties}>{avisoChat.nombre.slice(0, 2)}</span><div><small>NUEVO MENSAJE DE {avisoChat.nombre}</small><p>{avisoChat.texto}</p></div><button type="button" onClick={abrirChatDesdeAviso}>Abrir chat</button><button className="cerrar" type="button" onClick={() => establecerAvisoChat(null)} aria-label="Cerrar aviso">×</button></div>}
      {conectado && !partidaIniciada && <div className="cra-sala-espera"><div><strong>SALA DE ESPERA</strong><span>Esperando a que {creadorSala || "el creador"} inicie la partida. Eliminar, informar y votar están desactivados.</span></div>{matricula === creadorSala && <button type="button" onClick={iniciarPartida}>Iniciar partida</button>}</div>}

      <div className="cra-social-escenario-marco" ref={marcoMapaRef}>
        <div
          className="cra-social-mapa-viewport"
          style={{ width: 1600 * escalaMapa, height: 900 * escalaMapa }}
        >
        <div className={`cra-social-mapa ${estaEliminado ? "modo-fantasma" : ""} ${sabotajeActivo === "luces" ? "sabotaje-luces" : ""} ${sabotajeActivo === "comunicaciones" ? "sabotaje-comunicaciones" : ""}`} style={{ transform: `scale(${escalaMapa})`, "--jugador-x": `${x + 21}px`, "--jugador-y": `${y + 27}px` } as React.CSSProperties}>
          <div className="cra-sala gestores"><span>GESTORES</span>
            {["g1", "g2", "g3"].map((clase) => <PuestoCra clase={clase} monitores={6} key={clase} />)}
            <CamaraCra clase="cam-gestores" /><div className="cra-rack-servidor" /><div className="cra-fuente-agua" /><EstacionInteractiva id="gestores-expedientes" tipo="tarea" clase={`estacion-gestores ${tareasCompletadas.includes("gestores-expedientes") ? "completada" : "pendiente"}`} titulo="Validar expedientes" />
          </div>
          <div className="cra-sala operaciones"><span>SALA CRA</span><div className="cra-pasillo-sala"><b>PASILLO CENTRAL</b></div>
            {["c1", "c2", "c3", "c4"].map((clase) => <PuestoCra clase={clase} key={clase} />)}
            <CamaraCra clase="cam-cra-izq" /><CamaraCra clase="cam-cra-der" /><EstacionInteractiva id="cra-pantallas" tipo="tarea" clase={`estacion-cra ${tareasCompletadas.includes("cra-pantallas") ? "completada" : "pendiente"}`} titulo="Calibrar pantallas" />
          </div>
          <div className="cra-sala office"><span>OFFICE / COMEDOR</span>
            <div className="cra-maquina-snacks"><i /><i /><i /><b /></div>
            <div className="cra-mesa-comedor"><i className="cra-planta-mesa" /></div>
            <div className="cra-cocina"><i className="cra-cafetera" /><i className="cra-microondas" /><b className="cra-vasos" /></div>
            <EstacionInteractiva id="office-cafetera" tipo="tarea" clase={`estacion-office ${tareasCompletadas.includes("office-cafetera") ? "completada" : "pendiente"}`} titulo="Reparar cafetera" />
          </div>
          <div className="cra-sala str"><span>STR</span><div className="cra-pasillo-sala"><b>PASILLO CENTRAL</b></div>
            <div className="cra-pantalla-str"><i /><i /><i /></div><PuestoCra clase="s1" monitores={3} /><div className="cra-archivador-str"><i /><i /><i /></div><CamaraCra clase="cam-str" />
            <EstacionInteractiva id="str-diagnostico" tipo="tarea" clase={`estacion-str ${tareasCompletadas.includes("str-diagnostico") ? "completada" : "pendiente"}`} titulo="Diagnóstico STR" />
          </div>
          <div className="cra-sala banos"><span>BAÑOS</span><div className="cra-urinarios"><i /><i /><i /></div><div className="cra-lavabos-pared"><i /><i /></div></div>
          <div className="cra-sala restringida"><span>ZONA RESTRINGIDA</span><div className="cra-puerta-restringida"><b>ACCESO DENEGADO</b><i /></div><EstacionInteractiva id="restringida-acceso" tipo="tarea" clase={`estacion-restringida ${tareasCompletadas.includes("restringida-acceso") ? "completada" : "pendiente"}`} titulo="Restablecer acceso" /></div>
          <div className="cra-mesa-reunion"><EstacionInteractiva id="cra-reunion" tipo="votacion" clase="estacion-votacion-central" titulo="Consola de reunión y votaciones" /></div>
          <div className="cra-puerta puerta-gestores"><i /><span>ACCESO</span><i /></div>
          <div className="cra-puerta puerta-cra-str"><i /><span>ACCESO</span><i /></div>
          <div className="cra-puerta puerta-office-str horizontal"><i /><span>ACCESO</span><i /></div>
          <div className="cra-puerta puerta-banos"><i /><span>ACCESO</span><i /></div>
          <div className="cra-puerta puerta-str-restringida"><i /><span>ACCESO</span><i /></div>
          {PANELES_SABOTAJE.map((panel) => {
            const requerido = panel.sabotaje === sabotajeActivo;
            const reparado = reparacionesSabotaje.includes(panel.id);
            return <div className={`cra-panel-reparacion panel-${panel.id} ${requerido ? "activo" : ""} ${reparado ? "reparado" : ""}`} key={panel.id} style={{ left: panel.x, top: panel.y }} title={panel.nombre}><i>{panel.simbolo}</i><b>{panel.nombre}</b><span /></div>;
          })}

          {(["gestores", "cra", "office", "str", "banos", "restringida"] as Estancia[]).map((zona) => (
            <div
              className={`cra-niebla cra-niebla-${zona} ${zonasVisibles.has(zona) ? "visible" : "oculta"}`}
              key={zona}
              aria-hidden="true"
            ><span>{NOMBRES_ESTANCIAS[zona]}</span></div>
          ))}

          {otrosJugadores.filter(jugadorEsVisible).map((jugador) => (
            <button
              type="button"
              className={`cra-jugador remoto ${jugadorCercano?.id === jugador.id ? "cercano" : ""}`}
              key={jugador.id}
              style={{ left: jugador.x, top: jugador.y }}
              onClick={() => jugadorCercano?.id === jugador.id && abrirChat(jugador)}
              aria-label={`Operador ${jugador.nombre}`}
            >
              {jugadoresHablando[jugador.nombre] && <span className="cra-bocadillo-habla"><b>{jugador.nombre} te habla</b><small>{jugadoresHablando[jugador.nombre]}</small><i /></span>}
              <AvatarOperador nombre={jugador.nombre} color={coloresJugadores[jugador.nombre]} caminando eliminado={eliminados.includes(jugador.nombre)} />
              {eliminandose.includes(jugador.nombre) && <span className="cra-efecto-eliminacion"><i /><i /><i /><i /><b /></span>}
            </button>
          ))}

          {jugadorCercano && !chatAbierto && rol !== "impostor" && (
            <div className="cra-acciones-cercanas">
              <button className="cra-aviso-hablar" type="button" onClick={() => abrirChat(jugadorCercano)} disabled={estaEliminado || eliminados.includes(jugadorCercano.nombre)}>
                <span>•••</span> Hablar <kbd>E</kbd>
              </button>
            </div>
          )}
          {cuerpoCercano && partidaIniciada && !reunion && !fueraDeJuego && <button className="cra-boton-informar" type="button" onClick={informarCuerpo}>⚠ Informar: {cuerpoCercano.nombre}</button>}

          <div
            ref={jugadorLocalRef}
            className="cra-jugador local"
            style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
          >
            <AvatarOperador nombre={nombreJugador || "?"} color={COLORES_OPERADOR.find((color) => color.id === colorSeleccionado)?.valor} local caminando={caminando} eliminado={estaEliminado} direccion={direccion} />
            {eliminandose.includes(nombreJugador) && <span className="cra-efecto-eliminacion"><i /><i /><i /><i /><b /></span>}
          </div>

          {estaEliminado && (
            <div className="cra-eliminado-aviso"><strong>HAS SIDO ELIMINADO</strong><span>Puedes observar la estación, pero no moverte.</span></div>
          )}

          <div className="cra-controles"><kbd>W</kbd><div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div>
          <div className="cra-objetivo"><span>OBJETIVO</span><b>Explora la estación y habla con tu equipo</b></div>

          {cercaMesaReunion && partidaIniciada && !reunion && conectado && !fueraDeJuego && <button className="cra-iniciar-reunion" type="button" onClick={iniciarReunion}>Convocar reunión</button>}
          {resultadoReunion && <div className="cra-resultado-reunion" role="status">{resultadoReunion}</div>}
          {rol === "operador" && partidaIniciada && sabotajeActivo !== "comunicaciones" && tareaCercana && !tareasCompletadas.includes(tareaCercana.id) && !tareaAbierta && <button className="cra-abrir-tarea" style={{ left: tareaCercana.x, top: tareaCercana.y - 58 }} type="button" onClick={abrirTarea}>⚙ {tareaCercana.nombre}<i /></button>}
          {rol === "operador" && partidaIniciada && <div className="cra-progreso-tareas"><b>TAREAS {tareasCompletadas.length}/5</b><span><i style={{ width: `${tareasCompletadas.length * 20}%` }} /></span></div>}
          {rol === "impostor" && partidaIniciada && <div className="cra-barra-impostor" aria-label="Acciones del impostor">
            <button type="button" className="accion-hablar" onClick={hablarDesdeTactil} disabled={!jugadorCercano || fueraDeJuego || chatAbierto || sabotajeActivo === "comunicaciones"}><i>💬</i><span>Hablar</span></button>
            <button type="button" className="accion-sabotaje" disabled={Boolean(sabotajeActivo) || segundosSabotaje > 0} onClick={() => activarSabotaje("luces")}><i>💡</i><span>Luces</span></button>
            <button type="button" className="accion-sabotaje" disabled={Boolean(sabotajeActivo) || segundosSabotaje > 0} onClick={() => activarSabotaje("comunicaciones")}><i>↔</i><span>Doble vía</span></button>
            <em>{segundosSabotaje > 0 ? `${segundosSabotaje}s` : ""}</em>
            <button type="button" className="accion-eliminar" onClick={eliminarJugadorCercano} disabled={!jugadorCercano || fueraDeJuego || chatAbierto}><i>✕</i><span>Eliminar</span></button>
          </div>}
          {sabotajeActivo && <div className="cra-alerta-sabotaje">⚠ {sabotajeActivo === "luces" ? "LUCES APAGADAS · BUSCA EL CUADRO ⚡ EN BAÑOS" : `FALLO DOBLE VÍA · ENLACE A ${reparacionesSabotaje.includes("via-a") ? "✓" : "○"} · ENLACE B ${reparacionesSabotaje.includes("via-b") ? "✓" : "○"}`}</div>}
          {puedeRepararSabotaje && panelSabotajeCercano && <button className="cra-reparar-panel" style={{ left: panelSabotajeCercano.x, top: panelSabotajeCercano.y - 58 }} type="button" onClick={repararSabotaje}>🔧 Reparar {panelSabotajeCercano.nombre}<i /></button>}
          {tareaAbierta && <div className={`cra-minijuego tipo-${tareaAbierta.tipo} ${errorTarea ? "error" : ""}`}><header><small>TAREA</small><strong>{tareaAbierta.nombre}</strong><button type="button" onClick={() => establecerTareaAbierta(null)}>×</button></header>
            {tareaAbierta.tipo === "clasificar" && <><p>Archiva los expedientes por prioridad: URGENTE, NORMAL, BAJA.</p><div className="cra-tarea-expedientes">{["NORMAL", "BAJA", "URGENTE"].map((valor) => <button type="button" className={seleccionTarea.includes(valor) ? "presionado" : ""} key={valor} onClick={() => pulsarPasoTarea(valor, ["URGENTE", "NORMAL", "BAJA"])}>📁 {valor}</button>)}</div></>}
            {tareaAbierta.tipo === "monitores" && <><p>Activa las pantallas en el orden indicado: 2 → 4 → 1 → 3.</p><div className="cra-tarea-monitores">{[1,2,3,4].map((valor) => <button type="button" className={seleccionTarea.includes(String(valor)) ? "presionado" : ""} key={valor} onClick={() => pulsarPasoTarea(String(valor), ["2","4","1","3"])}><i />MON {valor}</button>)}</div></>}
            {tareaAbierta.tipo === "nodos" && <><p>Conecta todos los nodos de diagnóstico.</p><div className="cra-tarea-nodos">{["CPU","RED","DB","UPS"].map((valor) => <button type="button" className={seleccionTarea.includes(valor) ? "hecho" : ""} key={valor} onClick={() => alternarOpcionTarea(valor, 4)}>◉ {valor}</button>)}</div></>}
            {tareaAbierta.tipo === "cafetera" && <><p>Prepara el sistema en orden: agua, café y encendido.</p><div className="cra-tarea-cafetera">{[["☕","CAFÉ"],["⏻","ENCENDER"],["💧","AGUA"]].map(([icono, valor]) => <button type="button" className={seleccionTarea.includes(valor) ? "presionado" : ""} key={valor} onClick={() => pulsarPasoTarea(valor, ["AGUA","CAFÉ","ENCENDER"])}><b>{icono}</b>{valor}</button>)}</div></>}
            {tareaAbierta.tipo === "codigo" && <><p>Introduce el código de acceso: 3142.</p><div className="cra-tarea-codigo">{[1,2,3,4].map((valor) => <button type="button" className={seleccionTarea.includes(String(valor)) ? "presionado" : ""} key={valor} onClick={() => pulsarPasoTarea(String(valor), ["3","1","4","2"])}>{valor}</button>)}</div></>}
            <small>Progreso: {seleccionTarea.length}</small>
          </div>}
          {mostrarRol && rol && <div className={`cra-revelar-rol ${rol}`}><small>TU ROL ES</small><strong>{rol.toUpperCase()}</strong><p>{rol === "impostor" ? "Elimina operadores sin ser descubierto." : "Completa tareas y descubre al impostor."}</p></div>}
          {expulsadoAnimacion && <div className="cra-expulsion-final"><small>EXPULSADO</small><div><AvatarOperador nombre={expulsadoAnimacion} color={coloresJugadores[expulsadoAnimacion]} eliminado /><span className="cra-efecto-eliminacion"><i /><i /><i /><i /><b /></span></div><strong>{expulsadoAnimacion}</strong></div>}
          {finalPartida && <div className={`cra-final-partida ${finalPartida.ganador}`}><small>FIN DE LA PARTIDA</small><strong>{finalPartida.ganador === "impostor" ? "GANA EL IMPOSTOR" : "GANAN LOS OPERADORES"}</strong><div className="cra-avatar-resultado"><AvatarOperador nombre={finalPartida.impostor} color={coloresJugadores[finalPartida.impostor]} eliminado={finalPartida.ganador !== "impostor"} /><b>{finalPartida.ganador === "impostor" ? "IMPOSTOR GANADOR" : "IMPOSTOR DERROTADO"}</b></div><p>{finalPartida.motivo}</p>{matricula === creadorSala && <button type="button" onClick={iniciarPartida}>Nueva partida</button>}</div>}
          {reunion && (
            <div className="cra-reunion-panel" role="dialog" aria-label="Reunión y votación">
              <header><div><small>{reunion.informado ? `${reunion.iniciadaPor} informó el cuerpo de ${reunion.informado}` : `REUNIÓN · ${reunion.iniciadaPor}`}</small><strong>Chat y votación global</strong></div><time>{segundosReunion}s</time></header>
              <div className="cra-reunion-contenido">
                <div className="cra-reunion-chat"><div className="cra-chat-mensajes">
                  {!mensajesReunion.length && <p className="vacio">Hablad y decidid vuestro voto.</p>}
                  {mensajesReunion.map((item, indice) => <p className={item.autor === nombreJugador ? "propio" : "recibido"} key={`${item.autor}-${indice}`}><small>{item.autor}</small>{item.texto}</p>)}
                </div><div className="cra-chat-envio"><input autoFocus maxLength={500} value={mensajeReunion} onChange={(evento) => establecerMensajeReunion(evento.target.value)} onKeyDown={(evento) => evento.key === "Enter" && enviarMensajeReunion()} placeholder="Mensaje para todos…" /><button type="button" onClick={enviarMensajeReunion}>Enviar</button></div></div>
                <div className="cra-votacion"><strong>VOTA PARA EXPULSAR</strong><small>Hace falta mayoría absoluta</small>
                  {reunion.participantes.filter((nombre) => !eliminados.includes(nombre)).map((nombre) => <button type="button" key={nombre} disabled={Boolean(votoEmitido) || nombre === nombreJugador} onClick={() => votar(nombre)}><i style={{ background: coloresJugadores[nombre] ?? colorOperador(nombre) }} />{nombre}{votoEmitido === nombre ? " ✓" : ""}</button>)}
                  <button className="cra-voto-pasar" type="button" disabled={Boolean(votoEmitido)} onClick={() => votar("__pasar__")}>Pasar · No votar a nadie{votoEmitido === "__pasar__" ? " ✓" : ""}</button>
                  {votoEmitido && <p>{votoEmitido === "__pasar__" ? "Has decidido pasar." : `Voto registrado para ${votoEmitido}.`}</p>}
                </div>
              </div>
            </div>
          )}

          {chatAbierto && jugadorEnChat && (
            <div className="cra-chat" role="dialog" aria-label={`Chat con ${jugadorEnChat.nombre}`}>
              <header>
                <span style={{ "--operador-color": coloresJugadores[jugadorEnChat.nombre] ?? colorOperador(jugadorEnChat.nombre) } as React.CSSProperties} />
                <div><small>CANAL PRIVADO</small><strong>{jugadorEnChat.nombre}</strong></div>
                <button type="button" onClick={cerrarChat} aria-label="Cerrar chat">×</button>
              </header>
              <div className="cra-chat-mensajes">
                {!mensajesActuales.length && <p className="vacio">Inicia la conversación con este operador.</p>}
                {mensajesActuales.map((item, indice) => (
                  <p className={item.autor === nombreJugador ? "propio" : "recibido"} key={`${item.autor}-${indice}`}>
                    <small>{item.autor}</small>{item.texto}
                  </p>
                ))}
              </div>
              <div className="cra-chat-envio">
                <input autoFocus maxLength={500} value={mensaje} onChange={(e) => establecerMensaje(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarMensaje()} placeholder="Escribe un mensaje…" />
                <button type="button" onClick={enviarMensaje}>Enviar</button>
              </div>
            </div>
          )}
        </div>
        <div className="cra-controles-tactiles" aria-label="Controles táctiles">
          <div className="cra-cruceta-tactil">
            {(["w", "a", "s", "d"] as const).map((tecla) => (
              <button
                type="button"
                className={`tecla-${tecla}`}
                key={tecla}
                disabled={!conectado || fueraDeJuego || chatAbierto}
                onPointerDown={(evento) => pulsarControlTactil(tecla, evento)}
                onPointerUp={(evento) => soltarControlTactil(tecla, evento)}
                onPointerCancel={(evento) => soltarControlTactil(tecla, evento)}
                aria-label={tecla === "w" ? "Arriba" : tecla === "s" ? "Abajo" : tecla === "a" ? "Izquierda" : "Derecha"}
              >{tecla === "w" ? "▲" : tecla === "s" ? "▼" : tecla === "a" ? "◀" : "▶"}</button>
            ))}
          </div>
          <div className={`cra-acciones-tactiles ${rol === "impostor" ? "ocultas-impostor" : ""}`}>
            <button type="button" onClick={hablarDesdeTactil} disabled={!jugadorCercano || fueraDeJuego || chatAbierto}>💬<span>Hablar</span></button>
            {rol === "impostor" && <button type="button" className="eliminar" onClick={eliminarJugadorCercano} disabled={!partidaIniciada || !jugadorCercano || fueraDeJuego || chatAbierto}>✕<span>Eliminar</span></button>}
          </div>
        </div>
        </div>
      </div>
    </section>
  );

  /* Vista anterior conservada temporalmente como referencia durante la migración. */
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

      {errorConexion && <p role="alert">{errorConexion}</p>}

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
                maxLength={500}
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
