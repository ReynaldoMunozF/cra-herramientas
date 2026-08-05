import { ContextoPagina, responderJson } from "./_utilidades";

interface PartidaD1 {
  id: string;
  secreto: string;
  intentos: number;
  estado: "activa" | "ganada" | "agotada";
  iniciada_en: number;
  pausa_iniciada_en: number | null;
}

const normalizarMatricula = (valor: unknown) => {
  const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null;
};

const combinacionValida = (valor: unknown): valor is number[] =>
  Array.isArray(valor)
  && valor.length === 4
  && valor.every((color) => Number.isInteger(color) && color >= 0 && color <= 5);

const calcularPistas = (secreto: number[], jugada: number[]) => {
  let exactas = 0;
  const secretoPendiente: number[] = [];
  const jugadaPendiente: number[] = [];

  jugada.forEach((color, indice) => {
    if (color === secreto[indice]) {
      exactas += 1;
    } else {
      secretoPendiente.push(secreto[indice]);
      jugadaPendiente.push(color);
    }
  });

  let colores = 0;
  jugadaPendiente.forEach((color) => {
    const posicion = secretoPendiente.indexOf(color);
    if (posicion >= 0) {
      colores += 1;
      secretoPendiente.splice(posicion, 1);
    }
  });
  return { exactas, colores };
};

const crearSecreto = () => {
  const numeros = new Uint8Array(4);
  crypto.getRandomValues(numeros);
  return Array.from(numeros, (numero) => numero % 6);
};

/** Mantiene el código y el cronómetro en el servidor y devuelve el ranking compartido. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  const baseDatos = contexto.env.CONTENIDO_DB;

  if (metodo === "GET") {
    const resultado = await baseDatos
      .prepare(
        `WITH mejores AS (
           SELECT matricula, duracion_segundos, intentos, finalizada_en,
                  ROW_NUMBER() OVER (
                    PARTITION BY matricula
                    ORDER BY duracion_segundos ASC, intentos ASC, finalizada_en ASC
                  ) AS posicion_personal
           FROM partidas_codigo_secreto
           WHERE estado = 'ganada' AND matricula IS NOT NULL
         )
         SELECT matricula, duracion_segundos, intentos, finalizada_en
         FROM mejores
         WHERE posicion_personal = 1
         ORDER BY duracion_segundos ASC, intentos ASC, finalizada_en ASC
         LIMIT 10`
      )
      .all<{
        matricula: string;
        duracion_segundos: number;
        intentos: number;
        finalizada_en: number;
      }>();
    return responderJson({ ranking: resultado.results ?? [] });
  }

  if (metodo !== "POST") {
    return responderJson({ error: "Método no permitido." }, 405);
  }

  let datos: Record<string, unknown>;
  try {
    datos = await contexto.request.json();
  } catch {
    return responderJson({ error: "Los datos enviados no son válidos." }, 400);
  }

  if (datos.accion === "iniciar") {
    const id = crypto.randomUUID();
    const secreto = crearSecreto();
    await baseDatos
      .prepare(
        `INSERT INTO partidas_codigo_secreto
           (id, secreto, intentos, estado, iniciada_en)
         VALUES (?, ?, 0, 'activa', unixepoch())`
      )
      .bind(id, JSON.stringify(secreto))
      .run();
    return responderJson({ partidaId: id });
  }

  const partidaId = typeof datos.partidaId === "string" ? datos.partidaId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(partidaId)) {
    return responderJson({ error: "La partida no es válida." }, 400);
  }

  if (datos.accion === "pausar") {
    const resultado = await baseDatos.prepare(
      `UPDATE partidas_codigo_secreto SET pausa_iniciada_en = unixepoch()
       WHERE id = ? AND estado = 'activa' AND pausa_iniciada_en IS NULL`
    ).bind(partidaId).run();
    return resultado.meta.changes
      ? responderJson({ pausada: true })
      : responderJson({ error: "La partida no se puede pausar." }, 409);
  }

  if (datos.accion === "reanudar") {
    const resultado = await baseDatos.prepare(
      `UPDATE partidas_codigo_secreto
       SET pausa_acumulada = pausa_acumulada + MAX(0, unixepoch() - pausa_iniciada_en),
           pausa_iniciada_en = NULL
       WHERE id = ? AND estado = 'activa' AND pausa_iniciada_en IS NOT NULL`
    ).bind(partidaId).run();
    return resultado.meta.changes
      ? responderJson({ pausada: false })
      : responderJson({ error: "La partida no se puede reanudar." }, 409);
  }

  if (datos.accion !== "comprobar") {
    return responderJson({ error: "Acción no permitida." }, 400);
  }

  const matricula = normalizarMatricula(datos.matricula);
  if (!matricula || !combinacionValida(datos.jugada)) {
    return responderJson({ error: "La partida, la matrícula o la combinación no son válidas." }, 400);
  }

  const partida = await baseDatos
    .prepare(
      `SELECT id, secreto, intentos, estado, iniciada_en, pausa_iniciada_en
       FROM partidas_codigo_secreto WHERE id = ?`
    )
    .bind(partidaId)
    .first<PartidaD1>();

  if (!partida || partida.estado !== "activa" || partida.intentos >= 8 || partida.pausa_iniciada_en !== null) {
    return responderJson({ error: "La partida ya no está disponible." }, 409);
  }

  let secreto: number[];
  try {
    secreto = JSON.parse(partida.secreto);
  } catch {
    return responderJson({ error: "No se pudo recuperar la partida." }, 500);
  }
  if (!combinacionValida(secreto)) {
    return responderJson({ error: "La partida contiene datos no válidos." }, 500);
  }

  const pistas = calcularPistas(secreto, datos.jugada);
  const intentos = partida.intentos + 1;
  const victoria = pistas.exactas === 4;
  const agotada = !victoria && intentos >= 8;

  if (victoria) {
    await baseDatos
      .prepare(
        `UPDATE partidas_codigo_secreto
         SET matricula = ?, intentos = ?, estado = 'ganada',
             finalizada_en = unixepoch(),
             duracion_segundos = MAX(1, unixepoch() - iniciada_en - pausa_acumulada)
         WHERE id = ? AND estado = 'activa'`
      )
      .bind(matricula, intentos, partidaId)
      .run();
  } else {
    await baseDatos
      .prepare(
        `UPDATE partidas_codigo_secreto
         SET intentos = ?, estado = ?,
             finalizada_en = CASE WHEN ? = 'agotada' THEN unixepoch() ELSE NULL END
         WHERE id = ? AND estado = 'activa'`
      )
      .bind(intentos, agotada ? "agotada" : "activa", agotada ? "agotada" : "activa", partidaId)
      .run();
  }

  const resultado = victoria
    ? await baseDatos
      .prepare(
        `SELECT duracion_segundos FROM partidas_codigo_secreto WHERE id = ?`
      )
      .bind(partidaId)
      .first<{ duracion_segundos: number }>()
    : null;

  return responderJson({
    pistas,
    intentos,
    victoria,
    agotada,
    duracionSegundos: resultado?.duracion_segundos ?? null,
    secreto: victoria || agotada ? secreto : null,
  });
};
