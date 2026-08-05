import mapaRoboSinAcuda from "./mapas/robo-sin-acuda.svg";
import mapaRoboAcudaAviso from "./mapas/robo-acuda-con-aviso.svg";
import mapaRoboAcudaSinAviso from "./mapas/robo-acuda-sin-aviso.svg";

// Modalidades de robo contempladas por el primer flujograma interactivo.
export type ModalidadRobo = "sin-acuda" | "acuda-aviso" | "acuda-sin-aviso";

// Cada respuesta visible contiene el texto del botón y el ID del paso siguiente.
export interface OpcionFlujo {
  label: string;
  next: string;
  mode?: ModalidadRobo;
}

// Estructura común de una pregunta o resultado del asistente.
export interface PasoFlujo {
  eyebrow: string;
  title: string;
  description: string;
  options?: OpcionFlujo[];
  result?: boolean;
}

// Texto legible que se muestra para cada modalidad interna.
export const modalidades: Record<ModalidadRobo, string> = {
  "sin-acuda": "Robo sin acuda",
  "acuda-aviso": "Robo con acuda y con aviso",
  "acuda-sin-aviso": "Robo con acuda y sin aviso",
};

// Cada modalidad abre su propio mapa, igual que en el manual original.
export const mapasRobo: Record<ModalidadRobo, string> = {
  "sin-acuda": mapaRoboSinAcuda,
  "acuda-aviso": mapaRoboAcudaAviso,
  "acuda-sin-aviso": mapaRoboAcudaSinAviso,
};

// Información necesaria para construir un botón del catálogo de señales.
export interface ElementoSenal {
  name: string;
  icon: string;
  color: string;
  available?: boolean;
}

// Las señales se agrupan para evitar un menú único demasiado extenso.
export interface GrupoSenales {
  title: string;
  description: string;
  items: ElementoSenal[];
}

/**
 * Catálogo principal de señales.
 * color conserva el código visual del manual y available indica si ya existe
 * un flujograma completo. Las demás señales permiten consultar comentarios.
 */
export const gruposSenales: GrupoSenales[] = [
  {
    title: "Señales de emergencia",
    description: "Actuaciones prioritarias que pueden requerir servicios de emergencia.",
    items: [
      { name: "Robo", icon: "⚠", color: "#963b34", available: true },
      { name: "Atraco", icon: "!", color: "#f04444" },
      { name: "Coacción", icon: "!", color: "#f04444" },
      { name: "Fuego", icon: "●", color: "#d79b28" },
      { name: "Médica", icon: "+", color: "#1478b8" },
    ],
  },
  {
    title: "Señales de intrusión",
    description: "Eventos asociados a accesos, manipulación o sabotaje del sistema.",
    items: [
      { name: "Sabotaje", icon: "◇", color: "#963b34" },
      { name: "Sabotaje Cataluña", icon: "◇", color: "#963b34" },
      { name: "Sabotaje de central", icon: "◇", color: "#963b34" },
      { name: "Robo general 902", icon: "⚠", color: "#963b34" },
      { name: "Disparo Actifog", icon: "◌", color: "#963b34" },
    ],
  },
  {
    title: "Señales técnicas",
    description: "Fallos de comunicación, alimentación, sensores y supervisión.",
    items: [
      { name: "Fallo de una vía", icon: "⌁", color: "#53863d" },
      { name: "Fallo de doble vía", icon: "⌁", color: "#53863d" },
      { name: "Fallo de línea Smart", icon: "⌁", color: "#53863d" },
      { name: "Supervisión de actividad", icon: "◷", color: "#53863d" },
      { name: "Problema en zona", icon: "△", color: "#53863d" },
      { name: "Fallo de luz", icon: "ϟ", color: "#53863d" },
      { name: "Fallo de luz urgente", icon: "ϟ", color: "#53863d" },
      { name: "Batería baja central", icon: "▯", color: "#53863d" },
      { name: "Interferencia", icon: "≋", color: "#53863d" },
      { name: "Fallo sirena / módulo", icon: "◖", color: "#53863d" },
      { name: "Pérdida sensor / batería RF", icon: "⌖", color: "#53863d" },
      { name: "Código erróneo", icon: "#", color: "#53863d" },
      { name: "Fallo de armado", icon: "×", color: "#53863d" },
      { name: "Falta de test", icon: "✓", color: "#53863d" },
      { name: "Antimasking", icon: "◉", color: "#53863d" },
      { name: "Fallo AC repetidor", icon: "ϟ", color: "#53863d" },
      { name: "Falta de restauración", icon: "↻", color: "#53863d" },
    ],
  },
];

// Comentarios disponibles antes de seleccionar una señal concreta.
export const comentariosGenerales = [
  "Llamada a instalación sin respuesta. Continuamos operativa según procedimiento.",
  "Contactamos con instalación. Cliente informado de la señal recibida.",
  "Palabra clave correcta. Cliente informado y gestión finalizada.",
  "No facilita palabra clave válida. Continuamos operativa como alarma confirmada.",
  "Ronda de contactos realizada sin localizar a ningún contacto.",
  "Contacto localizado e informado de la incidencia.",
  "SMS informativo enviado al cliente.",
  "Alarma confirmada por verificación secuencial.",
  "Alarma confirmada mediante verificación por vídeo.",
  "Aviso trasladado a FCSE según procedimiento.",
  "Servicio de acuda solicitado según procedimiento.",
  "Se deja recordatorio para realizar una nueva ronda de contactos.",
  "Evento restaurado. Gestión finalizada.",
];

// Comentarios especializados para señales con textos propios.
export const comentariosPorSenal: Record<string, string[]> = {
  Robo: [
    "Señal de robo recibida. Iniciamos verificación según procedimiento.",
    "Llamada a instalación sin respuesta. Continuamos operativa de robo.",
    "Palabra clave correcta. Cliente informado y alarma no confirmada.",
    "No facilita palabra clave válida. Alarma confirmada.",
    "Alarma confirmada por verificación secuencial.",
    "Alarma confirmada mediante verificación por vídeo.",
    "Ronda de contactos realizada sin localizar a ningún contacto.",
    "Aviso trasladado a FCSE según procedimiento de robo.",
    "Servicio de acuda solicitado según procedimiento.",
    "SMS informativo enviado y recordatorio programado para nueva ronda.",
  ],
  Atraco: [
    "Señal de atraco recibida. Aviso trasladado a FCSE.",
    "Llamada a instalación realizada sin dejar mensaje de voz.",
    "Instalación no contesta. Se continúa con acuda y contactos según procedimiento.",
    "Contestan y confirman incidencia real. Continuamos operativa de atraco.",
    "Clave correcta y confirman falsa alarma. Se solicita anulación del aviso.",
    "Pulsador de atraco pendiente de restauración. Cliente informado.",
  ],
  Coacción: [
    "Señal de coacción recibida. Iniciamos llamada según procedimiento.",
    "Cliente confirma situación real. Aviso a FCSE y acuda si procede.",
    "Clave errónea o no facilitan clave. Continuamos operativa de coacción.",
    "Coacción recibida junto a apertura. Continuamos según procedimiento.",
    "Cliente confirma falsa alarma con clave correcta. Gestión finalizada.",
  ],
  Fuego: [
    "Señal de fuego recibida. Iniciamos verificación y ronda de contactos.",
    "Cliente confirma fuego real. Aviso al 112 y acuda si procede.",
    "No se localiza a la instalación. Se inicia ronda de contactos.",
    "Imágenes revisadas sin indicios aparentes de humo o fuego.",
    "Señal de fuego acompañada de otra señal. Incidencia considerada real.",
    "Se recibe cancelación durante la gestión. Se anulan avisos según procedimiento.",
  ],
  Médica: [
    "Señal médica recibida. Llamada a instalación sin solicitar palabra clave.",
    "Cliente solicita asistencia médica. Aviso trasladado al 112.",
    "Se recoge descripción de dolencia, edad, antecedentes y medicación.",
    "No se localiza a la instalación. Se inicia llamada a contactos.",
    "Contacto localizado. Gestionamos según sus indicaciones.",
    "Servicios de emergencia solicitados y rellamada pendiente de confirmación.",
  ],
  Sabotaje: [
    "Señal de sabotaje recibida. Iniciamos verificación según procedimiento.",
    "Llamada a instalación sin respuesta. Continuamos con contactos.",
    "Cliente informado de la señal de sabotaje.",
    "Señal de sabotaje asociada a robo. Se trata como alarma confirmada.",
  ],
};

// Mensajes reutilizados por los distintos fallos y eventos técnicos.
export const comentariosTecnicos = [
  "Señal técnica recibida. Revisamos histórico y estado actual del sistema.",
  "El evento ha restaurado y no es reiterativo. Gestión finalizada.",
  "El fallo no restaura o es reiterativo. Se genera actuación técnica.",
  "Cliente informado por llamada de la incidencia técnica.",
  "Cliente informado mediante SMS de la incidencia técnica.",
  "Llamada a instalación y contactos sin localización.",
  "Se deja recordatorio para comprobar la restauración del evento.",
  "Se revisan las órdenes especiales y el tipo de cliente.",
];

/**
 * Decide qué grupo de comentarios se presenta al operador.
 * Si no existe una colección exacta, las señales de robo y sabotaje comparten
 * su familia; el resto utiliza los mensajes técnicos como alternativa.
 */
export const obtenerComentariosSenal = (senal: string | null) => {
  if (!senal) return comentariosGenerales;
  if (comentariosPorSenal[senal]) return comentariosPorSenal[senal];
  if (senal.includes("Robo")) return comentariosPorSenal.Robo;
  if (senal.includes("Sabotaje")) return comentariosPorSenal.Sabotaje;
  return comentariosTecnicos;
};

/**
 * Grafo del procedimiento de robo.
 * La clave de cada propiedad es el ID del paso. Las opciones indican el ID
 * siguiente, formando distintas ramas sin necesidad de duplicar pantallas.
 */
export const flujo: Record<string, PasoFlujo> = {
  mode: {
    eyebrow: "Paso 1 · Clasificación",
    title: "¿Qué tipo de señal de robo estás gestionando?",
    description: "Selecciona la modalidad indicada en la ficha de la instalación.",
    options: [
      { label: "Sin acuda", mode: "sin-acuda", next: "installation" },
      { label: "Acuda con aviso", mode: "acuda-aviso", next: "installation" },
      { label: "Acuda sin aviso", mode: "acuda-sin-aviso", next: "installation" },
    ],
  },
  installation: {
    eyebrow: "Paso 2 · Verificación telefónica",
    title: "Llama a la instalación. ¿Contestan?",
    description: "Realiza la llamada al teléfono de la instalación antes de continuar.",
    options: [
      { label: "Sí, contestan", next: "password" },
      { label: "No contestan", next: "no-answer" },
    ],
  },
  password: {
    eyebrow: "Paso 3 · Identificación",
    title: "¿Dan la palabra clave correcta?",
    description: "Comprueba la palabra clave siguiendo la política de seguridad.",
    options: [
      { label: "Sí, dan clave", next: "valid-password" },
      { label: "No dan clave", next: "invalid-password" },
    ],
  },
  "valid-password": {
    eyebrow: "Resultado · Alarma no confirmada",
    title: "Informa y gestiona según corresponda",
    description: "La persona ha contestado y ha facilitado la palabra clave correcta. Registra la actuación realizada.",
    result: true,
  },
  "invalid-password": {
    eyebrow: "Resultado · Alarma confirmada",
    title: "La alarma queda confirmada",
    description: "No se ha facilitado una palabra clave válida. Aplica el orden de actuación mostrado para esta modalidad.",
    result: true,
  },
  "no-answer": {
    eyebrow: "Paso 3 · Comprobación",
    title: "¿Existe verificación de la alarma?",
    description: "Indica si no está confirmada o si se ha verificado de forma secuencial o por vídeo.",
    options: [
      { label: "No confirmada", next: "not-confirmed" },
      { label: "Secuencial", next: "schedule" },
      { label: "Vídeo", next: "video" },
    ],
  },
  "not-confirmed": {
    eyebrow: "Paso 4 · Contactos",
    title: "Llama a los contactos. ¿Contesta alguno?",
    description: "Esta pregunta no se aplica al robo con acuda sin aviso, donde se envía directamente el acuda.",
    options: [
      { label: "Sí, contestan", next: "contacts-answer" },
      { label: "No contestan", next: "contacts-no-answer" },
    ],
  },
  "acuda-direct": {
    eyebrow: "Resultado · Alarma no confirmada",
    title: "Envía el acuda",
    description: "En robo con acuda sin aviso, si no contestan y la alarma no está confirmada, se envía el servicio de acuda.",
    result: true,
  },
  "contacts-answer": {
    eyebrow: "Resultado · Alarma no confirmada",
    title: "Informa previa palabra clave",
    description: "Informa al contacto una vez validada correctamente su palabra clave y registra la gestión.",
    result: true,
  },
  "contacts-no-answer": {
    eyebrow: "Resultado · Sin contacto",
    title: "Envía un SMS informativo",
    description: "No ha sido posible localizar a la instalación ni a los contactos. Registra el envío.",
    result: true,
  },
  schedule: {
    eyebrow: "Paso 4 · Verificación secuencial",
    title: "¿La señal se produce de día o de noche?",
    description: "El orden de las actuaciones cambia según el horario.",
    options: [
      { label: "Día", next: "sequential-day" },
      { label: "Noche", next: "sequential-night" },
    ],
  },
  "sequential-day": {
    eyebrow: "Resultado · Secuencial de día",
    title: "Ejecuta la actuación en orden",
    description: "La alarma ha quedado confirmada por verificación secuencial.",
    result: true,
  },
  "sequential-night": {
    eyebrow: "Resultado · Secuencial de noche",
    title: "Ejecuta la actuación en orden",
    description: "La alarma ha quedado confirmada por verificación secuencial.",
    result: true,
  },
  video: {
    eyebrow: "Paso 4 · Verificación por vídeo",
    title: "¿La persona observada es sospechosa?",
    description: "Valora las imágenes recibidas y selecciona la situación observada.",
    options: [
      { label: "Persona sospechosa", next: "video-suspicious" },
      { label: "Persona no sospechosa", next: "video-not-suspicious" },
    ],
  },
  "video-suspicious": {
    eyebrow: "Resultado · Vídeo confirmado",
    title: "Ejecuta la actuación en orden",
    description: "Las imágenes muestran una persona sospechosa.",
    result: true,
  },
  "video-not-suspicious": {
    eyebrow: "Resultado · Comprobación por vídeo",
    title: "Ejecuta la actuación en orden",
    description: "Las imágenes muestran una persona no sospechosa.",
    result: true,
  },
};

/**
 * Calcula el orden de actuación final según la rama y la modalidad de robo.
 * La presencia de acuda modifica las acciones mostradas al operador.
 */
export const obtenerAcciones = (identificadorPaso: string, modalidad: ModalidadRobo | null): string[] => {
  if (!modalidad) return [];

  const tieneAcuda = modalidad !== "sin-acuda";

  if (identificadorPaso === "invalid-password") {
    return tieneAcuda ? ["Contactos", "FCSE y acuda"] : ["Contactos", "FCSE"];
  }

  if (identificadorPaso === "sequential-day") {
    return tieneAcuda ? ["Contactos", "FCSE y acuda"] : ["Contactos", "FCSE"];
  }

  if (identificadorPaso === "sequential-night") {
    return tieneAcuda ? ["FCSE y acuda", "Contactos"] : ["FCSE", "Contactos"];
  }

  if (identificadorPaso === "video-suspicious") {
    return tieneAcuda ? ["FCSE y acuda", "Contactos"] : ["FCSE", "Contactos"];
  }

  if (identificadorPaso === "video-not-suspicious") {
    return tieneAcuda ? ["Contactos", "FCSE y acuda"] : ["Contactos", "FCSE"];
  }

  return [];
};
