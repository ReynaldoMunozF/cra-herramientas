import { ContextoPagina, responderJson } from "../_utilidades";

const normalizarMatricula = (valor: unknown) => {
  const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null;
};

/** Inicia partidas y conserva el mejor resultado de cada matrícula. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  const baseDatos = contexto.env.CONTENIDO_DB;

  if (metodo === "GET") {
    const porCaso = await baseDatos.prepare(
      `WITH mejores AS (
         SELECT numero_caso, matricula, duracion_segundos, intentos, finalizada_en,
                ROW_NUMBER() OVER (
                  PARTITION BY numero_caso, matricula
                  ORDER BY duracion_segundos ASC, intentos ASC, finalizada_en ASC
                ) AS mejor_personal
         FROM partidas_caso_asesino
         WHERE estado = 'ganada' AND matricula IS NOT NULL AND numero_caso BETWEEN 1 AND 9
       ),
       podios AS (
         SELECT numero_caso, matricula, duracion_segundos, intentos,
                ROW_NUMBER() OVER (
                  PARTITION BY numero_caso
                  ORDER BY duracion_segundos ASC, intentos ASC, finalizada_en ASC
                ) AS puesto
         FROM mejores WHERE mejor_personal = 1
       )
       SELECT numero_caso, matricula, duracion_segundos, intentos, puesto
       FROM podios WHERE puesto <= 3 ORDER BY numero_caso ASC, puesto ASC`
    ).all();

    const general = await baseDatos.prepare(
      `WITH mejores AS (
         SELECT numero_caso, matricula, duracion_segundos, intentos,
                ROW_NUMBER() OVER (
                  PARTITION BY numero_caso, matricula
                  ORDER BY duracion_segundos ASC, intentos ASC, finalizada_en ASC
                ) AS mejor_personal
         FROM partidas_caso_asesino
         WHERE estado = 'ganada' AND matricula IS NOT NULL AND numero_caso BETWEEN 1 AND 9
       )
       SELECT matricula, SUM(duracion_segundos) AS duracion_segundos,
              SUM(intentos) AS intentos, COUNT(*) AS casos_completados
       FROM mejores WHERE mejor_personal = 1
       GROUP BY matricula HAVING COUNT(*) = 9
       ORDER BY duracion_segundos ASC, intentos ASC LIMIT 3`
    ).all();
    return responderJson({ rankingPorCaso: porCaso.results ?? [], rankingGeneral: general.results ?? [] });
  }

  if (metodo !== "POST") return responderJson({ error: "Método no permitido." }, 405);
  let datos: Record<string, unknown>;
  try { datos = await contexto.request.json(); }
  catch { return responderJson({ error: "Los datos enviados no son válidos." }, 400); }

  if (datos.accion === "iniciar") {
    const numeroCaso = Number(datos.numeroCaso);
    if (!Number.isInteger(numeroCaso) || numeroCaso < 1 || numeroCaso > 9) {
      return responderJson({ error: "El número de caso no es válido." }, 400);
    }
    const id = crypto.randomUUID();
    await baseDatos.prepare(
      `INSERT INTO partidas_caso_asesino (id, numero_caso, intentos, estado, iniciada_en)
       VALUES (?, ?, 0, 'activa', unixepoch())`
    ).bind(id, numeroCaso).run();
    return responderJson({ partidaId: id });
  }

  const partidaId = typeof datos.partidaId === "string" ? datos.partidaId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(partidaId)) {
    return responderJson({ error: "La partida no es válida." }, 400);
  }

  if (datos.accion === "pausar") {
    const resultado = await baseDatos.prepare(
      `UPDATE partidas_caso_asesino SET pausa_iniciada_en = unixepoch()
       WHERE id = ? AND estado = 'activa' AND pausa_iniciada_en IS NULL`
    ).bind(partidaId).run();
    return resultado.meta.changes
      ? responderJson({ pausada: true })
      : responderJson({ error: "La partida no se puede pausar." }, 409);
  }

  if (datos.accion === "reanudar") {
    const resultado = await baseDatos.prepare(
      `UPDATE partidas_caso_asesino
       SET pausa_acumulada = pausa_acumulada + MAX(0, unixepoch() - pausa_iniciada_en),
           pausa_iniciada_en = NULL
       WHERE id = ? AND estado = 'activa' AND pausa_iniciada_en IS NOT NULL`
    ).bind(partidaId).run();
    return resultado.meta.changes
      ? responderJson({ pausada: false })
      : responderJson({ error: "La partida no se puede reanudar." }, 409);
  }

  const matricula = normalizarMatricula(datos.matricula);
  const intentos = Number(datos.intentos);
  if (
    datos.accion !== "finalizar"
    || !matricula
    || !Number.isInteger(intentos)
    || intentos < 1
    || intentos > 100
  ) {
    return responderJson({ error: "El resultado no es válido." }, 400);
  }

  const actualizacion = await baseDatos.prepare(
    `UPDATE partidas_caso_asesino
     SET matricula = ?, intentos = ?, estado = 'ganada',
         finalizada_en = unixepoch(),
         duracion_segundos = MAX(1, unixepoch() - iniciada_en - pausa_acumulada)
     WHERE id = ? AND estado = 'activa' AND pausa_iniciada_en IS NULL`
  ).bind(matricula, intentos, partidaId).run();
  if (!actualizacion.meta.changes) return responderJson({ error: "La partida ya terminó." }, 409);

  const resultado = await baseDatos.prepare(
    `SELECT duracion_segundos FROM partidas_caso_asesino WHERE id = ?`
  ).bind(partidaId).first<{ duracion_segundos: number }>();
  return responderJson({ guardado: true, duracionSegundos: resultado?.duracion_segundos ?? 1 });
};
