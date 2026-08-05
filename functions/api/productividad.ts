import { ContextoPagina, responderJson } from "./_utilidades";

export interface RegistroProductividad {
  id: number;
  matricula: string;
  fecha: string;
  total_alarmas: number;
  horas_trabajadas: number;
  citas: number;
  llamadas_entrantes: number;
  gestiones_administrativas: number;
  tramos_email: TramoEmail[];
  actualizado_en: string;
}

interface TramoEmail {
  inicio: string;
  fin: string;
}

interface RegistroProductividadD1 extends Omit<RegistroProductividad, "tramos_email"> {
  tramos_email: string;
}

const horaValida = (valor: unknown): valor is string =>
  typeof valor === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(valor);

const minutosHora = (hora: string) => {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
};

/** Admite gestiones que terminan después de medianoche. */
const duracionTramo = (tramo: TramoEmail) => {
  const inicio = minutosHora(tramo.inicio);
  const fin = minutosHora(tramo.fin);
  return fin > inicio ? fin - inicio : fin + 24 * 60 - inicio;
};

const normalizarTramosEmail = (valor: unknown): TramoEmail[] | null => {
  if (!Array.isArray(valor) || valor.length > 20) return null;
  const tramos = valor.map((elemento) => {
    if (!elemento || typeof elemento !== "object") return null;
    const datos = elemento as Record<string, unknown>;
    return horaValida(datos.inicio) && horaValida(datos.fin) && datos.inicio !== datos.fin
      ? { inicio: datos.inicio, fin: datos.fin }
      : null;
  });
  return tramos.every((tramo): tramo is TramoEmail => tramo !== null) ? tramos : null;
};

const convertirRegistro = (registro: RegistroProductividadD1): RegistroProductividad => {
  let tramosEmail: TramoEmail[] = [];
  try {
    tramosEmail = normalizarTramosEmail(JSON.parse(registro.tramos_email)) ?? [];
  } catch {
    tramosEmail = [];
  }
  return { ...registro, tramos_email: tramosEmail };
};

const normalizarMatricula = (valor: unknown) => {
  const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null;
};

const normalizarFecha = (valor: unknown) => {
  const fecha = typeof valor === "string" ? valor.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const instante = new Date(`${fecha}T00:00:00Z`);
  return Number.isNaN(instante.getTime()) || instante.toISOString().slice(0, 10) !== fecha
    ? null
    : fecha;
};

const enteroNoNegativo = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 && numero <= 100000 ? numero : null;
};

/** Consulta y guarda la producción diaria, compartida entre todos los equipos. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  const baseDatos = contexto.env.CONTENIDO_DB;
  const url = new URL(contexto.request.url);

  if (metodo === "GET") {
    const matricula = normalizarMatricula(url.searchParams.get("matricula"));
    const mes = url.searchParams.get("mes")?.trim() ?? "";
    if (!matricula || !/^\d{4}-\d{2}$/.test(mes)) {
      return responderJson({ error: "La matrícula o el mes no son válidos." }, 400);
    }

    const resultado = await baseDatos
      .prepare(
        `SELECT id, matricula, fecha, total_alarmas, horas_trabajadas, citas,
                llamadas_entrantes, gestiones_administrativas, tramos_email, actualizado_en
         FROM registros_productividad
         WHERE matricula = ? AND fecha LIKE ?
         ORDER BY fecha ASC`
      )
      .bind(matricula, `${mes}-%`)
      .all<RegistroProductividadD1>();

    return responderJson({
      registros: (resultado.results ?? []).map(convertirRegistro),
    });
  }

  if (metodo === "PUT") {
    let datos: Record<string, unknown>;
    try {
      datos = await contexto.request.json();
    } catch {
      return responderJson({ error: "Los datos enviados no son válidos." }, 400);
    }

    const matricula = normalizarMatricula(datos.matricula);
    const fecha = normalizarFecha(datos.fecha);
    const totalAlarmas = enteroNoNegativo(datos.totalAlarmas);
    const citas = enteroNoNegativo(datos.citas);
    const llamadasEntrantes = enteroNoNegativo(datos.llamadasEntrantes);
    const gestionesAdministrativas = enteroNoNegativo(datos.gestionesAdministrativas);
    const tramosEmail = normalizarTramosEmail(datos.tramosEmail);
    const horasTrabajadas = Number(datos.horasTrabajadas);

    if (
      !matricula || !fecha || totalAlarmas === null || citas === null
      || llamadasEntrantes === null || gestionesAdministrativas === null
      || tramosEmail === null
      || !Number.isFinite(horasTrabajadas) || horasTrabajadas < 0.5 || horasTrabajadas > 24
    ) {
      return responderJson({ error: "Revisa la fecha y las cantidades introducidas." }, 400);
    }

    if (citas + llamadasEntrantes + gestionesAdministrativas > totalAlarmas) {
      return responderJson(
        { error: "Las gestiones especiales no pueden superar el total de alarmas." },
        400
      );
    }

    const minutosEmail = tramosEmail.reduce(
      (total, tramo) => total + duracionTramo(tramo),
      0
    );
    if (minutosEmail >= horasTrabajadas * 60) {
      return responderJson(
        { error: "El tiempo de email debe ser menor que las horas trabajadas." },
        400
      );
    }

    await baseDatos
      .prepare(
        `INSERT INTO registros_productividad (
           matricula, fecha, total_alarmas, horas_trabajadas, citas,
           llamadas_entrantes, gestiones_administrativas, tramos_email, actualizado_en
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(matricula, fecha) DO UPDATE SET
           total_alarmas = excluded.total_alarmas,
           horas_trabajadas = excluded.horas_trabajadas,
           citas = excluded.citas,
           llamadas_entrantes = excluded.llamadas_entrantes,
           gestiones_administrativas = excluded.gestiones_administrativas,
           tramos_email = excluded.tramos_email,
           actualizado_en = CURRENT_TIMESTAMP`
      )
      .bind(
        matricula,
        fecha,
        totalAlarmas,
        horasTrabajadas,
        citas,
        llamadasEntrantes,
        gestionesAdministrativas,
        JSON.stringify(tramosEmail)
      )
      .run();

    const registro = await baseDatos
      .prepare(
        `SELECT id, matricula, fecha, total_alarmas, horas_trabajadas, citas,
                llamadas_entrantes, gestiones_administrativas, tramos_email, actualizado_en
         FROM registros_productividad
         WHERE matricula = ? AND fecha = ?`
      )
      .bind(matricula, fecha)
      .first<RegistroProductividadD1>();

    return responderJson({ registro: registro ? convertirRegistro(registro) : null });
  }

  return responderJson({ error: "Método no permitido." }, 405);
};
