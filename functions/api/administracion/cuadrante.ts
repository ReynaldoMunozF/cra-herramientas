import { ContextoPagina, responderJson } from "../_utilidades";

const validarDatos = (datos: Record<string, unknown>) => {
  const idCuadrante = typeof datos.idCuadrante === "string" ? datos.idCuadrante.trim().toLowerCase() : "";
  const matricula = typeof datos.matricula === "string" ? datos.matricula.trim().toUpperCase() : "";
  const dia = Number(datos.dia);
  const turno = typeof datos.turno === "string" ? datos.turno.trim().toUpperCase() : "";

  if (!/^[a-z]+-\d{4}$/.test(idCuadrante)
    || !/^[A-Z0-9]{1,8}$/.test(matricula)
    || !Number.isInteger(dia) || dia < 1 || dia > 31
    || !/^[A-Z0-9]{0,10}$/.test(turno)) {
    return null;
  }
  return { idCuadrante, matricula, dia, turno };
};

/** Guarda o reemplaza una corrección manual. El middleware reserva esta ruta al administrador. */
export const onRequestPost = async (contexto: ContextoPagina) => {
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await contexto.request.json();
  } catch {
    return responderJson({ error: "Los datos enviados no son válidos." }, 400);
  }
  const datos = validarDatos(cuerpo);
  if (!datos) return responderJson({ error: "Revisa el mes, la matrícula, el día y el turno." }, 400);

  await contexto.env.CONTENIDO_DB
    .prepare(
      `INSERT INTO cambios_cuadrante (id_cuadrante, matricula, dia, turno, actualizado_en)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id_cuadrante, matricula, dia)
       DO UPDATE SET turno = excluded.turno, actualizado_en = CURRENT_TIMESTAMP`
    )
    .bind(datos.idCuadrante, datos.matricula, datos.dia, datos.turno)
    .run();

  return responderJson({ guardado: true, cambio: datos });
};

/** Elimina la corrección y recupera para ese día el valor del cuadrante original. */
export const onRequestDelete = async (contexto: ContextoPagina) => {
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await contexto.request.json();
  } catch {
    return responderJson({ error: "Los datos enviados no son válidos." }, 400);
  }
  const datos = validarDatos({ ...cuerpo, turno: "" });
  if (!datos) return responderJson({ error: "No se ha podido identificar el día." }, 400);

  await contexto.env.CONTENIDO_DB
    .prepare("DELETE FROM cambios_cuadrante WHERE id_cuadrante = ? AND matricula = ? AND dia = ?")
    .bind(datos.idCuadrante, datos.matricula, datos.dia)
    .run();

  return responderJson({ restaurado: true });
};
