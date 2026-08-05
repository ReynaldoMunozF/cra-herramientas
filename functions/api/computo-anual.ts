import { ContextoPagina, responderJson } from "./_utilidades";

interface TurnoRecibido {
  dia?: unknown;
  codigo?: unknown;
}

const CODIGOS_VALIDOS = new Set(["M", "T", "N", "1", "2", "B", "P", "V"]);

const normalizarMatricula = (valor: unknown) => {
  const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null;
};

const normalizarAnio = (valor: unknown) => {
  const anio = Number(valor);
  return Number.isInteger(anio) && anio >= 2025 && anio <= 2035 ? anio : null;
};

const normalizarMes = (valor: unknown) => {
  const mes = Number(valor);
  return Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : null;
};

const fechaValida = (anio: number, mes: number, dia: number) => {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio
    && fecha.getUTCMonth() === mes - 1
    && fecha.getUTCDate() === dia;
};

const crearFecha = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

/** Guarda y consulta el cómputo anual, compartido entre dispositivos mediante D1. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  const baseDatos = contexto.env.CONTENIDO_DB;

  if (metodo === "GET") {
    const url = new URL(contexto.request.url);
    const matricula = normalizarMatricula(url.searchParams.get("matricula"));
    const anio = normalizarAnio(url.searchParams.get("anio"));
    if (!matricula || !anio) {
      return responderJson({ error: "La matrícula o el año no son válidos." }, 400);
    }

    const resultado = await baseDatos
      .prepare(
        `SELECT fecha, codigo, actualizado_en
         FROM computo_anual_turnos
         WHERE matricula = ? AND fecha LIKE ?
         ORDER BY fecha ASC`
      )
      .bind(matricula, `${anio}-%`)
      .all<{ fecha: string; codigo: string; actualizado_en: string }>();

    return responderJson({ turnos: resultado.results ?? [] });
  }

  if (metodo === "PUT") {
    let datos: Record<string, unknown>;
    try {
      datos = await contexto.request.json();
    } catch {
      return responderJson({ error: "Los datos enviados no son válidos." }, 400);
    }

    const matricula = normalizarMatricula(datos.matricula);
    const anio = normalizarAnio(datos.anio);
    const mes = normalizarMes(datos.mes);
    const turnosRecibidos = Array.isArray(datos.turnos) ? datos.turnos as TurnoRecibido[] : null;

    if (!matricula || !anio || !mes || !turnosRecibidos || turnosRecibidos.length > 31) {
      return responderJson({ error: "Revisa la matrícula, el mes y los turnos." }, 400);
    }

    const turnos = turnosRecibidos.map((turno) => ({
      dia: Number(turno.dia),
      codigo: typeof turno.codigo === "string" ? turno.codigo.trim().toUpperCase() : "",
    }));
    const diasUnicos = new Set(turnos.map((turno) => turno.dia));
    const turnosValidos = turnos.every((turno) =>
      Number.isInteger(turno.dia)
      && fechaValida(anio, mes, turno.dia)
      && CODIGOS_VALIDOS.has(turno.codigo)
    );
    if (!turnosValidos || diasUnicos.size !== turnos.length) {
      return responderJson({ error: "Hay días o códigos de turno no válidos." }, 400);
    }

    const prefijoMes = `${anio}-${String(mes).padStart(2, "0")}-%`;
    const sentencias = [
      baseDatos
        .prepare("DELETE FROM computo_anual_turnos WHERE matricula = ? AND fecha LIKE ?")
        .bind(matricula, prefijoMes),
      ...turnos.map((turno) =>
        baseDatos
          .prepare(
            `INSERT INTO computo_anual_turnos (matricula, fecha, codigo, actualizado_en)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
          )
          .bind(matricula, crearFecha(anio, mes, turno.dia), turno.codigo)
      ),
    ];
    await baseDatos.batch(sentencias);

    return responderJson({ guardado: true, cantidad: turnos.length });
  }

  return responderJson({ error: "Método no permitido." }, 405);
};
