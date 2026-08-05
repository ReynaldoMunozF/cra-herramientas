import { comentariosPorSenal, comentariosTecnicos, flujo, PasoFlujo } from "./configuracionOperativas";
import { ContenidoProcesoEditable } from "./modeloContenido";

export interface ProcesoConfigurable {
  slug: string;
  nombre: string;
  color: string;
  contenido: ContenidoProcesoEditable;
}

const fin = (eyebrow: string, title: string, description: string): PasoFlujo => ({ eyebrow, title, description, result: true });
const comentarios = (nombre: string, adicionales: string[] = []) => [...(comentariosPorSenal[nombre] || comentariosTecnicos), ...adicionales];

/** Procedimientos transcritos y estructurados a partir del Manual Operador CRA de septiembre de 2024. */
export const procesosConfigurables: ProcesoConfigurable[] = [
  { slug: "robo", nombre: "Robo", color: "#963b34", contenido: { flujo, comentarios: comentarios("Robo") } },
  {
    slug: "atraco", nombre: "Atraco", color: "#f04444", contenido: { comentarios: comentarios("Atraco"), flujo: {
      mode: { eyebrow: "Inicio · Aviso prioritario", title: "Avisa a FCSE y llama a la instalación", description: "No dejes mensaje de voz ni envíes SMS. Si procede de pulsador, recuerda que debe restaurarse.", options: [{ label: "No contestan", next: "sin-respuesta" }, { label: "Contestan sin clave", next: "sin-clave" }, { label: "Confirman situación real", next: "real" }, { label: "Clave correcta · falsa alarma", next: "falsa" }] },
      "sin-respuesta": fin("Resultado · Sin respuesta", "Acuda si está contratado y contactos", "Realiza contactos y deja recordatorio de 5 minutos para una nueva ronda."),
      "sin-clave": fin("Resultado · Sin identificación", "Acuda si está contratado y contactos", "Al no facilitar clave, continúa la operativa y deja recordatorio de 5 minutos."),
      real: fin("Resultado · Atraco real", "Continúa con acuda y contactos", "Mantén el aviso a FCSE y envía el acuda si está contratado."),
      falsa: fin("Resultado · Falsa alarma", "Anula el aviso a FCSE", "Con clave correcta y confirmación de falsa alarma, solicita la anulación del aviso."),
    } },
  },
  {
    slug: "coaccion", nombre: "Coacción", color: "#f04444", contenido: { comentarios: comentarios("Coacción"), flujo: {
      mode: { eyebrow: "Paso 1 · Verificación", title: "Llama a la instalación", description: "Comprueba si contestan y la situación asociada a la señal.", options: [{ label: "Contestan", next: "identificacion" }, { label: "No contestan", next: "no-contestan" }, { label: "Coacción con apertura", next: "alarma" }, { label: "Coacción con cierre", next: "cierre" }] },
      identificacion: { eyebrow: "Paso 2 · Identificación", title: "¿Qué confirma la persona?", description: "Valida la clave y el motivo de la señal.", options: [{ label: "Clave correcta · falsa alarma", next: "falsa" }, { label: "Confirman situación real", next: "alarma" }, { label: "Clave errónea o sin clave", next: "alarma" }] },
      "no-contestan": fin("Resultado · Sin respuesta", "Avisa a FCSE y acuda; después contactos", "Tras los contactos, si no localizas a nadie, deja recordatorio de 5 minutos."),
      alarma: fin("Resultado · Alarma confirmada", "FCSE y acuda si procede", "Después realiza la ronda de contactos y actúa según sus indicaciones previa palabra clave."),
      cierre: fin("Resultado · No confirmada", "Informa únicamente a contactos", "La coacción acompañada de cierre se trata como no confirmada según el diagrama del manual."),
      falsa: fin("Resultado · Falsa alarma", "Finaliza la gestión", "Clave correcta y confirmación de falsa alarma."),
    } },
  },
  {
    slug: "fuego", nombre: "Fuego", color: "#d79b28", contenido: { comentarios: comentarios("Fuego"), flujo: {
      mode: { eyebrow: "Paso 1 · Verificación", title: "Llama a la instalación", description: "Si durante la gestión llega cancelación, cancela la incidencia y anula bomberos/acuda si ya fueron avisados.", options: [{ label: "Confirman falsa alarma", next: "falsa" }, { label: "Confirman fuego real", next: "real" }, { label: "No contestan", next: "ronda" }] },
      falsa: fin("Resultado · Falsa alarma", "Finaliza la gestión", "Registra la confirmación de falsa alarma."),
      real: fin("Resultado · Fuego real", "Avisa al 112 y acuda", "Envía acuda si está contratado. Si llega acompañada de otra señal dentro de 30 minutos, considérala real."),
      ronda: { eyebrow: "Paso 2 · Contactos", title: "Realiza rondas de contactos", description: "Deja mensajes, solicita imágenes, comprueba cancelación, envía SMS y acuda si procede.", options: [{ label: "Localizan y descartan peligro", next: "descartado" }, { label: "Confirman o hay indicios", next: "real" }, { label: "Cuatro rondas sin localizar", next: "sin-localizar" }] },
      descartado: fin("Resultado · Sin peligro aparente", "Finaliza sin avisar a bomberos", "Si las imágenes no muestran peligro real, realiza rondas sin pasar aviso salvo petición de acuda."),
      "sin-localizar": fin("Resultado · Sin contactos", "Avisa a bomberos", "Tras la cuarta ronda, avisa a bomberos, envía SMS y deja recordatorio de 5 minutos."),
    } },
  },
  {
    slug: "medica", nombre: "Médica", color: "#1478b8", contenido: { comentarios: comentarios("Médica"), flujo: {
      mode: { eyebrow: "Paso 1 · Llamada", title: "Llama a la instalación", description: "No solicites palabra clave. Recoge dolencia, edad, antecedentes y medicación.", options: [{ label: "Solicitan asistencia médica", next: "asistencia" }, { label: "No contestan", next: "contactos" }] },
      asistencia: fin("Resultado · Asistencia solicitada", "Avisa al 112 y acuda", "Avisa a emergencias, envía acuda si está contratado, informa a contactos y rellama para confirmar la llegada."),
      contactos: { eyebrow: "Paso 2 · Contactos", title: "Llama a los contactos", description: "Pregunta si desean gestionar la asistencia o acudir a la instalación.", options: [{ label: "Contesta un contacto", next: "indicaciones" }, { label: "No contesta nadie", next: "emergencias" }] },
      indicaciones: fin("Resultado · Contacto localizado", "Gestiona según sus indicaciones", "Registra las indicaciones del contacto."),
      emergencias: fin("Resultado · Nadie localizado", "Avisa al 112 y acuda", "Deja recordatorio de 5 minutos si no se ha localizado a nadie."),
    } },
  },
  {
    slug: "sabotaje", nombre: "Sabotaje", color: "#963b34", contenido: { comentarios: comentarios("Sabotaje"), flujo: {
      mode: { eyebrow: "Paso 1 · Clasificación", title: "Clasifica la señal de sabotaje", description: "No aplica la rama genérica a Grado 3, GGCC, VIP/VIMO o Priority.", options: [{ label: "Sabotaje aislado", next: "aislado" }, { label: "Tres o más sabotajes", next: "multiples" }, { label: "Sabotaje de sirena cableada", next: "sirena" }] },
      aislado: { eyebrow: "Paso 2 · Contexto", title: "¿Cuándo y en qué estado llega?", description: "Comprueba horario, armado y restauración.", options: [{ label: "Día · apertura reciente", next: "restaura" }, { label: "Día · cierre", next: "informar" }, { label: "Noche", next: "informar" }] },
      restaura: { eyebrow: "Paso 3 · Restauración", title: "¿Restaura la señal?", description: "Comprueba la restauración del sabotaje.", options: [{ label: "Sí", next: "sms-restaura" }, { label: "No", next: "informar" }] },
      multiples: { eyebrow: "Paso 2 · Confirmación", title: "¿Sistema armado o turno nocturno?", description: "Tres sabotajes pueden confirmar la alarma según estado y horario.", options: [{ label: "Armado o noche", next: "confirmada" }, { label: "Desarmado reciente", next: "informar" }] },
      sirena: fin("Resultado · Sirena cableada", "Contactos y comprobación bidireccional", "Si la sirena suena transfiere a STR; si no suena accede bidireccionalmente o deriva a STR."),
      informar: fin("Resultado · Comunicación", "Instalación, contactos y SMS", "Informa según horario y estado. Si no localizas, envía el SMS correspondiente."),
      "sms-restaura": fin("Resultado · Restaurado", "Envía SMS de restauración", "Cierra la gestión con el mensaje de restauración indicado."),
      confirmada: fin("Resultado · Alarma confirmada", "FCSE, acuda y contactos", "Avisa a FCSE y acuda si está contratado; después contactos y recordatorio si no localizas."),
    } },
  },
  {
    slug: "sabotaje-cataluna", nombre: "Sabotaje Cataluña", color: "#963b34", contenido: { comentarios: comentarios("Sabotaje"), flujo: {
      mode: { eyebrow: "Paso 1 · Clasificación Cataluña", title: "¿El sabotaje es aislado?", description: "En Cataluña ciertas señales técnicas no computan para la verificación secuencial.", options: [{ label: "Sí, aislado", next: "contactos" }, { label: "No · misma zona", next: "misma-zona" }, { label: "No · zonas diferentes", next: "confirmada" }, { label: "Acompañado de robo", next: "confirmada" }, { label: "Acompañado de señal técnica", next: "confirmada" }] },
      contactos: { eyebrow: "Paso 2 · Comprobación", title: "Contactos y acceso bidireccional", description: "Llama a contactos y comprueba el sistema mediante acceso bidireccional.", options: [{ label: "Se accede bidireccionalmente", next: "no-confirmada" }, { label: "No se puede acceder", next: "confirmada" }] },
      "misma-zona": { eyebrow: "Paso 2 · Revisión", title: "Sabotajes de la misma zona", description: "Realiza contactos y comprobación bidireccional.", options: [{ label: "Comprobación correcta", next: "no-confirmada" }, { label: "No se comprueba", next: "confirmada" }] },
      "no-confirmada": fin("Resultado · No confirmada", "No avises a FSE", "Registra las comprobaciones realizadas."),
      confirmada: fin("Resultado · Confirmada", "Contactos y FSE", "Informa a contactos y ofrece o realiza aviso a FSE según procedimiento."),
    } },
  },
  {
    slug: "sabotaje-central", nombre: "Sabotaje de central", color: "#963b34", contenido: { comentarios: comentarios("Sabotaje"), flujo: {
      mode: { eyebrow: "Paso 1 · Comprobación", title: "Llama a instalación y contactos", description: "Según el panel puede llegar por zona 0, 62 u 8. Llama a contactos si no contestan en instalación.", options: [{ label: "Confirman desmontaje o cambio", next: "cambio" }, { label: "Confirman obras", next: "obras" }, { label: "No contestan", next: "sms" }] },
      cambio: fin("Resultado · Cambio confirmado", "Job 4.2 de baja y pruebas 1 h", "Registra el desmontaje o cambio de compañía confirmado."),
      obras: fin("Resultado · Obras", "Advierte del riesgo y ofrece pruebas", "Informa sobre manipulación, posible facturación y puesta en pruebas."),
      sms: fin("Resultado · Sin respuesta", "Envía SMS OSABC", "Registra el envío del SMS de sabotaje de central."),
    } },
  },
  {
    slug: "robo-general-902", nombre: "Robo general 902", color: "#963b34", contenido: { comentarios: comentarios("Robo"), flujo: {
      mode: { eyebrow: "Paso 1 · Redundancia GSM", title: "¿Existe una señal principal en los dos minutos anteriores?", description: "La zona 902 es redundancia del robo enviado por GSM de alta seguridad.", options: [{ label: "Sí, existe señal principal", next: "redundante" }, { label: "No existe o llega después", next: "nuevo-evento" }, { label: "Fallo de línea + robo en 30 min", next: "confirmada" }] },
      redundante: fin("Resultado · Señal redundante", "Opera la señal principal", "No cuentes la zona 902 como detector adicional para verificación secuencial."),
      "nuevo-evento": fin("Resultado · Nuevo evento", "Aplica operativa genérica de robo", "Al llegar fuera de los dos minutos se considera un evento nuevo."),
      confirmada: fin("Resultado · Alarma verificada", "Avisa a FSE", "Fallo de línea no restaurado seguido de robo dentro de 30 minutos confirma la alarma."),
    } },
  },
  {
    slug: "disparo-actifog", nombre: "Disparo Actifog", color: "#963b34", contenido: { comentarios: comentarios("Robo", ["Disparo de niebla seca recibido. Informamos siempre a Bomberos."]), flujo: {
      mode: { eyebrow: "Paso 1 · Disparo Actifog", title: "¿Qué señales acompañan al disparo?", description: "Utiliza el término “disparo de niebla seca”. Informa siempre a Bomberos.", options: [{ label: "Acompañado de robo", next: "acompanado" }, { label: "Solo Actifog", next: "solo" }, { label: "Sabotaje, líquido bajo o SAI", next: "tecnico" }] },
      acompanado: fin("Resultado · Operativa asociada", "Sigue las señales de robo", "Opera las señales acompañantes y avisa a FCSE cuando corresponda; informa también a Bomberos."),
      solo: fin("Resultado · Actifog aislado", "Contactos, acuda, Bomberos y Job STR", "Informa a contactos, envía acuda, comunica a Bomberos y genera Job para STR."),
      tecnico: fin("Resultado · Incidencia técnica", "Job directo a STR", "Sabotaje Actifog, nivel bajo de líquido o fallo de SAI se derivan directamente a STR."),
    } },
  },
];

const tecnicos: ProcesoConfigurable[] = [
  { slug: "fallo-una-via", nombre: "Fallo de una vía", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Restauración", title: "¿Restaura la comunicación?", description: "Comprueba si el fallo de una vía ha restaurado.", options: [{ label: "Sí", next: "restaurado" }, { label: "No", next: "tipo-cliente" }] },
    restaurado: fin("Resultado · Restaurado", "Cierra como evento tratado", "Finaliza la gestión al confirmar la restauración."),
    "tipo-cliente": { eyebrow: "Paso 2 · Cliente", title: "¿Es Priority, GGCC, VIP, VIMO o Grado 3?", description: "El tipo de cliente determina el canal de comunicación.", options: [{ label: "Sí · llamada", next: "llamada" }, { label: "No · SMS", next: "sms" }] },
    llamada: fin("Resultado · Comunicación por llamada", "Instalación y contactos", "Si es repetitivo, cita al cliente y ofrece orden de servicio."),
    sms: fin("Resultado · Comunicación por SMS", "Envía SMS 0FLINE", "Si es repetitivo, abre WO."),
  } } },
  { slug: "fallo-doble-via", nombre: "Fallo de doble vía", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Restauración", title: "¿Restaura la doble vía?", description: "Comprueba la restauración antes de continuar.", options: [{ label: "Sí", next: "restaurado" }, { label: "No", next: "contexto" }] },
    restaurado: fin("Resultado · Restaurado", "Cierra como evento tratado", "Finaliza la gestión."),
    contexto: { eyebrow: "Paso 2 · Horario y estado", title: "¿Es horario diurno y sistema desarmado?", description: "Día: 07:00-23:00. Noche: 23:00-07:00.", options: [{ label: "Sí · día/desarmado", next: "dia" }, { label: "No · noche o armado", next: "noche" }] },
    dia: fin("Resultado · Día/desarmado", "Instalación, contactos, SMS y recordatorio", "Si no localizas, envía SMS RFLSEG y deja recordatorio de 2 horas."),
    noche: fin("Resultado · Noche/armado", "Instalación, contactos, FCSE y acuda", "Si no localizas, avisa a FCSE y acuda y envía SMS 0FLSEG."),
  } } },
  { slug: "fallo-linea-smart", nombre: "Fallo de línea Smart", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Línea Smart", title: "Comprueba restauración y órdenes especiales", description: "Revisa el histórico, el estado de comunicaciones y las órdenes especiales del cliente.", options: [{ label: "Restaura y no es reiterativo", next: "restaurado" }, { label: "No restaura o se repite", next: "tecnico" }] },
    restaurado: fin("Resultado · Restaurado", "Finaliza la gestión", "Registra la restauración del fallo de línea."),
    tecnico: fin("Resultado · Persistente", "Informa y genera actuación técnica", "Comunica según el tipo de cliente y genera WO/Job técnico conforme a las órdenes especiales."),
  } } },
  { slug: "supervision-actividad", nombre: "Supervisión de actividad", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Órdenes especiales", title: "Revisa horario y canal contratado", description: "Puede comunicarse por SMS, email o llamada según el servicio.", options: [{ label: "Comunicación por SMS/email", next: "mensaje" }, { label: "Comunicación por llamada", next: "llamada" }] },
    mensaje: fin("Resultado · Comunicación automática", "Envía la comunicación indicada", "Registra la comunicación conforme a la orden especial."),
    llamada: { eyebrow: "Paso 2 · Identificación", title: "¿Contesta instalación con clave correcta?", description: "Solicita clave en instalación.", options: [{ label: "Sí", next: "final" }, { label: "No", next: "contactos" }] },
    final: fin("Resultado · Localizado", "Finaliza la gestión", "Resolución 3FO."),
    contactos: fin("Resultado · Contactos", "Llama a contactos y deja hasta 2 recordatorios", "Si no localizas, deja un máximo de dos recordatorios de 30 minutos."),
  } } },
  { slug: "problema-zona", nombre: "Problema en zona", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Tipo de detector", title: "¿Existen detectores de incendio o central de fuego?", description: "Revisa la configuración del cliente.", options: [{ label: "Sí", next: "incendio" }, { label: "No", next: "averia" }] },
    incendio: fin("Resultado · Detectores de incendio", "Informa para que los reseteen", "Resolución 3LL con llamada o 3 si restaura."),
    averia: fin("Resultado · Sin detector de incendio", "Abre Job de avería", "Genera un parte de avería desde MasterMind."),
  } } },
  { slug: "fallo-luz", nombre: "Fallo de luz", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Tipo de cliente", title: "¿Cliente especial o con orden especial?", description: "Priority, GGCC, VIP, VIMO o cliente con OE requieren revisión específica.", options: [{ label: "Sí", next: "especial" }, { label: "No · estándar", next: "estandar" }] },
    especial: fin("Resultado · Cliente especial", "Revisa OE e informa por llamada", "Sin OE, informa por llamada entre 08:30 y 22:30."),
    estandar: fin("Resultado · Cliente estándar", "SMS automatizado", "No entra a gestión. En Proview WDC/V3DC genera WO para sustituir batería."),
  } } },
  { slug: "fallo-luz-urgente", nombre: "Fallo de luz urgente", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Llamada 24 h", title: "¿Contesta el cliente?", description: "Realiza llamada informativa a cualquier hora.", options: [{ label: "Sí", next: "informado" }, { label: "No", next: "recordatorios" }] },
    informado: fin("Resultado · Informado", "Finaliza la gestión", "Informa de la señal y registra la llamada."),
    recordatorios: fin("Resultado · No localizado", "Hasta 3 recordatorios cada 2 h", "Envía SMS en cada recordatorio."),
  } } },
  { slug: "bateria-baja-central", nombre: "Batería baja central", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Alimentación", title: "¿Hay fallo de luz asociado?", description: "Comprueba histórico y el plazo aplicable: 3 días Domonial, 30 días Proview.", options: [{ label: "Sí · fallo de luz", next: "fallo-luz" }, { label: "No · luz correcta", next: "reiteracion" }, { label: "Fallo de comunicaciones", next: "bidi" }] },
    "fallo-luz": fin("Resultado · Fallo de luz", "SMS o llamada según cliente", "Cliente estándar: SMS 0BBAT. Especiales: llamada."),
    reiteracion: { eyebrow: "Paso 2 · Reiteración", title: "¿Es señal reiterada?", description: "Considera cinco señales de batería baja al mes.", options: [{ label: "No · aislada", next: "esperar" }, { label: "Sí", next: "wo" }] },
    bidi: fin("Resultado · Comprobación", "Transfiere bidireccional a STR", "Comprueba si existe alimentación eléctrica."),
    esperar: fin("Resultado · Aislada", "Espera nuevas señales", "Registra la señal aislada."),
    wo: fin("Resultado · Reiterada", "Abre WO en SF", "Genera actuación técnica."),
  } } },
  { slug: "interferencia", nombre: "Interferencia", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Canal", title: "Revisa cliente y orden especial", description: "Determina si la comunicación corresponde por llamada o SMS.", options: [{ label: "Por llamada", next: "llamada" }, { label: "Por SMS", next: "sms" }] },
    llamada: fin("Resultado · Llamada", "Informa y cita si procede", "Si no contestan, envía SMS. En señal reiterativa abre WO."),
    sms: fin("Resultado · SMS", "Envía SMS 0INTRE", "Si la señal es reiterativa, abre WO en SF."),
  } } },
  { slug: "fallo-sirena-modulo", nombre: "Fallo sirena / módulo", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Restauración", title: "¿Restaura y no es reiterativo?", description: "En Cataluña es alarma técnica; fuera, junto a robo se considera sabotaje.", options: [{ label: "Sí", next: "final" }, { label: "No", next: "wo" }, { label: "Llega junto a robo fuera de Cataluña", next: "sabotaje" }] },
    final: fin("Resultado · Restaurado", "Finaliza", "Registra la restauración."),
    wo: fin("Resultado · Persistente", "Abre WO en SF", "Genera actuación técnica por fallo reiterado o sin restauración."),
    sabotaje: fin("Resultado · Sabotaje", "Aplica operativa de sabotaje", "Trata la combinación como sabotaje según el manual."),
  } } },
  { slug: "perdida-sensor-bateria-rf", nombre: "Pérdida sensor / batería RF", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Restauración", title: "¿Restaura y no es reiterativo?", description: "En Cataluña es alarma técnica; fuera, junto a robo se considera sabotaje.", options: [{ label: "Sí", next: "final" }, { label: "No", next: "wo" }, { label: "Junto a robo fuera de Cataluña", next: "sabotaje" }] },
    final: fin("Resultado · Restaurado", "Finaliza", "Registra la restauración."), wo: fin("Resultado · Persistente", "Abre WO en SF", "Genera actuación técnica."), sabotaje: fin("Resultado · Sabotaje", "Aplica operativa de sabotaje", "Trata la combinación según sabotaje."),
  } } },
  { slug: "codigo-erroneo", nombre: "Código erróneo", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Histórico", title: "¿Cuál es el estado del sistema?", description: "Revisa el histórico para determinar si está armado o desarmado.", options: [{ label: "Desarmado", next: "sms" }, { label: "Armado", next: "final" }, { label: "No se determina", next: "sms" }] },
    sms: fin("Resultado · Información", "Envía SMS 0INCO", "Resolución 3SE."), final: fin("Resultado · Sistema armado", "Finaliza la gestión", "Resolución 3."),
  } } },
  { slug: "fallo-armado", nombre: "Fallo de armado", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Instalación", title: "Llama sin pedir clave", description: "Informa del fallo de armado.", options: [{ label: "Cliente localizado", next: "solicitud" }, { label: "No contesta", next: "contactos" }] },
    solicitud: { eyebrow: "Paso 2 · Solicitud", title: "¿Solicita armado remoto?", description: "Para armar remotamente sí debes solicitar palabra clave.", options: [{ label: "Sí", next: "armar" }, { label: "No", next: "final" }] },
    contactos: fin("Resultado · No localizado", "Contactos, SMS y recordatorios", "SMS + recordatorio de 15 min; si sigue sin localizar, último recordatorio de 30 min."),
    armar: fin("Resultado · Armado remoto", "Conecta desde CRA o transfiere a STR", "Valida palabra clave antes de proceder."), final: fin("Resultado · Informado", "Finaliza", "Registra la información facilitada."),
  } } },
  { slug: "falta-test", nombre: "Falta de test", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Tipo de sistema", title: "Selecciona el tratamiento de falta de test", description: "Aplica FT024 para línea ultra segura o Climax según el panel.", options: [{ label: "FT024", next: "ft024" }, { label: "Climax", next: "climax" }] },
    ft024: { eyebrow: "Paso 2 · Contacto", title: "¿Se localiza al cliente?", description: "Comprueba ubicación y motivo del fallo.", options: [{ label: "En instalación", next: "str" }, { label: "Fuera de instalación", next: "revisar" }, { label: "No localizado", next: "wo" }] },
    climax: { eyebrow: "Paso 2 · Corte de luz", title: "¿Hay corte de luz asociado?", description: "Crea evento TRFTAN y revisa histórico.", options: [{ label: "Sí · horario día", next: "luz" }, { label: "Sí · horario noche", next: "dia" }, { label: "No", next: "bidi" }] },
    str: fin("Resultado · Cliente presente", "Transfiere a STR", "STR realizará pruebas del sistema."), revisar: fin("Resultado · Cliente ausente", "Recomienda revisión y ofrece acuda", "Registra la recomendación."), wo: fin("Resultado · No localizado", "WO, test +4 días y acuda", "Reprograma el test y envía acuda si está contratado."),
    luz: fin("Resultado · Corte de luz", "Informa o cita", "Con luz correcta cita; sin luz informa que debe restaurar corriente."), dia: fin("Resultado · Horario nocturno", "Reprograma para informar de día", "Deja el test pendiente para horario diurno."), bidi: fin("Resultado · Sin corte", "Solicita test bidireccional", "Si no llegan señales abre WO; si llegan, finaliza."),
  } } },
  { slug: "antimasking", nombre: "Antimasking", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Instalación", title: "Llama solicitando palabra clave", description: "Se comunica de 08:30 a 00:00. Puede llegar 24 h con sistema armado o desarmado.", options: [{ label: "Clave correcta", next: "informado" }, { label: "No contesta o no da clave", next: "contactos" }, { label: "Elemento no volumétrico", next: "reprogramacion" }] },
    informado: fin("Resultado · Informado", "Finaliza", "Registra la información facilitada."), contactos: fin("Resultado · No localizado", "Contactos, SMS y hasta 3 REC", "REC de 30 minutos; tras agotarlos, abre Job de no contactos."), reprogramacion: fin("Resultado · Elemento no volumétrico", "Job de reprogramaciones a STR", "Deriva la incidencia a STR."),
  } } },
  { slug: "fallo-ac-repetidor", nombre: "Fallo AC repetidor", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Horario", title: "¿La señal llega de noche?", description: "El fallo puede afectar las zonas cubiertas por el repetidor.", options: [{ label: "Sí · noche", next: "reprogramar" }, { label: "No · día", next: "informar" }] },
    reprogramar: fin("Resultado · Horario nocturno", "Reprograma con resolución 6666", "Informa en horario diurno."), informar: fin("Resultado · Horario diurno", "Informa y genera actuación técnica", "Aplica las órdenes especiales del cliente y registra la incidencia."),
  } } },
  { slug: "falta-restauracion", nombre: "Falta de restauración", color: "#53863d", contenido: { comentarios: comentariosTecnicos, flujo: {
    mode: { eyebrow: "Paso 1 · Histórico", title: "Localiza la causa en las últimas 24 horas", description: "Aplica a sabotajes, pulsadores fijos de atraco, iónicos y sistemas de incendio.", options: [{ label: "Salto durante visita técnica", next: "quitar" }, { label: "Fuego o pulsador de atraco", next: "informar" }, { label: "Sabotaje", next: "sabotaje" }, { label: "Otro elemento", next: "job" }] },
    quitar: fin("Resultado · Técnico presente", "Pulsa “quitar todo”", "Registra la intervención técnica."), informar: fin("Resultado · Fuego/atraco", "Informa y deja REC de 30 min", "Si tras el recordatorio no contactas, envía SMS."), sabotaje: fin("Resultado · Sabotaje sin restaurar", "SMS 0SABO o cita", "No abras Job."), job: fin("Resultado · Otro elemento", "Abre Job de reprogramaciones", "Deriva a STR."),
  } } },
];

procesosConfigurables.push(...tecnicos);

export const procesosPorSlug = Object.fromEntries(procesosConfigurables.map((proceso) => [proceso.slug, proceso])) as Record<string, ProcesoConfigurable>;
export const slugPorNombreSenal = Object.fromEntries(procesosConfigurables.map((proceso) => [proceso.nombre, proceso.slug])) as Record<string, string>;
