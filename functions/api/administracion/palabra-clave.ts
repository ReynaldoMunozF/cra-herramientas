import { ContextoPagina, responderJson } from "../_utilidades";

interface PartidaPalabra {
  palabra: string;
  intentos: number;
  estado: "activa" | "ganada" | "agotada";
  pausa_iniciada_en: number | null;
}

const PALABRAS_POR_TEMATICA: Record<string, string[]> = {
  cra: ["AVISO", "CABLE", "CLAVE", "FUEGO", "LLAVE", "PANEL", "RADIO", "TURNO"],
  animales: ["PERRO", "TIGRE", "CEBRA", "KOALA", "PANDA", "MOSCA", "GALLO", "OVEJA"],
  naturaleza: ["PLAYA", "MONTE", "NUBES", "SELVA", "FLORA", "CAMPO", "LAGOS", "RAYOS"],
  alimentos: ["ARROZ", "PASTA", "QUESO", "FRUTA", "DULCE", "SALSA", "LIMON", "MELON"],
  objetos: ["RELOJ", "TECLA", "VASOS", "LIBRO", "SILLA", "MESAS", "BOLSA", "CAJON"],
};
const TEMATICAS = Object.keys(PALABRAS_POR_TEMATICA);

// Defensa adicional: el juego nunca utilizará una entrada que no tenga exactamente cinco letras.
Object.keys(PALABRAS_POR_TEMATICA).forEach((tematica) => {
  PALABRAS_POR_TEMATICA[tematica] = PALABRAS_POR_TEMATICA[tematica]
    .filter((palabra) => /^[A-Z]{5}$/.test(palabra));
});

const normalizarMatricula = (valor: unknown) => {
  const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null;
};

const normalizarPalabra = (valor: unknown) => {
  if (typeof valor !== "string") return null;
  const palabra = valor.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /^[A-Z]{5}$/.test(palabra) ? palabra : null;
};

const elegirElemento = <T,>(elementos: T[]) => {
  const numero = new Uint32Array(1);
  crypto.getRandomValues(numero);
  return elementos[numero[0] % elementos.length];
};

const leerTematicas = async (baseDatos: D1Database) => {
  const configuracion = await baseDatos.prepare(
    `SELECT tematicas, actualizada_en FROM configuracion_palabra_clave WHERE id = 1`
  ).first<{ tematicas: string; actualizada_en: number }>();
  try {
    const tematicas = JSON.parse(configuracion?.tematicas ?? "[]") as string[];
    const validas = tematicas.filter((tematica) => TEMATICAS.includes(tematica));
    return { tematicas: validas.length ? validas : ["cra"], actualizadaEn: configuracion?.actualizada_en ?? 0 };
  } catch { return { tematicas: ["cra"], actualizadaEn: 0 }; }
};

const calcularPistas = (secreta: string, propuesta: string) => {
  const estados: Array<"exacta" | "presente" | "ausente"> = Array(5).fill("ausente");
  const restantes = new Map<string, number>();
  for (let indice = 0; indice < 5; indice += 1) {
    if (propuesta[indice] === secreta[indice]) estados[indice] = "exacta";
    else restantes.set(secreta[indice], (restantes.get(secreta[indice]) ?? 0) + 1);
  }
  for (let indice = 0; indice < 5; indice += 1) {
    if (estados[indice] === "exacta") continue;
    const disponibles = restantes.get(propuesta[indice]) ?? 0;
    if (disponibles > 0) {
      estados[indice] = "presente";
      restantes.set(propuesta[indice], disponibles - 1);
    }
  }
  return estados;
};

/** Juego privado: la palabra permanece en el servidor hasta que termina la partida. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  const baseDatos = contexto.env.CONTENIDO_DB;

  if (metodo === "GET") {
    const configuracion = await leerTematicas(baseDatos);
    const resultado = await baseDatos.prepare(
      `WITH mejores AS (
         SELECT matricula, duracion_segundos, intentos, finalizada_en,
                ROW_NUMBER() OVER (
                  PARTITION BY matricula
                  ORDER BY duracion_segundos ASC, intentos ASC, finalizada_en ASC
                ) AS posicion_personal
         FROM partidas_palabra_clave
         WHERE estado = 'ganada' AND matricula IS NOT NULL
       )
       SELECT matricula, duracion_segundos, intentos, finalizada_en
       FROM mejores WHERE posicion_personal = 1
       ORDER BY duracion_segundos ASC, intentos ASC, finalizada_en ASC LIMIT 10`
    ).all();
    return responderJson({ ranking: resultado.results ?? [], ...configuracion, tematicasDisponibles: TEMATICAS });
  }

  if (metodo !== "POST") return responderJson({ error: "Método no permitido." }, 405);
  let datos: Record<string, unknown>;
  try { datos = await contexto.request.json(); }
  catch { return responderJson({ error: "Los datos enviados no son válidos." }, 400); }

  if (datos.accion === "configurar") {
    const recibidas = Array.isArray(datos.tematicas) ? datos.tematicas : [];
    const tematicas = recibidas.filter((tematica): tematica is string =>
      typeof tematica === "string" && TEMATICAS.includes(tematica)
    );
    if (!tematicas.length) return responderJson({ error: "Activa al menos una temática." }, 400);
    await baseDatos.prepare(
      `INSERT INTO configuracion_palabra_clave (id, tematicas, actualizada_en)
       VALUES (1, ?, unixepoch())
       ON CONFLICT(id) DO UPDATE SET tematicas = excluded.tematicas, actualizada_en = excluded.actualizada_en`
    ).bind(JSON.stringify([...new Set(tematicas)])).run();
    return responderJson({ guardado: true, tematicas: [...new Set(tematicas)] });
  }

  if (datos.accion === "iniciar") {
    const id = crypto.randomUUID();
    const configuracion = await leerTematicas(baseDatos);
    const solicitada = typeof datos.tematica === "string" ? datos.tematica : "";
    const tematica = configuracion.tematicas.includes(solicitada)
      ? solicitada
      : configuracion.tematicas[0];
    const palabra = elegirElemento(PALABRAS_POR_TEMATICA[tematica]);
    await baseDatos.prepare(
      `INSERT INTO partidas_palabra_clave
       (id, palabra, tematica, intentos, estado, iniciada_en) VALUES (?, ?, ?, 0, 'activa', unixepoch())`
    ).bind(id, palabra, tematica).run();
    return responderJson({ partidaId: id, tematica });
  }

  const partidaId = typeof datos.partidaId === "string" ? datos.partidaId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(partidaId)) return responderJson({ error: "La partida no es válida." }, 400);

  if (datos.accion === "pausar" || datos.accion === "reanudar") {
    const pausando = datos.accion === "pausar";
    const consulta = pausando
      ? `UPDATE partidas_palabra_clave SET pausa_iniciada_en = unixepoch()
         WHERE id = ? AND estado = 'activa' AND pausa_iniciada_en IS NULL`
      : `UPDATE partidas_palabra_clave
         SET pausa_acumulada = pausa_acumulada + MAX(0, unixepoch() - pausa_iniciada_en), pausa_iniciada_en = NULL
         WHERE id = ? AND estado = 'activa' AND pausa_iniciada_en IS NOT NULL`;
    const resultado = await baseDatos.prepare(consulta).bind(partidaId).run();
    return resultado.meta.changes
      ? responderJson({ pausada: pausando })
      : responderJson({ error: "No se pudo cambiar la pausa." }, 409);
  }

  const matricula = normalizarMatricula(datos.matricula);
  const propuesta = normalizarPalabra(datos.palabra);
  if (datos.accion !== "comprobar" || !matricula || !propuesta) {
    return responderJson({ error: "La partida, matrícula o palabra no son válidas." }, 400);
  }

  const partida = await baseDatos.prepare(
    `SELECT palabra, intentos, estado, pausa_iniciada_en FROM partidas_palabra_clave WHERE id = ?`
  ).bind(partidaId).first<PartidaPalabra>();
  if (!partida || partida.estado !== "activa" || partida.intentos >= 6 || partida.pausa_iniciada_en !== null) {
    return responderJson({ error: "La partida ya no está disponible." }, 409);
  }

  const estados = calcularPistas(partida.palabra, propuesta);
  const intentos = partida.intentos + 1;
  const victoria = propuesta === partida.palabra;
  const agotada = !victoria && intentos >= 6;
  if (victoria) {
    await baseDatos.prepare(
      `UPDATE partidas_palabra_clave
       SET matricula = ?, intentos = ?, estado = 'ganada', finalizada_en = unixepoch(),
           duracion_segundos = MAX(1, unixepoch() - iniciada_en - pausa_acumulada)
       WHERE id = ? AND estado = 'activa'`
    ).bind(matricula, intentos, partidaId).run();
  } else {
    await baseDatos.prepare(
      `UPDATE partidas_palabra_clave SET intentos = ?, estado = ?,
       finalizada_en = CASE WHEN ? = 'agotada' THEN unixepoch() ELSE NULL END
       WHERE id = ? AND estado = 'activa'`
    ).bind(intentos, agotada ? "agotada" : "activa", agotada ? "agotada" : "activa", partidaId).run();
  }

  const resultado = victoria
    ? await baseDatos.prepare(`SELECT duracion_segundos FROM partidas_palabra_clave WHERE id = ?`)
      .bind(partidaId).first<{ duracion_segundos: number }>()
    : null;
  return responderJson({
    estados, intentos, victoria, agotada,
    duracionSegundos: resultado?.duracion_segundos ?? null,
    palabra: victoria || agotada ? partida.palabra : null,
  });
};
