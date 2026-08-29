import { ContextoPagina, responderJson } from "../_utilidades";

const limpiar = (valor: unknown, maximo: number) =>
  typeof valor === "string" ? valor.trim().slice(0, maximo) : "";

const datosValidos = (nombre: string, telefono: string) =>
  Boolean(nombre && telefono && /^[0-9+() .-]{3,30}$/.test(telefono));

/** Escritura reservada al administrador por functions/_middleware.ts. */
export const onRequest = async (contexto: ContextoPagina) => {
  const metodo = contexto.request.method.toUpperCase();
  const baseDatos = contexto.env.CONTENIDO_DB;

  if (metodo === "POST") {
    let datos: { nombre?: unknown; telefono?: unknown; descripcion?: unknown };
    try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
    const nombre = limpiar(datos.nombre, 100);
    const telefono = limpiar(datos.telefono, 30);
    const descripcion = limpiar(datos.descripcion, 240);
    if (!datosValidos(nombre, telefono)) return responderJson({ error: "Revisa el nombre y el teléfono." }, 400);
    await baseDatos.prepare(
      `INSERT INTO telefonos_interes (nombre, telefono, descripcion, orden, actualizado_en)
       VALUES (?, ?, ?, COALESCE((SELECT MAX(orden) + 1 FROM telefonos_interes), 0), unixepoch())`
    ).bind(nombre, telefono, descripcion).run();
    return responderJson({ guardado: true }, 201);
  }

  if (metodo === "PATCH") {
    let datos: { id?: unknown; nombre?: unknown; telefono?: unknown; descripcion?: unknown };
    try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
    const id = Number(datos.id);
    const nombre = limpiar(datos.nombre, 100);
    const telefono = limpiar(datos.telefono, 30);
    const descripcion = limpiar(datos.descripcion, 240);
    if (!Number.isInteger(id) || id <= 0 || !datosValidos(nombre, telefono)) return responderJson({ error: "Datos no válidos." }, 400);
    await baseDatos.prepare(
      "UPDATE telefonos_interes SET nombre = ?, telefono = ?, descripcion = ?, actualizado_en = unixepoch() WHERE id = ?"
    ).bind(nombre, telefono, descripcion, id).run();
    return responderJson({ guardado: true });
  }

  if (metodo === "DELETE") {
    let datos: { id?: unknown };
    try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
    const id = Number(datos.id);
    if (!Number.isInteger(id) || id <= 0) return responderJson({ error: "Identificador no válido." }, 400);
    await baseDatos.prepare("DELETE FROM telefonos_interes WHERE id = ?").bind(id).run();
    return responderJson({ eliminado: true });
  }

  return responderJson({ error: "Método no permitido." }, 405);
};
